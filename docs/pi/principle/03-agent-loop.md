---
title: 03 Agent Loop 与终止控制
description: 循环到底有几层、六个出口分别通向哪、以及 Pi 为什么没有 maxTurns
---

# 03 Agent Loop 与终止控制

以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准。文中所有 `file:line` 经 `pnpm check:refs` 校验，代码块里的中文注释为本文补充。

多轮循环与插队的基本形态在 [Learn 06](/learn/06-multi-turn) 讲过。本章要看的是 Pi 的实现里循环一共有几个出口、每个出口的判定条件，以及一个反直觉的事实：**Pi 没有轮数上限**。

:::tip 一句话版本

循环一共三层：等人输入的、决定要不要再跑一次的、真正在转的。真正在转的那一层只有六个出口，最常走的那个是"模型这轮没再要求调工具"——它**没有轮数计数器**。

:::

## 0. 本章回答哪些面试问题

- **#1 AI Coding 整体的实现思路是什么** —— 内外双层循环的分工，以及"一轮"到底指什么
- **#2 怎么保证执行过程中的准确性和可靠性** —— 六个出口、三层重试、abort 的观察点与晚到结果

编号见交接文档 §12。

## 一、问题：它读了同一个文件 47 次

场景：让 agent 修一个类型错误，它开始循环。

```text
read src/types.ts     →  "我看看这个类型"
read src/api.ts       →  "还得看调用方"
read src/types.ts     →  "确认一下字段名"
edit src/api.ts       →  改了
bash tsc --noEmit     →  还是报错，位置换了一个
read src/types.ts     →  "再看看"
...
```

它不会自己停。模型每一轮都觉得"再看一眼就明白了"，而每一轮的工具结果都给了它继续的理由。

这时候有三个问题要回答：

1. **谁来喊停？** 循环里有没有一个计数器
2. **喊停之后，正在跑的工具怎么办？** 一个 `bash npm test` 跑了 30 秒，Esc 按下去它会被杀掉吗
3. **停下来之后是真的停了吗？** `agent_end` 事件发出来，界面就能关掉转圈了吗

Pi 对这三个问题的回答分别是：**没有计数器**、**大部分能杀掉但不保证**、**不能**。下面逐个拆。

## 二、全景：三层循环，不是一层

很多人以为 Agent Loop 就是一个 `while`。Pi 里实际有三层，各管各的事：

```text
┌────────────────────────────────────────────────────────────────────────┐
│ L3  交互主循环         interactive-mode.ts:1176                          │
│                                                                        │
│     while (true) { userInput = await getUserInput(); session.prompt() } │
│     管的是：等人说话。人不说话就一直阻塞                                    │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ 一条用户消息
┌──────────────────────────────▼─────────────────────────────────────────┐
│ L2  运行后重跑循环      agent-session.ts:1085  _runAgentPrompt            │
│                                                                        │
│     await agent.prompt(messages);                                      │
│     while (await this._handlePostAgentRun()) await agent.continue();   │
│                                                                        │
│     管的是：agent 停下来之后，要不要让它再跑一次                            │
│       ① 可重试错误 → 退避后 continue                                     │
│       ② 上下文溢出 → 压缩后 continue                                     │
│       ③ 队列里还有 agent_end 处理器塞进来的消息 → continue                 │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ agentLoop(...)
┌──────────────────────────────▼─────────────────────────────────────────┐
│ L1  Agent Loop         agent-loop.ts:155  runLoop                       │
│                                                                        │
│     外层 while (true)  ← follow-up 队列非空就再来一圈                      │
│       内层 while (hasMoreToolCalls || pendingMessages.length > 0)       │
│         turn_start → 注入排队消息 → 请求模型 → 执行工具 → turn_end         │
│         → prepareNextTurn → shouldStopAfterTurn → poll steering        │
│                                                                        │
│     管的是：模型还想调工具就继续给它调                                      │
└────────────────────────────────────────────────────────────────────────┘
```

三层的边界很清楚：**L1 决定"这次任务做完了没"，L2 决定"做完了要不要再来一次"，L3 决定"人还有没有别的要求"。** 面试里被问"死循环怎么防"，先说清楚问的是哪一层——L1 的死循环和 L2 的死循环是两回事。

## 三、L1 内层：一轮是什么

**文件**：`packages/agent/src/agent-loop.ts:155`

先把"turn"这个词钉死。在 Pi 里，**一轮 = 一次模型回复 + 这次回复里所有工具调用的执行**。不是"一次请求"，也不是"一次用户交互"。

```typescript title="packages/agent/src/agent-loop.ts:170" {1,4,18}
while (true) {                                     // 外层：follow-up 队列驱动
  let hasMoreToolCalls = true;                     // 首轮必进，先假设有工具要调

  while (hasMoreToolCalls || pendingMessages.length > 0) {   // 内层：工具调用驱动
    if (!firstTurn) await emit({ type: "turn_start" });
    else firstTurn = false;                        // 首个 turn_start 在 runAgentLoop 里已发过

    if (pendingMessages.length > 0) {              // 排队消息插在模型回复之前
      for (const message of pendingMessages) {
        await emit({ type: "message_start", message });
        await emit({ type: "message_end", message });
        currentContext.messages.push(message);
        newMessages.push(message);
      }
      pendingMessages = [];
    }

    const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFunction);
```

内层的循环条件只有两项：**模型还想调工具**，或者**有排队消息要注入**。没有第三项，没有计数器，没有时间上限。

`hasMoreToolCalls` 的赋值只有两处：初始的 `true`（171 行），和工具批次执行完之后的这一行：

```typescript title="packages/agent/src/agent-loop.ts:206" {1,8}
hasMoreToolCalls = false;                          // 先归零：没有工具调用就等于要停
if (toolCalls.length > 0) {
  const executedToolBatch =
    message.stopReason === "length"
      ? await failToolCallsFromTruncatedMessage(toolCalls, emit)   // 截断了，全部作废
      : await executeToolCalls(currentContext, message, config, signal, emit);
  toolResults.push(...executedToolBatch.messages);
  hasMoreToolCalls = !executedToolBatch.terminate;  // 只有整批都要求终止才停
```

一句话概括 L1 的终止逻辑：**模型不再要求调工具，循环就结束。** 剩下的机制都是在这条主线上打的补丁。

## 四、六个出口

`runLoop` 有六种退出路径，每一种对外表现不同。这张表是本章最值得记的东西：

| 出口 | 触发条件 | 位置 | 结果 | 谁能造成 |
|---|---|---|---|---|
| ① 错误/中止 | `stopReason` 是 `error` 或 `aborted` | `agent-loop.ts:196` | 发 turn_end + agent_end 后返回 | provider 报错、用户按 Esc |
| ② 自然结束 | 没有工具调用，两个队列都空 | `agent-loop.ts:271` | break 出外层，发 agent_end | 模型自己决定 |
| ③ 主动停止 | `shouldStopAfterTurn` 返回 true | `agent-loop.ts:247` | 直接发 agent_end，跳过队列轮询 | SDK 使用方 |
| ④ 批次终止 | 整批工具结果全部 `terminate` 为 true | `agent-loop.ts:216` | hasMoreToolCalls 置假，走 ② | 扩展注册的工具、扩展阻断 |
| ⑤ 抛异常 | 回调 throw 了 | `agent.ts:505` | 合成假消息，补四个事件 | 违反契约的回调 |
| ⑥ follow-up 续跑 | 内层退出但 follow-up 队列非空 | `agent-loop.ts:264` | 不退出，continue 回内层 | 用户排队的任务 |

出口 ③ 和 ⑤ 值得展开。

### 出口 ③：`shouldStopAfterTurn` 在现役产品里没人用

```typescript title="packages/agent/src/agent-loop.ts:247" {2,9}
if (
  await config.shouldStopAfterTurn?.({          // 每个 turn_end 之后问一次
    message,
    toolResults,
    context: currentContext,
    newMessages,
  })
) {
  await emit({ type: "agent_end", messages: newMessages });   // 直接结束，不 poll 队列
  return;
}
```

它的位置在 `prepareNextTurn` 之后、steering 轮询之前。返回 true 会**跳过 steering 和 follow-up 的轮询**——排队的消息不会丢，但这一次运行不管了。

搜遍 `coding-agent` 全包，`shouldStopAfterTurn` 只出现在类型定义和 `Agent` 的转发里，**产品层从来没有设置过它**。它是留给 SDK 使用方的口子：你用 `@earendil-works/pi` 起一个 session，想实现"最多 20 轮"或者"token 花超 5 万就停"，就在这里写。

Pi 自己不用它，等于官方明确表态：**交互式使用不需要硬性轮数上限，人在环里就是上限。**

### 出口 ⑤：回调抛异常会撕破事件序列

`AgentLoopConfig` 的每个回调的 JSDoc 里都写着同一句话：

> Contract: must not throw or reject. Return a safe fallback value instead.

违反了会怎样？`runLoop` 不接异常，一路冒到 `Agent.runWithLifecycle`：

```typescript title="packages/agent/src/agent.ts:511" {2-4,10-13}
private async handleRunFailure(error: unknown, aborted: boolean): Promise<void> {
  const failureMessage = {
    role: "assistant",
    content: [{ type: "text", text: "" }],        // 空内容的假 assistant 消息
    usage: EMPTY_USAGE,
    stopReason: aborted ? "aborted" : "error",
    errorMessage: error instanceof Error ? error.message : String(error),
    timestamp: Date.now(),
  } satisfies AgentMessage;
  await this.processEvents({ type: "message_start", message: failureMessage });
  await this.processEvents({ type: "message_end", message: failureMessage });
  await this.processEvents({ type: "turn_end", message: failureMessage, toolResults: [] });
  await this.processEvents({ type: "agent_end", messages: [failureMessage] });
}
```

它**手工补齐了四个事件**，让订阅者看到的序列仍然是完整的。代价是这条 assistant 消息是伪造的：没有 usage、没有内容、也没有对应的请求。

这是一个值得学的兜底模式：**事件流是对外契约，异常路径也必须遵守它**。但补齐只发生在 `Agent` 这一层——如果异常发生在半个 turn 中间（比如工具执行完了、`turn_end` 还没发），订阅者会先收到半截真事件，再收到一整套假事件。类型系统对此毫无约束。

## 五、`stopReason` 分支：`length` 为什么要特殊处理

`StopReason` 一共七种（`packages/ai/src/types.ts:405`）：`pending` `stop` `length` `toolUse` `error` `aborted` `deferred`。循环只显式处理三种。

`error` / `aborted` 走出口 ①，`length` 走一条专门的路：

```typescript title="packages/agent/src/agent-loop.ts:374" {3-5}
/**
 * Fail all tool calls from an assistant message that was truncated by the
 * output token limit. Streamed tool-call arguments are finalized with a
 * best-effort JSON salvage parser, so a truncated message can yield tool calls
 * whose arguments parse and validate but are silently incomplete.
 */
async function failToolCallsFromTruncatedMessage(
  toolCalls: AgentToolCall[],
  emit: AgentEventSink,
): Promise<ExecutedToolCallBatch> {
  // 每个工具调用直接产出错误结果，一个都不执行
```

这段注释道破了一个真实的坑：**流式解析工具参数时用的是"尽力而为"的 JSON 抢救解析器**。模型输出被 token 上限截断，抢救出来的 JSON 可能语法完整、schema 校验也通过，但内容是残缺的。

举个具体的：模型想写 `{"path": "src/api.ts", "content": "……三千行……"}`，在 content 中途被截断。抢救解析器补上引号和大括号，得到一个 `content` 只有一半的合法对象。校验通过，执行下去就是**写了半个文件**。

Pi 的处理是一刀切：`stopReason === "length"` 时整批工具调用全部作废，每个都回填一条错误结果，告诉模型"你被截断了，重发完整参数"。注意 `terminate` 返回的是 `false`，所以循环继续——模型有机会重来一次。

换来的是不会执行残缺参数。代价是一次浪费：整批调用都白算了 token，包括那些其实完整的。判断粒度是消息级不是调用级，因为无法可靠地知道截断发生在第几个调用上。

## 六、Steering 与 Follow-up：两个队列，三个轮询点

两个队列的语义差别在于**什么时候被读**：

```text
                    ┌─── 内层 while ───────────────────────────────┐
  runLoop 入口       │                                             │
  ─── poll steering ─┤─► 注入 ─► 请求模型 ─► 执行工具 ─► turn_end ──┤
       (167)        │                                    │        │
                    │                          poll steering (259)│
                    │                                    │        │
                    └────────────────────────────────────┴────────┘
                                          │ 内层条件不满足
                                          ▼
                              poll follow-up (263)
                                    有 → pendingMessages，回内层
                                    无 → break → agent_end
```

**Steering 在两个点被轮询**：循环开始前（167 行）和每个 turn 结束后（259 行）。开始前那次是为了捡起"用户在等待期间敲的字"。

**Follow-up 只在内层退出后被轮询**（263 行）。也就是说它的语义是"等你把手上的事全干完了再看这个"。

队列的排空策略由 `PendingMessageQueue`（`packages/agent/src/agent.ts:125`）控制：

```typescript title="packages/agent/src/agent.ts:141" {2-6,8-11}
drain(): AgentMessage[] {
  if (this.mode === "all") {
    const drained = this.messages.slice();       // 全部一次性倒出
    this.messages = [];
    return drained;
  }

  const first = this.messages[0];                // one-at-a-time：一次只给一条
  if (!first) return [];
  this.messages = this.messages.slice(1);
  return [first];
}
```

两个队列默认都是 `one-at-a-time`（`packages/agent/src/agent.ts:231`）。排三条 follow-up，agent 会跑三次完整的"内层循环 + follow-up 轮询"，而不是一口气把三条都塞进同一轮上下文。这让每条任务的上下文更干净，代价是多几次往返。

还有一处细节：`skipInitialSteeringPoll`。

```typescript title="packages/agent/src/agent.ts:475" {2-5}
getSteeringMessages: async () => {
  if (skipInitialSteeringPoll) {
    skipInitialSteeringPoll = false;       // 只跳过第一次
    return [];
  }
  return this.steeringQueue.drain();
},
```

`Agent.continue()`（`packages/agent/src/agent.ts:361`）已经从 steering 队列取过消息、正准备用它启动新一轮时，这个标志被置位。没有它，那条消息会在循环入口的 167 行被**再取一次**，导致同一条 steering 消息进两次上下文。

这类"队列被两个地方轮询"的重复消费问题，是队列 + 循环组合里最容易出的 bug。Pi 用一个一次性布尔标志解决，不优雅但有效。

## 七、终止控制：Pi 到底靠什么防死循环

把所有相关机制摊开，按"能不能真的兜住无限循环"分类。

### 能兜住的

**Abort。** 用户按 Esc，`AbortController` 中止。这是唯一无条件生效的机制。

**上下文窗口。** 转得足够多，上下文一定会满。满了触发压缩（第 06 章），而 `_checkCompaction` 里的 `_overflowRecoveryAttempted` 标志保证"压缩完再试一次"只做一次；还溢出就报错终止。

**钱。** 每轮都在花 token。这不是工程机制，但它是实际生效的约束。

### 兜不住的

**`terminate`。** 规则很严格：

```typescript title="packages/agent/src/agent-loop.ts:582" {2}
function shouldTerminateToolBatch(finalizedCalls: FinalizedToolCallOutcome[]): boolean {
  // every()：只要有一个工具结果没说要停，整批就不停
  return finalizedCalls.length > 0 && finalizedCalls.every((finalized) => finalized.result.terminate === true);
}
```

**整批工具结果全部为 true 才生效**。模型在同一条消息里发了 `read` + 你的终止工具，`read` 没有 `terminate`，整批就不终止。

而且没有任何内置工具会设置它——搜遍 `packages/coding-agent/src/core/tools/` 一处都没有。它是给扩展用的，典型场景是"结构化输出工具调用即结束"（`packages/coding-agent/docs/extensions.md:1999`）。

**`shouldStopAfterTurn`。** 上一节说过，产品层没接。SDK 使用方要自己写。

**轮数上限。** 不存在。全仓搜 maxTurns / maxSteps / maxIterations，命中项只有测试文件里的常量 `MAX_TURNS`（`packages/coding-agent/test/sdk-codex-cache-probe-tool-loop.ts:67`）。生产代码里没有这个概念。

:::warning 这是一个明确的产品取舍，不是遗漏

Pi 的定位是**交互式终端 agent**：人一直看着屏幕，觉得不对就按 Esc。这个前提下，硬性轮数上限的收益很低（正常任务几十轮很常见），坏处很明确（长任务被无意义地打断）。

但同一套代码也能跑 `--mode json` 和 SDK，在 CI 里无人值守。这时候前提不成立了，而框架没有给出默认保护——**你必须自己实现 `shouldStopAfterTurn`**。

面试里这一点可以拿来讲取舍：说"Pi 没有 maxTurns，因为它假设人在环里；无人值守场景下这个假设失效，得靠 SDK 层的 `shouldStopAfterTurn` 补"，比背一个"有防死循环机制"要好得多。

:::

### 三层重试，三套预算

"防死循环"的反面是"别太早放弃"。Pi 的重试也分了三层：

| 层 | 实现 | 预算来源 | 重试什么 |
|---|---|---|---|
| provider SDK | `retryProviderRequest`（`packages/ai/src/utils/provider-retry.ts:105`） | settings.retry.provider.maxRetries | 单次 HTTP 请求，按 provider 返回的重试建议退避 |
| 摘要调用 | `retryAssistantCall`（`packages/ai/src/utils/retry.ts:163`） | `settings.retry` | 压缩与分支摘要的 LLM 调用 |
| agent 轮次 | `_prepareRetry`（`packages/coding-agent/src/core/agent-session.ts:2866`） | `settings.retry`，默认 3 次 / 2s 起 | 整个 assistant turn，把失败消息从状态里摘掉再重来 |

三层都用指数退避 `baseDelayMs * 2^(attempt-1)`，都可以被 abort 打断。

判断"能不能重试"靠的是 `isRetryableAssistantError`（`packages/ai/src/utils/retry.ts:223`），实现是**两个正则**：

```typescript title="packages/ai/src/utils/retry.ts:223" {4-5}
export function isRetryableAssistantError(message: AssistantMessage): boolean {
  if (message.stopReason !== "error" || !message.errorMessage) return false;
  const errorMessage = message.errorMessage;
  if (NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN.test(errorMessage)) return false;  // 黑名单：配额/账单
  return RETRYABLE_PROVIDER_ERROR_PATTERN.test(errorMessage);                       // 白名单：限流/网络
}
```

黑名单在前：`insufficient_quota`、`quota exceeded`、`billing`、`Monthly usage limit reached` 这类是**确定性失败**，重试只会浪费时间。白名单在后：`429` `500` `503` `overloaded` `socket hang up` `getaddrinfo` 这类是瞬时的。

用字符串匹配做错误分类，是这份代码里最"不体面"但最务实的一处。30 多家 provider 的错误结构各不相同，有的连 HTTP 状态码都埋在 JSON 文本里。写成正则的好处是**加一个 provider 的怪异错误只要加一行字符串**；代价是错误文案一变就漏判，而且完全依赖上游不改文案。这条路是 `compat`「数据优于分支」思路（第 01 章）在错误处理上的延伸。

## 八、Abort：信号从哪进，在哪被观察

链路是这样的：

```text
  Esc 键
    │
    ▼
  restoreQueuedMessagesToEditor({ abort: true })    interactive-mode.ts:4357
    │  先把排队的消息倒回输入框（不丢用户输入）
    ▼
  agent.abort()                                     agent.ts:319
    │
    ▼
  activeRun.abortController.abort()
    │
    └─► signal 传给三个地方：
          ① streamFn(model, ctx, { signal })     ── provider SDK 中断 HTTP
          ② tool.execute(id, args, signal, ...)  ── 工具自己决定怎么响应
          ③ runLoop 内部的 signal?.aborted 检查  ── 阻止后续调用启动
```

用户输入先被抢救回输入框再中止，顺序不能反——`clearAllQueues()` 之后队列就没了。

`signal?.aborted` 在循环里被检查了五处，全部集中在工具执行路径：

```typescript title="packages/agent/src/agent-loop.ts:629" {1}
if (signal?.aborted) {                              // beforeToolCall 之后再查一次
  return {
    kind: "immediate",
    result: createErrorToolResult("Operation aborted"),
    isError: true,
  };
}
```

`beforeToolCall` 可能是个慢操作（扩展弹了个确认框），所以它前后各查一次。串行模式下每执行完一个工具查一次然后 `break`；并行模式下每准备完一个查一次然后 `break`。

### 晚到的结果

并行模式有一个绕不开的问题：

```typescript title="packages/agent/src/agent-loop.ts:540" {2}
const orderedFinalizedCalls = await Promise.all(
  finalizedCalls.map((entry) => (typeof entry === "function" ? entry() : Promise.resolve(entry))),
);
```

`break` 只能阻止**还没启动**的工具。已经进入 `Promise.all` 的那些必须等它们自己结束。一个 `bash npm test` 已经 spawn 出去了，abort 之后循环仍然会 await 它。

工具能不能被真的杀掉，取决于工具自己有没有监听 signal。内置 `bash` 会 kill 子进程，但一个第三方扩展工具里如果写的是 `await fetch(url)` 而没传 signal，那就得等它超时。

**结论**：`agent.abort()` 是"请求中止"，不是"立即中止"。`AgentSession.abort()`（`packages/coding-agent/src/core/agent-session.ts:1599`）因此是这样写的：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1599" {2-4}
async abort(): Promise<void> {
  this.abortRetry();          // 先打断重试退避的 sleep
  this.agent.abort();         // 再中止运行
  await this.waitForIdle();   // 然后等，等到真的 idle
}
```

三步一步都不能少。

## 九、L2：`agent_end` 之后还会发生什么

**文件**：`packages/coding-agent/src/core/agent-session.ts:1085`

```typescript title="packages/coding-agent/src/core/agent-session.ts:1085" {2,5-6,12}
private async _runAgentPrompt(messages: AgentMessage | AgentMessage[]): Promise<void> {
  this._isAgentRunActive = true;                    // isStreaming 从这里开始为真
  try {
    await this.agent.prompt(messages);
    while (await this._handlePostAgentRun()) {      // L2 循环
      await this.agent.continue();                  // 从当前 transcript 接着跑
    }
  } finally {
    this._systemPromptOverride = undefined;
    this._flushPendingBashMessages();
    this._flushPendingCustomMessages();
    await this._emitAgentSettled();                 // 到这里才真的 idle
  }
}
```

`_handlePostAgentRun`（`packages/coding-agent/src/core/agent-session.ts:1100`）按固定顺序问三个问题：

1. **上一条 assistant 是可重试错误吗？** 是就退避、把错误消息从状态里摘掉、返回 true
2. **需要压缩吗？** `_checkCompaction` 判定溢出或超阈值就压缩，然后决定要不要重跑
3. **队列里还有消息吗？** 循环层在发 `agent_end` 之前已经排空过两个队列，所以这里剩下的只可能是 **`agent_end` 事件处理器自己塞进去的**

第三条的注释写得很直白：

> The agent loop drains both queues before emitting agent_end. Any messages here were queued by agent_end extension handlers and need a continuation.

一个扩展在 `agent_end` 里调 `pi.sendMessage()`，消息进队列时循环已经准备退出了。L2 这一圈就是为它准备的。

顺带一提，这也是 L2 唯一可能变成死循环的地方：扩展每次在 `agent_end` 里再塞一条消息，L2 就会一直转下去。这里同样没有计数器。

### 所以界面该听哪个事件

`agent_end` 之后还可能有：自动重试、压缩后重跑、队列续跑。用它关 loading 会出现"转圈停了但字还在冒"。

正确的终点是 `agent_settled`：

```typescript title="packages/coding-agent/src/core/agent-session.ts:609" {2,4-5}
private async _emitAgentSettled(): Promise<void> {
  this._isAgentRunActive = false;                              // isStreaming 到这里才变假
  try {
    await this._extensionRunner.emit({ type: "agent_settled" });  // 先给扩展
    this._emit({ type: "agent_settled" });                        // 再给界面
  } finally {
    this._resolveIdleWaitIfIdle();                                // 最后解开 waitForIdle
  }
}
```

`AgentSession` 还在 `agent_end` 事件上挂了一个 `willRetry` 字段（`packages/coding-agent/src/core/agent-session.ts:705`），提前告诉订阅者"这次结束不是真结束"。想在 `agent_end` 上做事，先看这个标志。

## 十、边界：这套循环解决不了什么

**没有轮数、时长、成本的硬上限。** 无人值守场景必须自己实现 `shouldStopAfterTurn`。

**`terminate` 的全体一致规则太严。** 模型只要在同一条消息里多带一个工具调用，终止意图就失效。要可靠地"调用即结束"，得在扩展的 `tool_call` 里 `block` 掉其他调用，或者干脆只暴露一个工具。

**Abort 不保证立即生效。** 已启动的并行工具必须等它自己结束。工具的中止响应质量完全取决于工具作者。

**回调 throw 会撕破事件序列。** `Agent` 层能补齐四个事件，但补不回半个 turn 的一致性。这条契约靠 JSDoc 维持，类型系统不管。

**没有"这一轮重来"的能力。** 重试的粒度是整个 assistant turn（把消息从状态里摘掉重发），不是"重放某个工具调用"。可重放执行是新一代 harness 的设计目标：记录日志的校验（`packages/agent/src/harness/reducer.ts:312` 的 `validateRecordLog`）和会话存储层都已实现，还配了一致性测试套件。没实现的是编排器的方法体，调用会抛 `HarnessNotImplemented`（`packages/agent/src/harness/agent-harness.ts:233`）。细节见第 07 章。

**并行工具的事件顺序是隐式契约。** `tool_execution_end` 按完成顺序发，工具结果消息按模型给出的顺序发。这件事只写在 `toolExecution` 字段的 JSDoc 里（`packages/agent/src/types.ts:268`），类型系统管不住（第 04 章）。

## 十一、未验证与推断

- ✅ 六个出口的位置与条件、三层循环的分工、队列轮询的三个点、`terminate` 的全体一致规则、三层重试的预算来源，均读源码得出并经 `check:refs` 校验
- ✅ "生产代码没有轮数上限"经全仓 grep 确认，命中项只有测试文件
- ⚠️ "扩展在 `agent_end` 里持续塞消息会让 L2 无限转"是从代码推的，未构造扩展实测
- ⚠️ 抢救解析器产出"校验通过但内容残缺"的具体案例来自源码注释，未自行复现
- ❌ 未实测 abort 之后并行工具的实际残留时长
- ❌ 未实测三层重试同时触发时的总耗时上界

## 十二、本章小结

- 循环有三层：交互主循环 / 运行后重跑循环 / Agent Loop，"防死循环"要先问是哪一层
- Agent Loop 内层的条件只有两项：模型还想调工具，或有排队消息。**没有计数器**
- 六个出口：错误中止 / 自然结束 / `shouldStopAfterTurn` / 批次 `terminate` / 抛异常 / follow-up 续跑
- `stopReason === "length"` 时整批工具调用作废，因为抢救解析器可能产出"校验通过但内容残缺"的参数
- Steering 轮询两次（循环入口 + 每轮结束），follow-up 只在内层退出后轮询一次
- `terminate` 要求整批一致，且没有内置工具会设置它；`shouldStopAfterTurn` 产品层根本没接
- Pi 明确选择"人在环里"作为终止兜底。无人值守场景这个假设失效，得自己补
- 三层重试用两个正则做错误分类，黑名单（配额/账单）在白名单（限流/网络）之前
- `agent.abort()` 是请求中止不是立即中止；界面该听 `agent_settled` 而不是 `agent_end`

<details>
<summary>本章源码索引</summary>

| 符号 | 位置 |
|---|---|
| `runLoop` | `packages/agent/src/agent-loop.ts:155` |
| 外层 `while (true)` | `packages/agent/src/agent-loop.ts:170` |
| 出口 ①（error/aborted） | `packages/agent/src/agent-loop.ts:196` |
| `hasMoreToolCalls` 赋值 | `packages/agent/src/agent-loop.ts:206` |
| 出口 ③（`shouldStopAfterTurn`） | `packages/agent/src/agent-loop.ts:247` |
| steering 轮询 | `packages/agent/src/agent-loop.ts:167`、`packages/agent/src/agent-loop.ts:259` |
| follow-up 轮询 | `packages/agent/src/agent-loop.ts:263` |
| `failToolCallsFromTruncatedMessage` | `packages/agent/src/agent-loop.ts:381` |
| `shouldTerminateToolBatch` | `packages/agent/src/agent-loop.ts:582` |
| `PendingMessageQueue` | `packages/agent/src/agent.ts:125` |
| `Agent.abort` | `packages/agent/src/agent.ts:319` |
| `Agent.continue` | `packages/agent/src/agent.ts:361` |
| `handleRunFailure` | `packages/agent/src/agent.ts:511` |
| `StopReason` | `packages/ai/src/types.ts:405` |
| `isRetryableAssistantError` | `packages/ai/src/utils/retry.ts:223` |
| `retryAssistantCall` | `packages/ai/src/utils/retry.ts:163` |
| `retryProviderRequest` | `packages/ai/src/utils/provider-retry.ts:105` |
| `_runAgentPrompt` | `packages/coding-agent/src/core/agent-session.ts:1085` |
| `_handlePostAgentRun` | `packages/coding-agent/src/core/agent-session.ts:1100` |
| `_prepareRetry` | `packages/coding-agent/src/core/agent-session.ts:2866` |
| `_emitAgentSettled` | `packages/coding-agent/src/core/agent-session.ts:609` |
| `_willRetryAfterAgentEnd` | `packages/coding-agent/src/core/agent-session.ts:705` |
| `AgentSession.abort` | `packages/coding-agent/src/core/agent-session.ts:1599` |
| `restoreQueuedMessagesToEditor` | `packages/coding-agent/src/modes/interactive/interactive-mode.ts:4357` |

</details>

## 下一步

→ **04 工具系统** — 循环把参数交给工具之前，要过 `prepareArguments` 和 JSON Schema 校验两道；交出去之后，输出要截断、路径要检查。模型吐错 JSON 的时候，这套东西在哪一环兜住。
