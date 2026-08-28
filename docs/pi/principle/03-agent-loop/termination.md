---
title: 03.2 怎么停下来
description: 防死循环的机制清单、三层重试、Abort 的观察点与晚到结果，以及 agent_end 之后还会发生什么
---

# 03.2 怎么停下来

[← 回到 03 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

[上一页](./loop)讲的是循环怎么转。这一页讲反面：它怎么停、什么时候停不下来、以及"停了"到底算不算停。

## 一、防死循环：哪些兜得住

### 兜得住的

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

**`shouldStopAfterTurn`。** [上一页](./loop)说过，产品层没接。SDK 使用方要自己写。

**轮数上限。** 不存在。全仓搜 maxTurns / maxSteps / maxIterations，命中项只有测试文件里的常量 `MAX_TURNS`（`packages/coding-agent/test/sdk-codex-cache-probe-tool-loop.ts:67`）。生产代码里没有这个概念。

:::warning 这是一个明确的产品取舍，不是遗漏

Pi 的定位是**交互式终端 agent**：人一直看着屏幕，觉得不对就按 Esc。这个前提下，硬性轮数上限的收益很低（正常任务几十轮很常见），坏处很明确（长任务被无意义地打断）。

但同一套代码也能跑 `--mode json` 和 SDK，在 CI 里无人值守。这时候前提不成立了，而框架没有给出默认保护——**你必须自己实现 `shouldStopAfterTurn`**。

面试里这一点可以拿来讲取舍：说"Pi 没有 maxTurns，因为它假设人在环里；无人值守场景下这个假设失效，得靠 SDK 层的 `shouldStopAfterTurn` 补"，比背一个"有防死循环机制"要好得多。

:::

## 二、三层重试，三套预算

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

黑名单在前，白名单在后：

| | 命中示例 | 为什么这样分 |
|---|---|---|
| 黑名单（不重试） | `insufficient_quota`、`quota exceeded`、`billing`、`Monthly usage limit reached` | 确定性失败，重试只会浪费时间 |
| 白名单（重试） | `429` `500` `503` `overloaded` `socket hang up` `getaddrinfo` | 瞬时故障，下一次有机会成功 |
| 都不命中 | 其他任何错误 | 不重试，避免把未知错误当瞬时的处理 |

### 换来什么 / 代价是什么

用字符串匹配做错误分类，是这份代码里最"不体面"但最务实的一处。30 多家 provider 的错误结构各不相同，有的连 HTTP 状态码都埋在 JSON 文本里。

换来的是加一个 provider 的怪异错误只要加一行字符串。代价是错误文案一变就漏判，完全依赖上游不改文案。这条路是 `compat`「数据优于分支」思路（第 01 章）在错误处理上的延伸。

## 三、Abort：信号从哪进，在哪被观察

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

工具能不能被真的杀掉，取决于工具自己有没有监听 signal。内置 `bash` 会 kill 整个进程树，但一个第三方扩展工具里如果写的是 `await fetch(url)` 而没传 signal，那就得等它超时。

**结论**：`agent.abort()` 是"请求中止"，不是"立即中止"。`AgentSession.abort()`（`packages/coding-agent/src/core/agent-session.ts:1599`）因此是这样写的：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1599" {2-4}
async abort(): Promise<void> {
  this.abortRetry();          // 先打断重试退避的 sleep
  this.agent.abort();         // 再中止运行
  await this.waitForIdle();   // 然后等，等到真的 idle
}
```

三步一步都不能少。

## 四、L2：`agent_end` 之后还会发生什么

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

## 五、所以界面该听哪个事件

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

三个"结束"信号的差别：

| 信号 | 含义 | 该拿它做什么 |
|---|---|---|
| `agent_end` | 循环层不再发事件了 | 记录本次运行产生了哪些消息 |
| `agent_end` 的 `willRetry` | Pi 已经知道马上还要重跑 | 决定要不要提前把 UI 收起来 |
| `agent_settled` | 重试、压缩、队列续跑全部结束 | 关 loading、解锁输入框 |

`AgentSession` 在 `agent_end` 事件上挂 `willRetry` 字段的地方在 `packages/coding-agent/src/core/agent-session.ts:705` 的 `_willRetryAfterAgentEnd`。想在 `agent_end` 上做事，先看这个标志。

## 六、小结

- 真正兜得住无限循环的只有三样：Abort、上下文窗口、钱
- `terminate` 要求整批一致，且没有内置工具设置它；`shouldStopAfterTurn` 产品层没接；轮数上限根本不存在
- Pi 明确假设"人在环里"。`--mode json` 和 SDK 场景下这个假设失效，得自己补
- 三层重试各有预算，错误分类靠两个正则，黑名单（配额/账单）在白名单（限流/网络）之前
- `agent.abort()` 是请求中止不是立即中止，已启动的并行工具必须等它自己结束
- 界面该听 `agent_settled`，不是 `agent_end`

<details>
<summary>本页源码索引</summary>

| 符号 | 位置 |
|---|---|
| `shouldTerminateToolBatch` | `packages/agent/src/agent-loop.ts:582` |
| `signal?.aborted` 检查点 | `packages/agent/src/agent-loop.ts:629` |
| 并行批次 `Promise.all` | `packages/agent/src/agent-loop.ts:540` |
| `Agent.abort` | `packages/agent/src/agent.ts:319` |
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
