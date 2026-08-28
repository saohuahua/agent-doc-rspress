---
title: 03.1 循环怎么转
description: 内外两层的代码、六个出口的细节、length 的特殊处理，以及两个队列的三个轮询点
---

# 03.1 循环怎么转

[← 回到 03 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

总览给了六个出口的结论，这一页给证据。

## 一、内外两层

**文件**：`packages/agent/src/agent-loop.ts:155`

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

两层的分工：**内层被工具调用驱动，外层被 follow-up 队列驱动**。内层转完一圈发现模型不再要工具了，就掉到外层；外层看队列里有没有排队任务，有就把它塞回内层再来一遍。

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

先归零再按需置真，是这段代码里最省事的写法：**没有工具调用这条路径不需要任何额外判断**，天然就是终止。

## 二、出口 ③：`shouldStopAfterTurn` 在现役产品里没人用

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

## 三、出口 ⑤：回调抛异常会撕破事件序列

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

它**手工补齐了四个事件**，让订阅者看到的序列仍然是完整的。

### 异常兜底的取舍

换来的是一个值得学的兜底模式：**事件流是对外契约，异常路径也必须遵守它**。UI 不需要为"异常"写一套单独的分支。

代价是这条 assistant 消息是伪造的（没有 usage、没有内容、没有对应的请求），而且补齐只发生在 `Agent` 这一层——如果异常发生在半个 turn 中间（比如工具执行完了、`turn_end` 还没发），订阅者会先收到半截真事件，再收到一整套假事件。类型系统对此毫无约束。

## 四、`stopReason` 分支：`length` 为什么要特殊处理

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

举个具体的：

```text
模型想写:  {"path": "src/api.ts", "content": "……三千行……"}
被截断成:  {"path": "src/api.ts", "content": "……一千五百行
抢救成:    {"path": "src/api.ts", "content": "……一千五百行"}
             ↑ 语法合法 · schema 通过 · 执行下去就是写了半个文件
```

Pi 的处理是一刀切：`stopReason === "length"` 时整批工具调用全部作废，每个都回填一条错误结果，告诉模型"你被截断了，重发完整参数"。注意 `terminate` 返回的是 `false`，所以循环继续——模型有机会重来一次。

### 截断工具调用整批作废的取舍

换来的是永远不会执行残缺参数。

代价是一次浪费：整批调用都白算了 token，包括那些其实完整的。判断粒度是消息级不是调用级，因为无法可靠地知道截断发生在第几个调用上。

## 五、Steering 与 Follow-up：两个队列，三个轮询点

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

- **Steering 在两个点被轮询**：循环开始前（167 行）和每个 turn 结束后（259 行）。开始前那次是为了捡起"用户在等待期间敲的字"
- **Follow-up 只在内层退出后被轮询**（263 行）。它的语义是"等你把手上的事全干完了再看这个"

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

### 一个容易被忽略的重复消费问题

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

"队列被两个地方轮询"是队列 + 循环组合里最容易出的 bug。Pi 用一个一次性布尔标志解决，不优雅但有效。

## 六、小结

- 内层被工具调用驱动，外层被 follow-up 队列驱动
- `hasMoreToolCalls` 先归零再按需置真，让"没有工具调用"天然成为终止路径
- `shouldStopAfterTurn` 是留给 SDK 的口子，产品层从来没接
- 回调 throw 时 `Agent` 手工补齐四个事件，保证事件流契约，但补不回半个 turn 的一致性
- `length` 触发整批作废，因为抢救解析器可能产出"合法但残缺"的参数
- Steering 轮询两次、follow-up 轮询一次；重复消费靠一个一次性布尔标志避开

<details>
<summary>本页源码索引</summary>

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
| `PendingMessageQueue` | `packages/agent/src/agent.ts:125` |
| `Agent.continue` | `packages/agent/src/agent.ts:361` |
| `handleRunFailure` | `packages/agent/src/agent.ts:511` |
| `StopReason` | `packages/ai/src/types.ts:405` |

</details>

## 下一步

→ [03.2 怎么停下来](./termination) — 防死循环的机制清单、三层重试、Abort 的观察点，以及 `agent_end` 之后还会发生什么。
