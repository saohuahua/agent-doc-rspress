---
title: 02.1 输入管线
description: 输入分类、文本变换、运行状态、运行前保护——最小骨架每一步在 Pi 里的真实形态
---

# 02.1 输入管线：从骨架到四阶段处理

[← 回到 02 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

总览里的骨架是这样的：

```typescript title="教学示例，非 Pi 源码"
async function prompt(text: string) {
  if (isCommand(text)) return executeCommand(text);      // ← §一
  const expanded = expandPrompt(text);                   // ← §二
  if (agent.isRunning) return agent.steer(expanded);     // ← §三
  assertModelAndAuth();                                  // ← §四
  await compactIfNeeded();                               // ← §四
  await agent.prompt(createUserMessage(expanded));
}
```

这一页按这四步展开。每一节的结构固定：**最小实现怎么写 → 会遇到什么问题 → Pi 怎么处理 → 取舍与失败表现 → 怎么排查**。

## 一、输入分类：`isCommand(text)` 那一行

### 最小实现怎么写

一个 `if`：以 `/` 开头就查命令表，否则当普通消息。

### 会遇到什么问题

命令有两种主人，它们想要的东西完全不同：

- `/settings`、`/model`、`/tree` 这类要**打开一个界面**，不产生任何消息，也不需要模型参与
- 扩展注册的 `/deploy` 这类要**自己跑一段逻辑**，可能自己去调模型

第一种如果交给 `AgentSession` 处理，产品层就得知道"选择器长什么样"；第二种如果交给 TUI 处理，扩展就得依赖某个具体界面。

### Pi 怎么处理

拆到两层，各管一种。

**TUI 层**在 `onSubmit` 的 if 链里就地解决内置命令：

```typescript title="packages/coding-agent/src/modes/interactive/interactive-mode.ts:2962" {5,8}
this.defaultEditor.onSubmit = async (text: string) => {
  text = text.trim();
  if (!text) return;                          // 空串直接丢

  if (text === "/settings") {                 // 内置命令逐条精确匹配
    this.showSettingsSelector();              // 打开 UI，不产生任何消息
    this.editor.setText("");
    return;                                   // 到这里就结束，session 一无所知
  }
  // ... /model /tree /export /fork /compact /resume /quit ...
```

命令的**名字和描述**声明在 `BUILTIN_SLASH_COMMANDS`（`packages/coding-agent/src/core/slash-commands.ts:19`）供补全 UI 使用，**行为**写在 TUI 的 if 链里。同一层还处理另外两条岔路：`!ls -la` 直接跑 shell（结果记成 `bashExecution` 消息，`!!` 前缀的还会标 `excludeFromContext` 只给人看），以及压缩期间把输入暂存进 TUI 自己的队列。

**产品层**在 `prompt()` 的第一步查扩展注册表：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1147" {2,5}
if (expandPromptTemplates && text.startsWith("/")) {
  const handled = await this._tryExecuteExtensionCommand(text);   // 查扩展注册表
  if (handled) {
    preflightResult?.(true);                                       // 执行完直接返回
    return;                                                        // 不产生任何消息
  }
}
```

放在第一步的原因是：扩展命令通过 `pi.sendMessage()` 自己管理与模型的交互，所以**即使 agent 正在流式输出，它也照样立即执行**，而不像普通消息那样只能排队。

### 取舍与失败表现

声明与行为分家，让 `core` 不必知道 `/model` 会打开一个选择器。代价是加一条内置命令要动两个文件，漏改一处就出现"能补全但按了没反应"，或者"能用但补不出来"。

### 排查：`/review` 为什么走的不是我的模板

`/` 前缀一共有四类主人，匹配顺序是固定的：

```text
内置命令        扩展命令              skill              prompt 模板
(TUI if 链)  →  (AgentSession 第一步)  →  (展开阶段)  →  (展开阶段)
   ↑ 先到先得，前面命中就不会往后传，且不产生任何告警
```

定位办法：

1. 名字撞上 `BUILTIN_SLASH_COMMANDS` 里的 23 条之一 → 改名，这层没得商量
2. 没撞内置命令但仍不生效 → 用 `/reload` 后看有没有同名扩展命令；扩展命令的注册发生在 `_tryExecuteExtensionCommand` 查的那张表里
3. 都不是 → 检查模板文件是否在 `~/.pi/agent/prompts/` 或 `<项目>/.pi/prompts/` 下，且扩展名为 `.md`

## 二、文本变换：`expandPrompt(text)` 那一行

### 最小实现怎么写

查一张模板表，命中就把文件内容读出来替换掉。

### 会遇到什么问题

三件事想插在同一个位置，但它们要看到的输入不一样：

- 扩展想做**输入审计**——它要看用户敲的原文
- skill 展开要产出**几千字的完整文档**
- 模板展开要做**位置参数替换**

如果顺序摆错，扩展审计到的就是模板作者写的字，而不是用户写的字。

### Pi 怎么处理

固定成"先扩展、后展开"：

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

`emitInput`（`packages/coding-agent/src/core/extensions/runner.ts:1196`）把所有扩展的 `input` 处理器串成一条流水线：上一个的 `transform` 结果是下一个的输入，任何一个返回 `handled` 就短路。

展开排在它后面，两条路并列：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1183" {3-4}
let expandedText = currentText;
if (expandPromptTemplates) {
  expandedText = this._expandSkillCommand(expandedText);                    // /skill:name
  expandedText = expandPromptTemplate(expandedText, [...this.promptTemplates]);  // /tplname
}
```

| | 触发语法 | 产物 | 不匹配时 |
|---|---|---|---|
| Skill | `/skill:name args` | `<skill>` 标签包住的整份 SKILL.md | 原样返回 |
| Prompt 模板 | `/name arg1 arg2` | 模板正文，`$1` `$2` `$@` 被替换 | 原样返回 |

skill 展开时多包了一行元信息：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1344" {3-4}
const content = readFileSync(skill.filePath, "utf-8");
const body = stripFrontmatter(content).trim();
const skillBlock = `<skill name="${skill.name}" location="${skill.filePath}">
References are relative to ${skill.baseDir}.\n\n${body}\n</skill>`;   // 告诉模型相对路径基准
return args ? `${skillBlock}\n\n${args}` : skillBlock;
```

`References are relative to ...` 这句是渐进披露能跑通的前提：SKILL.md 里写 `scripts/run.py`，模型才知道去哪个目录找（第 05 章展开）。

### 取舍与失败表现

顺序固定带来的好处是审计位置明确。代价是两条展开路都**静默失败**：skill 名或模板名不存在都原样返回，你敲错一个字母，模型收到的是 `/reveiw src/api.ts`，然后开始猜你想干什么。读文件失败会通过扩展 runner 发一个 error 事件，"名字不存在"则连事件都没有。

## 三、运行状态：`agent.isRunning` 那一行

### 最小实现怎么写

正在跑就拒绝，让用户等。

### 会遇到什么问题

用户在等待期间敲字有两种意图，直接拒绝会把它们一起丢掉：

- "不对，别改那个文件" —— 希望**尽快**插进去纠正方向
- "改完顺便把文档也更新一下" —— 希望**等它忙完**再处理

另外还有一种并发：压缩正在重写 `agent.state.messages`，这时候插消息会被摘要覆盖。

### Pi 怎么处理

两个队列分开：

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

两个队列各自什么时候被读，是[第 03 章](../03-agent-loop/loop)的内容。这里只需要注意一点：**排进队列的是展开后的文本**。`/skill:review` 入队时已经是完整的 skill 块，出队时不会再展开一次——排的是快照不是引用，避免了"排队期间 SKILL.md 被改了"的时序问题；代价是队列里可能躺着几千字，界面显示待发消息时要自己截断。

压缩并发走另一条路，直接拒绝：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1156" {2-4}
if (this._compactionAbortController !== undefined) {
  throw new Error(
    "Cannot submit a prompt while compaction is in progress. Wait for compaction to finish and retry.",
  );
}
```

### 排查：压缩期间调 `prompt()` 报错，为什么不在这里排队

`AgentSession` 只负责让冲突可见，不负责决定怎么恢复——因为"该排队还是该提示用户"取决于调用方是谁。TUI 知道自己面对的是人，所以它在更外层把输入存进 `compactionQueuedMessages`，压缩结束再 flush；而 SDK 调用方可能更希望立刻拿到错误自己处理。

如果你在自己的集成里遇到这个错误，正确做法是在调用 `prompt()` 之前检查 `isCompacting`，或者捕获这条错误后自己排队，而不是去掉这个检查。

另外注意 `isStreaming` 的口径（`packages/coding-agent/src/core/agent-session.ts:900`）：它返回的是 `_isAgentRunActive`，在 `_runAgentPrompt` 入口置真、在 `_emitAgentSettled` 里置假，覆盖了自动重试和压缩后重跑的整个区间，不只是"正在吐字"那一段。

## 四、运行前保护：校验、压缩与最后的加料

### 最小实现怎么写

```typescript
assertModelAndAuth();
await compactIfNeeded();
messages.push(createUserMessage(expanded));
```

### 会遇到什么问题

三个：**没凭据的两种原因需要不同的修复动作**；**压缩要在哪一刻判断**；**扩展想在最后一刻加上下文**。

### Pi 怎么处理

校验两步，且都在消息进数组之前：

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

同一个 `undefined`，OAuth 过期给的是"跑 `/login` 重新授权"，API Key 缺失给的是"去哪配 key"——两条排查路径。这也是链路上第一次可能打网络的地方，`checkAuth` 可能触发 token 刷新。

压缩判断紧随其后，依据是**上一条 assistant 消息带回来的 usage**：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1231" {3}
const lastAssistant = this._findLastAssistantMessage();
if (lastAssistant) {
  await this._checkCompaction(lastAssistant, false);   // false = 连被中止的消息也检查
}
```

"要发的是新消息，检查的却是旧回复"看起来反直觉，但循环层拿到的 `messages` 就是要发出去的全部内容（第 01 章），它没有"发之前问一下还剩多少额度"的能力，唯一可靠的 token 数来自 provider 上一次的回执。第二个参数传 `false`，是为了让"用户中止了一个已经溢出的回复、然后又发了新消息"这种情况也能被检查到。压缩的完整机制在第 06 章。

最后组装消息，并留一个扩展挂点：

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

`emitBeforeAgentStart`（`packages/coding-agent/src/core/extensions/runner.ts:1081`）能做两件 `input` 做不到的事：追加 `role: "custom"` 的上下文消息，以及整体替换 system prompt。它排在最后，是因为它需要看到最终文本才能决定加什么，同时又必须在进循环之前完成。

### 排查：认证失败为什么不应该先写 user message

顺序是刻意的——校验 `throw` 的时候，一条消息都还没进 `messages` 数组。

如果反过来先写消息再校验，失败的会话里会留下一条孤立的 user 消息。下次 `resume` 这个会话时，最后一条是 user 角色，`agent.continue()` 会把它当成待回复的提问重新发一遍，用户看到的是"我明明没说话，它自己动起来了"。

同一套逻辑也解释了另一处细节：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1278" {2-3,6-7}
if (result?.systemPrompt !== undefined) {
  this._systemPromptOverride = result.systemPrompt;      // 记下来，供后续 turn 复用
  this.agent.state.systemPrompt = result.systemPrompt;
} else {
  this._systemPromptOverride = undefined;                // 没返回就恢复基线
  this.agent.state.systemPrompt = this._baseSystemPrompt;
}
```

`else` 分支不能省。`AgentSession` 是长生命周期对象，没有这个显式重置，上一轮扩展改过的 system prompt 会一直粘着——源码注释写的是 "in case previous turn had modifications"。

## 五、小结

- 阶段 1 拆到两层：需要界面的命令留在 TUI，需要自跑逻辑的命令留在产品层
- 阶段 2 的顺序是"先扩展、后展开"，扩展因此能审计到用户原文；两条展开路都静默失败
- 阶段 3 把"正在跑"拆成两个队列，把"正在压缩"做成显式拒绝，恢复策略交给更外层
- 阶段 4 的三处校验都排在消息落库之前，为的是失败后会话里不留孤立消息
- 长生命周期对象的每轮状态需要显式重置，否则上一轮的覆盖值会粘住

:::details 附录：源码里的十四项完整清单

四个阶段在源码里对应下面十四处判断，顺序即执行顺序。这份表用于对照代码，不建议当作入门的心智模型。

| # | 层 | 判断什么 | 不通过会怎样 |
|---|---|---|---|
| ① | TUI | 是不是空串 | 直接丢弃 |
| ② | TUI | 是不是内置斜杠命令 | 本地处理，不产生消息 |
| ③ | TUI | 是不是 `!` / `!!` 开头 | 直接跑 shell，记成 `bashExecution` 消息 |
| ④ | TUI | 压缩是不是正在跑 | 进 TUI 本地队列，压缩完再发 |
| ⑤ | TUI | agent 是不是正在跑 | 转成 steer 排队 |
| ⑥ | TUI | 以上都不是 | 交给 `AgentSession.prompt()` |
| ⑦ | 产品层 | 是不是扩展注册的命令 | 立即执行并返回，不产生消息 |
| ⑧ | 产品层 | 压缩是不是正在跑 | `throw` |
| ⑨ | 产品层 | 扩展的 `input` 要不要拦 | `handled` 直接返回；`transform` 改写文本 |
| ⑩ | 产品层 | 是 skill 还是 prompt 模板 | 替换成完整文本；都不匹配就原样通过 |
| ⑪ | 产品层 | agent 是不是正在跑 | steer / followUp 排队，然后返回 |
| ⑫ | 产品层 | 有没有模型、有没有凭据 | `throw` |
| ⑬ | 产品层 | 上一条 assistant 是否溢出或超阈值 | 先压缩再继续 |
| ⑭ | 产品层 | 扩展的 `before_agent_start` 要不要加料 | 追加 custom 消息、可整体替换 system prompt |

内置命令声明 23 条（`BUILTIN_SLASH_COMMANDS`），`onSubmit` 里另有 `/debug`、`/arminsayshi`、`/dementedelves` 三条不进补全列表，实际处理 26 条。

:::

:::details 本页源码索引

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
| `isStreaming` | `packages/coding-agent/src/core/agent-session.ts:900` |
| `_checkCompaction` | `packages/coding-agent/src/core/agent-session.ts:2105` |
| `_runAgentPrompt` | `packages/coding-agent/src/core/agent-session.ts:1085` |
| `emitInput` | `packages/coding-agent/src/core/extensions/runner.ts:1196` |
| `emitBeforeAgentStart` | `packages/coding-agent/src/core/extensions/runner.ts:1081` |

:::

## 下一步

→ [02.2 从领域消息到 Provider Payload](./assembly) — 消息组装好之后，为什么还要再降级两次。
