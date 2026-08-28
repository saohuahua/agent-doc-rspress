---
title: 03.1 从最小循环到生产循环
description: 一轮的定义、自然结束、Steering 与 Follow-up 如何把单层 while 撑成内外双层
---

# 03.1 从最小循环到生产循环

[← 回到 03 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

这一页从最小循环出发，每一节只加一条生产需求，看循环结构随之变成什么样。

## 一、最小 `while` 为什么能工作

```typescript title="教学示例，非 Pi 源码" {2-3}
while (true) {
  const response = await callModel(messages);
  if (!response.toolCalls.length) break;

  const results = await executeTools(response.toolCalls);
  messages.push(response, ...results);
}
```

它成立的前提只有一条：**模型自己会在"不需要更多信息"的时候停止发出工具调用**。循环的终止条件因此不是计数器，而是模型的一个判断结果。

这个前提在正常任务上相当可靠——模型改完代码、跑完测试、确认通过之后，自然会输出一段总结而不是再调 `read`。它不可靠的地方在于：模型对"够了"的判断可能出错，而循环本身不会怀疑它。贯穿场景里"反复读同一个文件"就是这种情况。

后面所有的结构，本质上都是在这条主线上补充：**除了模型说停，还有谁能让它停，以及停了之后是不是真的停了。**

## 二、一轮是什么

先把 turn 这个词钉住，否则后面的队列时机没法讲。

在 Pi 里，**一轮 = 一次模型回复 + 这次回复里所有工具调用的执行**。不是"一次 HTTP 请求"，也不是"一次用户交互"。

```text
  turn_start
    ├─ message_start / message_update × N / message_end     一次模型回复（流式）
    ├─ tool_execution_start / …_end                         本批工具，可能并行
    └─ 每个工具的结果消息
  turn_end
```

工具执行属于当前轮，不属于下一轮。这个划分决定了 steering 的插入点：它要在"当前轮的工具都跑完之后、下一次模型请求之前"，才既不打断正在做的事，又能影响下一步决策。

## 三、自然结束

Pi 里对应的写法是这样：

```typescript title="packages/agent/src/agent-loop.ts:206" {1,8}
hasMoreToolCalls = false;                          // 先归零：没有工具调用就等于要停
if (toolCalls.length > 0) {
  const executedToolBatch =
    message.stopReason === "length"
      ? await failToolCallsFromTruncatedMessage(toolCalls, emit)   // 截断了，整批作废
      : await executeToolCalls(currentContext, message, config, signal, emit);
  toolResults.push(...executedToolBatch.messages);
  hasMoreToolCalls = !executedToolBatch.terminate;  // 整批都要求终止时才置假
```

先归零再按需置真，让"本轮没有工具调用"天然成为终止路径，不需要额外分支。

这里有两处需要留意，它们都只影响"循环要不要继续"，本身的机制属于别的章：

- **`stopReason === "length"`**：模型输出被 token 上限截断时，这一批工具调用全部作废并回填错误，`terminate` 返回 `false`，所以**循环继续**，模型有机会重发完整参数。为什么必须整批作废，见 [第 04 章](../04-tool-system/)
- **`terminate`**：只有当整批工具结果都设了这个标志，`hasMoreToolCalls` 才置假。它不是一个"立即停"的开关，而是"让下一轮的条件不成立"

## 四、加需求一：用户中途纠正方向

### 问题

用户看到模型在改错文件，想说一句"别动 `src/api.ts`，问题在 `src/types.ts`"。最小循环没有任何位置接收这句话。

### 循环怎么变

在每轮结束后加一次轮询，把取到的消息注入下一轮之前：

```typescript title="教学示例，非 Pi 源码" {6-9}
while (true) {
  const response = await callModel(messages);
  if (!response.toolCalls.length) break;
  const results = await executeTools(response.toolCalls);
  messages.push(response, ...results);

  const steering = drainSteeringQueue();      // ← 新增
  if (steering.length) {
    messages.push(...steering);               // 插在下一次 callModel 之前
  }
}
```

### Pi 的做法

同样的位置，多了一次开局轮询：

```typescript title="packages/agent/src/agent-loop.ts:167" {1,4}
let pendingMessages: AgentMessage[] = (await config.getSteeringMessages?.()) || [];

while (true) {
  let hasMoreToolCalls = true;
  while (hasMoreToolCalls || pendingMessages.length > 0) {   // 排队消息也能驱动内层
```

开局那次（167 行）是为了捡起用户在**上一轮请求发出之后、这一轮循环启动之前**敲的字；每轮结束那次在 259 行。注意内层的循环条件里带了 `pendingMessages.length > 0`——这让"模型本来要停、但用户刚插了话"也能继续转一圈。

## 五、加需求二：用户排后续任务

### 问题

用户想说"改完之后顺便把 README 也更新一下"。这句话不应该打断当前任务，而应该等它彻底做完再开始。

Steering 队列满足不了：它每轮都会被读，插进去就会立刻影响当前任务。

### 循环怎么变

需要第二个队列，读的时机在"内层已经决定要停"之后。这就把单层 `while` 撑成了两层：

```typescript title="教学示例，非 Pi 源码" {1,9-12}
while (true) {                                    // 外层：follow-up 驱动
  while (hasMoreToolCalls || pending.length) {    // 内层：工具调用 + steering 驱动
    // …模型回复、执行工具、轮询 steering…
  }

  const followUps = drainFollowUpQueue();
  if (followUps.length) {
    pending = followUps;
    continue;                                     // 回内层再来一圈
  }
  break;                                          // 两个队列都空，真的结束
}
```

### Pi 的做法

结构一致：

```typescript title="packages/agent/src/agent-loop.ts:262" {2,4-6}
  // Agent would stop here. Check for follow-up messages.
  const followUpMessages = (await config.getFollowUpMessages?.()) || [];
  if (followUpMessages.length > 0) {
    // Set as pending so inner loop processes them
    pendingMessages = followUpMessages;
    continue;
  }
```

于是两个队列的语义差别就落在了"什么时候被读"上：

```text
                    ┌─── 内层 while ───────────────────────────────┐
  循环入口           │                                             │
  ─── poll steering ─┤─► 注入 ─► 请求模型 ─► 执行工具 ─► turn_end ──┤
       (167)        │                                    │        │
                    │                          poll steering (259)│
                    └────────────────────────────────────┴────────┘
                                          │ 内层条件不成立
                                          ▼
                              poll follow-up (263)
                                    有 → 塞回 pending，回内层
                                    无 → break → agent_end
```

排空策略由 `PendingMessageQueue`（`packages/agent/src/agent.ts:125`）决定：

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

两个队列默认都是 `one-at-a-time`（`packages/agent/src/agent.ts:231`）。排三条 follow-up，agent 会跑三次完整的"内层 + 轮询"，而不是把三条塞进同一轮上下文。这让每条任务的上下文更干净，代价是多几次往返。

## 六、加需求三：别把同一条消息消费两次

### 问题

队列被两个地方读，就有重复消费的风险。

Pi 里的具体场景是：`Agent.continue()` 发现最后一条是 assistant 消息时，会先从 steering 队列取一条，用它启动新一轮。但新一轮进入 `runLoop` 之后，167 行的开局轮询会**再读一次同一个队列**。

### Pi 的做法

一个一次性布尔标志：

```typescript title="packages/agent/src/agent.ts:475" {2-5}
getSteeringMessages: async () => {
  if (skipInitialSteeringPoll) {
    skipInitialSteeringPoll = false;       // 只跳过第一次
    return [];
  }
  return this.steeringQueue.drain();
},
```

它在 `Agent.continue()`（`packages/agent/src/agent.ts:361`）走 steering 分支时被置位。没有它，那条消息会进两次上下文，用户看到自己的话被重复了一遍。

### 取舍

用标志位而不是"把开局轮询去掉"，是因为开局轮询本身有用（§四）。这类"同一个队列被多个入口消费"的问题，通用解法是让队列自己保证幂等；Pi 选了更轻的做法，代价是这个标志的正确性依赖调用顺序，改动 `continue()` 时容易破坏。

## 七、小结

- 最小循环成立的前提是"模型自己会停"，后面所有结构都在补充"还有谁能让它停"
- 一轮 = 一次模型回复 + 本批工具执行；这个边界决定了 steering 的插入点
- `hasMoreToolCalls` 先归零再按需置真，让"没有工具调用"天然成为终止路径
- `length` 截断和 `terminate` 都不直接退出，它们只改变下一轮的条件
- Steering 需要每轮轮询，Follow-up 需要"内层退出后"轮询——第二个队列直接导致了外层循环的出现
- 队列被多处消费时，Pi 用一次性标志避开重复注入

:::details 附录：回调抛异常时的兜底

`AgentLoopConfig` 的每个回调的 JSDoc 都写着同一句话：

> Contract: must not throw or reject. Return a safe fallback value instead.

违反了会怎样？`runLoop` 不接异常，一路冒到 `Agent.runWithLifecycle`：

```typescript title="packages/agent/src/agent.ts:511" {2-4,10-13}
private async handleRunFailure(error: unknown, aborted: boolean): Promise<void> {
  const failureMessage = {
    role: "assistant",
    content: [{ type: "text", text: "" }],        // 空内容的合成 assistant 消息
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

它手工补齐四个事件，让订阅者看到的序列仍然完整，UI 不需要为异常写单独分支。

代价有两个：这条 assistant 消息是合成的（没有 usage、没有内容、没有对应请求）；补齐只发生在 `Agent` 这一层，如果异常出现在半个 turn 中间（工具执行完了、`turn_end` 还没发），订阅者会先收到半截真事件，再收到一整套合成事件。这条契约靠 JSDoc 维持，类型系统约束不了。

:::

:::details 本页源码索引

| 符号 | 位置 |
|---|---|
| `runLoop` | `packages/agent/src/agent-loop.ts:155` |
| 开局 steering 轮询 | `packages/agent/src/agent-loop.ts:167` |
| 外层 `while (true)` | `packages/agent/src/agent-loop.ts:170` |
| error/aborted 提前退出 | `packages/agent/src/agent-loop.ts:196` |
| `hasMoreToolCalls` 赋值 | `packages/agent/src/agent-loop.ts:206` |
| `shouldStopAfterTurn` | `packages/agent/src/agent-loop.ts:247` |
| 每轮 steering 轮询 | `packages/agent/src/agent-loop.ts:259` |
| follow-up 轮询 | `packages/agent/src/agent-loop.ts:262` |
| `failToolCallsFromTruncatedMessage` | `packages/agent/src/agent-loop.ts:381` |
| `PendingMessageQueue` | `packages/agent/src/agent.ts:125` |
| `Agent.continue` | `packages/agent/src/agent.ts:361` |
| `handleRunFailure` | `packages/agent/src/agent.ts:511` |
| `StopReason` | `packages/ai/src/types.ts:405` |

:::

## 下一步

→ [03.2 停止、续跑与无人值守预算](./termination) — 循环之外还有谁能让它继续，以及怎么给它加一个真的能停下来的上限。
