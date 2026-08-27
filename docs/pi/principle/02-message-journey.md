---
title: 02 一条消息的旅程
description: 从按下回车到模型收到 HTTP body，中间的十几道关卡分别在拦什么
---

# 02 一条消息的旅程

以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准。文中所有 `file:line` 经 `pnpm check:refs` 校验，代码块里的中文注释为本文补充。

消息与上下文的基本概念在 [Learn 04](/learn/04-message-and-context) 讲过：一次请求带的是 system prompt + 全量 messages。本章要看的是 Pi 在这条链路上加了多少道闸，以及每道闸拦的是什么。

:::tip 一句话版本

用户输入 → TUI 先吃掉一批命令 → 产品层拦八次、展开一次 → 循环层转三次格式 → 模型层再改两次 → HTTP 请求体。中间任何一道拦下来，模型就什么都收不到。

:::

## 0. 本章回答哪些面试问题

- **#1 AI Coding 整体的实现思路是什么** —— 用户输入到 provider 请求体的完整链路，以及每一段谁负责
- **#2 怎么保证执行过程中的准确性和可靠性** —— 校验为什么放在这些位置、fail fast 的三个点在哪

编号见交接文档 §12。

## 一、问题：这行字为什么不能直接发出去

场景很具体。你在 pi 里敲下这一行，回车：

```text
/review src/api.ts 重点看鉴权
```

模型最终收到的东西可能是下面四种之一，取决于 `/review` 是什么：

- **什么都没收到**：`/review` 是某个扩展注册的命令，扩展自己处理完就结束了
- **收到一大段模板文本**：`~/.pi/agent/prompts/review.md` 存在，`$1` 被替换成 `src/api.ts`，剩下的参数拼在后面
- **收到一个 `<skill>` 包裹的长文档**：写的是 `/skill:review`，整份 SKILL.md 被读进来当消息发出去
- **原样收到 `/review src/api.ts 重点看鉴权`**：三者都不匹配，当普通文本处理

同一串字符，四种结局。而且这还只是"文本变成什么"这一层——它变成消息之后，还要经过压缩检查、认证解析、上下文转换、provider 载荷改写。

面试里被问"用户输入之后发生了什么"，答"拼进 messages 发出去"是不及格的。真实的链路上，**用户输入在被当成用户输入之前，先被五个不同的东西抢着处理过一遍**。

## 二、全景：四层链路，十四道闸

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │  TUI 层        interactive-mode.ts  onSubmit                          │
  │                                                                      │
  │   ① trim，空串直接丢弃                                                │
  │   ② 26 个内置斜杠命令 → 本地处理，不产生任何消息                       │
  │   ③ `!cmd` / `!!cmd`  → 直接跑 shell，结果记成 bashExecution 消息       │
  │   ④ 压缩进行中        → 排进 compactionQueuedMessages                 │
  │   ⑤ 正在流式          → session.prompt(text, {behavior:"steer"})      │
  │   ⑥ 都不是            → 交给 run() 的 while 循环                       │
  └───────────────────────────────┬──────────────────────────────────────┘
                                  │ session.prompt(text)
  ┌───────────────────────────────▼──────────────────────────────────────┐
  │  产品层        AgentSession.prompt()                                  │
  │                                                                      │
  │   ⑦ 扩展命令      /xxx 已注册 → 立即执行并 return（流式中也执行）        │
  │   ⑧ 压缩互斥      压缩中提交 → throw                                  │
  │   ⑨ 扩展 input    handled / transform / continue                     │
  │   ⑩ Skill + 模板  /skill:name → <skill> 块；/tpl → 模板内容            │
  │   ⑪ 流式分流      steer 插队 / followUp 排队 → return                 │
  │   ⑫ 模型与认证    没模型 / 没凭据 → throw（fail fast）                 │
  │   ⑬ 压缩检查      上一条 assistant 溢出或超阈值 → 先压缩               │
  │   ⑭ 组装消息      user message + nextTurn 消息                        │
  │                   before_agent_start → 追加 custom + 可换 systemPrompt │
  └───────────────────────────────┬──────────────────────────────────────┘
                                  │ agent.prompt(messages)
  ┌───────────────────────────────▼──────────────────────────────────────┐
  │  循环层        agent.ts → agent-loop.ts                               │
  │                                                                      │
  │   状态快照 createContextSnapshot() + 回调组装 createLoopConfig()        │
  │        ↓                                                             │
  │   streamAssistantResponse()                                          │
  │        transformContext  ← 扩展 context 事件，AgentMessage → AgentMessage│
  │        convertToLlm      ← 自定义消息类型 → user/assistant/toolResult   │
  │        llmContext        ← { systemPrompt, messages, tools }          │
  │        getApiKey         ← 每次请求重新解析（OAuth 会过期）             │
  └───────────────────────────────┬──────────────────────────────────────┘
                                  │ streamFn(model, llmContext, options)
  ┌───────────────────────────────▼──────────────────────────────────────┐
  │  模型层        model-runtime.ts → ai/api/*.ts                         │
  │                                                                      │
  │   prepareRequest   解析 auth、合并 headers                            │
  │                    → 扩展 before_provider_headers                    │
  │   buildParams      按 provider 协议拼请求体                            │
  │   onPayload        → 扩展 before_provider_request（最后一次机会）       │
  │        ↓                                                             │
  │   HTTP / SSE                                                         │
  └──────────────────────────────────────────────────────────────────────┘
```

十四道闸里，**真正在改"用户那句话"的只有 ⑨ 和 ⑩**，其余十二道都在决定"这句话要不要发、发之前还要做什么"。

## 三、TUI 层：先被界面自己吃掉一批

**文件**：`packages/coding-agent/src/modes/interactive/interactive-mode.ts:2962`

交互模式的输入回调是一条长长的 if 链，一路匹配下来：

```typescript title="packages/coding-agent/src/modes/interactive/interactive-mode.ts:2962" {5,8}
this.defaultEditor.onSubmit = async (text: string) => {
  text = text.trim();
  if (!text) return;                          // 空串直接丢

  if (text === "/settings") {                 // 26 条内置命令逐条精确匹配
    this.showSettingsSelector();              // 打开 UI，不产生任何消息
    this.editor.setText("");
    return;                                   // 到这里就结束，session 一无所知
  }
  // ... /model /tree /export /fork /compact /resume /quit ...
```

内置命令一共 **23 条**声明在 `BUILTIN_SLASH_COMMANDS`（`packages/coding-agent/src/core/slash-commands.ts:19`），另有 `/debug`、`/arminsayshi`、`/dementedelves` 三条只在 `onSubmit` 里处理、不出现在补全列表中，实际处理 26 条。

这个数组只提供**名字、描述、参数提示**三样东西，供补全 UI 使用。真正的行为写在 TUI 的 if 链里。声明和实现分家，好处是 `core` 不需要知道 `/model` 会打开一个选择器；代价是加一条内置命令要动两个文件，忘一个就出现"能补全但按了没反应"或者"能用但补不出来"。

命令之外还有三条岔路：

- `!ls -la` 直接执行 shell，结果作为 `bashExecution` 消息记进会话；`!!` 前缀的结果标记 `excludeFromContext`，只给人看不给模型看
- 压缩正在跑，普通输入进 `compactionQueuedMessages` 本地队列，等压缩结束再 flush
- 正在流式，直接走 `session.prompt(text, { streamingBehavior: "steer" })`

只有全都不匹配，文本才通过 `getUserInput()`（`packages/coding-agent/src/modes/interactive/interactive-mode.ts:3878`）交给主循环：

```typescript title="packages/coding-agent/src/modes/interactive/interactive-mode.ts:1176" {3,5}
// Main interactive loop
while (true) {
  const userInput = await this.getUserInput();   // 阻塞等一条真正的用户消息
  try {
    await this.session.prompt(userInput);        // 这里才进入产品层
  } catch (error: unknown) {
    this.showError(error instanceof Error ? error.message : "Unknown error occurred");
  }
}
```

这个 `while(true)` 是整个交互模式的主循环，但它不是 Agent Loop。它只负责"取一条输入、喂进去、把错误打到屏幕上"。真正的循环在两层之下（第 03 章）。

## 四、产品层：`prompt()` 里的八道闸

**文件**：`packages/coding-agent/src/core/agent-session.ts:1139`

`AgentSession.prompt()` 是全仓最值得读的一个方法，因为它把"用户意图"翻译成"循环层参数"的所有脏活都摆在了明面上。

### 4.1 扩展命令：唯一能在流式中插队执行的东西

```typescript title="packages/coding-agent/src/core/agent-session.ts:1147" {2,5}
if (expandPromptTemplates && text.startsWith("/")) {
  const handled = await this._tryExecuteExtensionCommand(text);   // 查扩展注册表
  if (handled) {
    preflightResult?.(true);                                       // 执行完直接返回
    return;                                                        // 不产生任何消息
  }
}
```

放在最前面是有意的：扩展命令自己管自己的 LLM 交互（通过 `pi.sendMessage()`），所以**即使 agent 正在流式输出，它也照样立即执行**。相比之下 steer/followUp 只能排队。

代价是命名冲突没有仲裁。把上一节的 TUI 内置命令算上，`/` 前缀一共有四类主人，匹配顺序写死为：**内置命令 → 扩展命令 → skill → prompt 模板**。一个扩展注册了 `/review`，你的 `prompts/review.md` 就永远不会被触发，而且没有任何警告。

### 4.2 压缩互斥：唯一一处直接 throw 的并发保护

```typescript title="packages/coding-agent/src/core/agent-session.ts:1156" {2-4}
if (this._compactionAbortController !== undefined) {
  throw new Error(
    "Cannot submit a prompt while compaction is in progress. Wait for compaction to finish and retry.",
  );
}
```

压缩会重写 `agent.state.messages`。如果这时候插进一条新消息，压缩产出的摘要就会盖掉它。产品层的做法是直接拒绝，让 TUI 自己去排队（上一节的 `compactionQueuedMessages`）——**冲突不在这里解决，只在这里检测**。

### 4.3 扩展 `input` 事件：改用户原话的地方

```typescript title="packages/coding-agent/src/core/agent-session.ts:1163" {4,9-10}
let currentText = text;
let currentImages = options?.images;
if (this._extensionRunner.hasHandlers("input")) {
  const inputResult = await this._extensionRunner.emitInput(
    currentText, currentImages,
    options?.source ?? "interactive",              // interactive / extension / cli
    this.isStreaming ? options?.streamingBehavior : undefined,
  );
  if (inputResult.action === "handled") { preflightResult?.(true); return; }   // 吃掉
  if (inputResult.action === "transform") { currentText = inputResult.text; }  // 改写
}
```

`emitInput`（`packages/coding-agent/src/core/extensions/runner.ts:1196`）把所有扩展的 `input` 处理器串成一条流水线：上一个的 `transform` 结果是下一个的输入，任何一个返回 `handled` 就立刻短路。

注意它在 skill/模板展开**之前**。这个顺序意味着扩展看到的是用户敲的原文 `/review src/api.ts`，而不是展开后的几千字。想做"输入审计"或"敏感词拦截"，这是唯一正确的位置——展开之后再拦，拦的是模板作者写的字，不是用户写的字。

### 4.4 Skill 与模板展开：两套语法，同一个出口

```typescript title="packages/coding-agent/src/core/agent-session.ts:1183" {3-4}
let expandedText = currentText;
if (expandPromptTemplates) {
  expandedText = this._expandSkillCommand(expandedText);                    // /skill:name
  expandedText = expandPromptTemplate(expandedText, [...this.promptTemplates]);  // /tplname
}
```

两者的产物形态完全不同：

`_expandSkillCommand`（`packages/coding-agent/src/core/agent-session.ts:1333`）读整份 SKILL.md，剥掉 frontmatter，包进一个带 `location` 和 `baseDir` 的标签：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1344" {3-4}
const content = readFileSync(skill.filePath, "utf-8");
const body = stripFrontmatter(content).trim();
const skillBlock = `<skill name="${skill.name}" location="${skill.filePath}">
References are relative to ${skill.baseDir}.\n\n${body}\n</skill>`;   // 告诉模型相对路径基准
return args ? `${skillBlock}\n\n${args}` : skillBlock;
```

那句 `References are relative to ...` 是渐进披露能跑通的关键：SKILL.md 里写 `scripts/run.py`，模型才知道该去哪个目录找（第 05 章展开）。

`expandPromptTemplate`（`packages/coding-agent/src/core/prompt-templates.ts:269`）走的是位置参数替换，`$1` `$2` `$@` 那一套，产物是模板文件的正文。

两条路都**静默失败**：skill 名不存在就原样返回，模板名不存在也原样返回。你敲错一个字母，得到的是模型收到一条 `/reveiw src/api.ts` 然后开始猜你想干什么。

### 4.5 流式分流：steer 与 followUp 的分岔口

```typescript title="packages/coding-agent/src/core/agent-session.ts:1190" {2-6,8,10}
if (this.isStreaming) {
  if (!options?.streamingBehavior) {
    throw new Error(
      "Agent is already processing. Specify streamingBehavior ('steer' or 'followUp') to queue the message.",
    );
  }
  if (options.streamingBehavior === "followUp") {
    await this._queueFollowUp(expandedText, currentImages);   // 等它完全停下来再说
  } else {
    await this._queueSteer(expandedText, currentImages);      // 本轮工具跑完就插进去
  }
  preflightResult?.(true);
  return;
}
```

关键在于**排队的是展开后的文本**。`/skill:review` 排进队列时已经变成了完整的 skill 块，等真正出队时不会再展开一次。这避免了"排队期间 SKILL.md 被改了"导致的时序问题，代价是队列里躺的可能是几千字，TUI 显示待发消息时要自己截断。

`isStreaming` 的定义值得留意（`packages/coding-agent/src/core/agent-session.ts:900`）：它返回的是 `_isAgentRunActive`，这个标志在 `_runAgentPrompt` 入口置真、在 `_emitAgentSettled` 里置假。也就是说它覆盖了自动重试和压缩后重跑的整个区间，而不只是"正在吐字"的那一段。

### 4.6 模型与认证：两次 fail fast

```typescript title="packages/coding-agent/src/core/agent-session.ts:1210" {1,5-7}
if (!this.model) throw new Error(formatNoModelSelectedMessage());

const hasConfiguredAuth =
  this._modelRuntime.hasConfiguredAuth(this.model.provider) ||
  (await this._modelRuntime.checkAuth(this.model.provider)) !== undefined;   // 可能打网络
if (!hasConfiguredAuth) {
  const isOAuth = this._modelRuntime.isUsingOAuth(this.model.provider);      // 区分两种失败
  // OAuth: 提示 /login 重新授权；API Key: 提示去哪配 key
}
```

两种"没凭据"给的是不同的提示：OAuth 过期要重新 `/login`，API Key 缺失要去配环境变量。同一个 `undefined`，两条排查路径。

这里也是链路上第一次可能**打网络**的地方（`checkAuth` 可能触发 token 刷新）。它发生在消息组装之前，所以失败时会话里不会留下半条消息。

### 4.7 压缩检查：为什么要看"上一条"

```typescript title="packages/coding-agent/src/core/agent-session.ts:1231" {3}
const lastAssistant = this._findLastAssistantMessage();
if (lastAssistant) {
  await this._checkCompaction(lastAssistant, false);   // false = 连被中止的消息也检查
}
```

判断上下文满没满，靠的是**上一条 assistant 消息带回来的 usage**，不是本地估算。这是链路上一个有点反直觉的设计：要发的是新消息，检查的却是旧回复。

原因在第 01 章说过——循环层拿到的 `messages` 就是要发出去的全部内容，它没有"发之前先问一下还剩多少额度"的能力。唯一可靠的 token 数来自 provider 上一次的回执。

第二个参数 `skipAbortedCheck = false` 是这条路径独有的。正常的 turn 结束后检查会跳过被用户 Esc 掉的消息，但"用户中止了一个已经溢出的回复，然后又发了新消息"这种情况必须处理，否则新消息一样会溢出。压缩的完整机制在第 06 章。

### 4.8 组装消息与 `before_agent_start`

```typescript title="packages/coding-agent/src/core/agent-session.ts:1237" {4,6,9}
messages = [];
const userContent: (TextContent | ImageContent)[] = [{ type: "text", text: expandedText }];
if (currentImages) userContent.push(...currentImages);
messages.push({ role: "user", content: userContent, timestamp: Date.now() });

for (const msg of this._pendingNextTurnMessages) messages.push(msg);   // deliverAs:"nextTurn"
this._pendingNextTurnMessages = [];

const result = await this._extensionRunner.emitBeforeAgentStart(
  expandedText, currentImages, this._baseSystemPrompt, this._baseSystemPromptOptions,
);
```

`emitBeforeAgentStart`（`packages/coding-agent/src/core/extensions/runner.ts:1081`）能干两件 `input` 干不了的事：

- 追加 `role: "custom"` 的上下文消息，跟着用户消息一起进本轮
- **整体替换 system prompt**，只对这一轮生效

```typescript title="packages/coding-agent/src/core/agent-session.ts:1278" {2-3,6-7}
if (result?.systemPrompt !== undefined) {
  this._systemPromptOverride = result.systemPrompt;      // 记下来，供后续 turn 复用
  this.agent.state.systemPrompt = result.systemPrompt;
} else {
  this._systemPromptOverride = undefined;                // 没返回就恢复基线
  this.agent.state.systemPrompt = this._baseSystemPrompt;
}
```

`else` 分支不是多余的。没有它，上一轮扩展改过的 system prompt 会一直粘着——注释里写得很直白："in case previous turn had modifications"。这类"每轮显式重置"的写法在 `AgentSession` 里出现了好几处，是长生命周期对象常见的坑。

八道闸走完，`_runAgentPrompt(messages)` 接手，产品层的活到此为止。

## 五、循环层：三次转换加一次凭据解析

**文件**：`packages/agent/src/agent-loop.ts:281`

`Agent.prompt()` 的核心只有两件事：拍一张状态快照，组一份回调配置。

```typescript title="packages/agent/src/agent.ts:437" {4}
private createContextSnapshot(): AgentContext {
  return {
    systemPrompt: this._state.systemPrompt,
    messages: this._state.messages.slice(),   // 浅拷贝，循环层改不到 Agent 的数组
    tools: this._state.tools.slice(),
  };
}
```

`slice()` 是这里唯一的隔离手段。循环层可以往快照的 `messages` 里 push 流式中间态，不会污染 `Agent` 自己的 transcript——真正的落库发生在收到 `message_end` 之后，由 `processEvents`（`packages/agent/src/agent.ts:544`）写进 `_state.messages`。

然后是每次 LLM 调用前的三次转换：

```typescript title="packages/agent/src/agent-loop.ts:289" {2-3,7,9,15-16}
let messages = context.messages;
if (config.transformContext) {
  messages = await config.transformContext(messages, signal);   // ① 扩展 context 事件
}

// Convert to LLM-compatible messages (AgentMessage[] → Message[])
const llmMessages = await config.convertToLlm(messages);        // ② 自定义类型 → 标准消息

const llmContext: Context = {                                   // ③ 拼成 provider 能收的形状
  systemPrompt: context.systemPrompt,
  messages: llmMessages,
  tools: context.tools,
};

const resolvedApiKey =
  (config.getApiKey ? await config.getApiKey(config.model.provider) : undefined) || config.apiKey;
```

三次转换的分工是清楚的：

**`transformContext`**（`packages/coding-agent/src/core/sdk.ts:362`）工作在 AgentMessage 这一层，扩展的 `context` 事件就挂在它上面。它能删消息、能插消息，但插进去的还得是 Pi 认识的消息类型。

**`convertToLlm`**（`packages/coding-agent/src/core/messages.ts:148`）负责把 Pi 特有的消息类型压平成 provider 认识的三种。`bashExecution` 变成 user 消息、`compactionSummary` 加上前后缀变成 user 消息、标记了 `excludeFromContext` 的直接返回 `undefined` 被过滤掉：

```typescript title="packages/coding-agent/src/core/messages.ts:151" {3,6-7}
switch (m.role) {
  case "bashExecution":
    if (m.excludeFromContext) return undefined;        // !! 前缀的命令，模型看不见
    return { role: "user", content: [{ type: "text", text: bashExecutionToText(m) }], ... };
  case "compactionSummary":
    return { role: "user", content: [{ type: "text",
      text: COMPACTION_SUMMARY_PREFIX + m.summary + COMPACTION_SUMMARY_SUFFIX }], ... };
      // 压缩摘要伪装成用户消息，因为 provider 不认识这个角色
```

这里能看出一个反复出现的手法：**Pi 自己的消息类型全部降级成 user 消息发出去**。压缩摘要、bash 执行记录、分支摘要、扩展的 custom 消息，在模型眼里都是"用户说了一段话"。协议只有三种角色可用，多出来的语义只能靠前后缀标记来表达。

**`getApiKey`** 每次请求重新解析，不缓存。注释写明了原因：Copilot 之类的 OAuth token 会在长工具执行期间过期。一次工具调用跑十分钟，回来再发请求时用的是新解析的 token。

### system prompt 是什么时候拼好的

上面的 `llmContext.systemPrompt` 不是每次请求现拼的。它在工具集变化时由 `_rebuildSystemPrompt`（`packages/coding-agent/src/core/agent-session.ts:1045`）重建一次，里面调的 `buildSystemPrompt`（`packages/coding-agent/src/core/system-prompt.ts:28`）把工具清单、项目上下文文件、skills 索引拼成一整段文本，缓存在 `_baseSystemPrompt` 上。扩展在 `before_agent_start` 里返回的覆盖值优先级更高。分层构建的细节在第 05 章。

## 六、模型层：最后两次改写机会

SDK 装配时注入的 `streamFn`（`packages/coding-agent/src/core/sdk.ts:314`）转手交给 `ModelRuntime` 的流式入口：

```typescript title="packages/coding-agent/src/core/model-runtime.ts:636" {3-4}
streamSimple(model: Model<Api>, context: Context, options?: ModelsSimpleStreamOptions) {
  return lazyStream(model, async () => {
    const prepared = await this.prepareRequest(model, options);   // 解析 auth、合 headers
    return prepared.provider.streamSimple(prepared.model, context, prepared.options);
  });
}
```

`prepareRequest`（`packages/coding-agent/src/core/model-runtime.ts:573`）里有本次链路的倒数第二个扩展挂点：`transformHeaders` 回调最终连到扩展的 `before_provider_headers`。

最后一个挂点在 `ai` 包里，每家 provider 的实现各有一处：

```typescript title="packages/ai/src/api/anthropic-messages.ts:565" {1-2,4}
let params = buildParams(model, context, isOAuth, options);   // 按 Anthropic 协议拼请求体
const nextParams = await options?.onPayload?.(params, model); // 扩展最后一次改写机会
if (nextParams !== undefined) {
  params = nextParams as MessageCreateParamsStreaming;        // 返回 undefined 就保持原样
}
```

`onPayload` 拿到的已经不是 Pi 的抽象消息，而是 **provider 专属的请求体**。同一个扩展要兼容 Anthropic 和 OpenAI，就得自己判断 payload 的形状。这是链路上抽象泄漏最严重的一处，但也是唯一能表达"给这家厂商加一个私有字段"的位置。

至此，字符串终于变成了 HTTP body。

## 七、这个顺序为什么是这个顺序

链路上有四组顺序是刻意的，换一下就出问题。

**扩展 `input` 在展开之前。** 扩展要审计的是用户敲的字，不是模板作者写的字。放到展开之后，一条 `/deploy-prod` 展开成三千字的部署指令，扩展再想拦已经失去了语义。

**认证校验在消息组装之前。** 认证失败会 `throw`，而 `throw` 之前一条消息都还没进 `messages` 数组。如果反过来，失败的会话里会留下一条孤立的用户消息，下次 resume 时最后一条是 user，`agent.continue()` 会直接把它当成待回复的提问重新发一遍。

**压缩检查在组装之前、发送之前。** 循环层看到的 `messages` 就是要发的全部内容（第 01 章），压缩没有别的地方可插。

**`before_agent_start` 在最后。** 它要看到最终文本才能决定加什么上下文，所以必须排在展开之后；它又要能改 system prompt，所以必须排在进循环之前。前后都被卡死，位置是唯一的。

## 八、边界：这条链路解决不了什么

**命名冲突没有仲裁。** 内置命令 / 扩展命令 / skill / 模板四类共用 `/` 前缀，先到先得，冲突时无提示。想知道 `/review` 到底会触发谁，只能自己按顺序推一遍。

**展开失败静默。** 名字打错、SKILL.md 读不出来，都退回原文继续发。模型收到一条像命令但不是命令的字符串，行为不可预测。读文件失败会通过扩展 runner 发一个 error 事件，但普通的"名字不存在"连事件都没有。

**`input` 事件不是安全边界。** 它只能改文本。模型能不能读 `.env`，跟用户在输入框里敲了什么没关系——那是工具层的事（第 04 章、第 09 章）。

**压缩判断依赖上一条回执。** 会话刚 resume、还没有任何 assistant 消息时，`_findLastAssistantMessage()` 返回 `undefined`，这一轮跳过压缩检查。极端情况下（导入一个巨大的历史会话后第一条消息）可能直接撞上溢出，靠的是发出去之后的溢出恢复兜底，而不是发之前拦住。

**`onPayload` 泄漏 provider 细节。** 想跨厂商用它，得自己写 if。`compat` 收敛了协议差异（第 08 章），但这个钩子的位置在收敛之后。

## 九、未验证与推断

- ✅ 十四道闸的顺序、每处的判断条件、三次转换的位置，均读源码得出并经 `check:refs` 校验
- ✅ 23 条内置命令声明 + 26 条实际处理，靠 `BUILTIN_SLASH_COMMANDS` 数组与 `onSubmit` 里的 `text === "/xxx"` 分支计数
- ⚠️ "扩展命令 → skill → 模板"的冲突优先级是从代码顺序推出的，未构造同名冲突实测
- ⚠️ 认证校验可能触发网络请求（`checkAuth`），未抓包确认哪些 provider 会真的发请求
- ❌ 未实跑打点验证一条消息在各关卡的耗时分布

## 十、本章小结

- 用户输入在成为"用户消息"之前，被 TUI、扩展命令、扩展 `input`、skill、模板五个东西抢着处理过
- TUI 层吃掉 26 条内置命令（不产生任何消息）和 `!` 开头的 shell 执行（记成 `bashExecution` 消息，但不走 Agent Loop）
- `AgentSession.prompt()` 的八道闸里，只有一道在改文本，其余七道在决定"要不要发、发之前做什么"
- 三处 fail fast：压缩互斥、无模型、无凭据。全部在消息进数组之前，失败不留残骸
- 压缩检查看的是**上一条 assistant 的 usage**，因为循环层没有"发之前问额度"的能力
- 进循环后还有三次转换：`transformContext`（扩展）→ `convertToLlm`（类型压平）→ `llmContext`（协议形状）
- Pi 自有的消息类型全部降级成 user 消息，语义靠前后缀标记
- 最后两个改写点在模型层：`before_provider_headers` 和 `onPayload`，后者已经是 provider 专属结构

<details>
<summary>本章源码索引</summary>

| 符号 | 位置 |
|---|---|
| `onSubmit` 输入回调 | `packages/coding-agent/src/modes/interactive/interactive-mode.ts:2962` |
| 交互主循环 | `packages/coding-agent/src/modes/interactive/interactive-mode.ts:1176` |
| `getUserInput` | `packages/coding-agent/src/modes/interactive/interactive-mode.ts:3878` |
| `BUILTIN_SLASH_COMMANDS` | `packages/coding-agent/src/core/slash-commands.ts:19` |
| `AgentSession.prompt` | `packages/coding-agent/src/core/agent-session.ts:1139` |
| `_tryExecuteExtensionCommand` | `packages/coding-agent/src/core/agent-session.ts:1302` |
| `_expandSkillCommand` | `packages/coding-agent/src/core/agent-session.ts:1333` |
| `expandPromptTemplate` | `packages/coding-agent/src/core/prompt-templates.ts:269` |
| `_checkCompaction` | `packages/coding-agent/src/core/agent-session.ts:2105` |
| `_runAgentPrompt` | `packages/coding-agent/src/core/agent-session.ts:1085` |
| `_rebuildSystemPrompt` | `packages/coding-agent/src/core/agent-session.ts:1045` |
| `buildSystemPrompt` | `packages/coding-agent/src/core/system-prompt.ts:28` |
| `emitInput` | `packages/coding-agent/src/core/extensions/runner.ts:1196` |
| `emitBeforeAgentStart` | `packages/coding-agent/src/core/extensions/runner.ts:1081` |
| `createContextSnapshot` | `packages/agent/src/agent.ts:437` |
| `createLoopConfig` | `packages/agent/src/agent.ts:445` |
| `processEvents` | `packages/agent/src/agent.ts:544` |
| `streamAssistantResponse` | `packages/agent/src/agent-loop.ts:281` |
| `convertToLlm` | `packages/coding-agent/src/core/messages.ts:148` |
| `ModelRuntime.streamSimple` | `packages/coding-agent/src/core/model-runtime.ts:636` |
| `prepareRequest` | `packages/coding-agent/src/core/model-runtime.ts:573` |
| `onPayload` 调用点（Anthropic） | `packages/ai/src/api/anthropic-messages.ts:565` |

</details>

## 下一步

→ [03 Agent Loop 与终止控制](./03-agent-loop) — 消息发出去之后，那个双层循环怎么转、什么时候停、以及为什么它不会转到天荒地老。
