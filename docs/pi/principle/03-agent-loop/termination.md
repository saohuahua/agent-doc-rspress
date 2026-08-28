---
title: 03.2 停止、续跑与无人值守预算
description: Abort 为什么是协作式的、agent_end 之后还会发生什么、四类预算怎么补，以及排障决策树
---

# 03.2 停止、续跑与无人值守预算

[← 回到 03 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

[上一页](./loop)讲的是循环内部怎么转。这一页讲循环之外：怎么让它停、停了为什么还会继续、以及无人值守时该自己加什么。

## 一、Abort 信号怎么传播

用户按 Esc，信号从界面一路传到工具：

```text
  Esc 键
    │
    ▼
  restoreQueuedMessagesToEditor({ abort: true })    interactive-mode.ts:4357
    │  先把排队的消息倒回输入框，再中止 —— 顺序不能反，
    │  clearAllQueues() 之后队列内容就没了
    ▼
  agent.abort()                                     agent.ts:319
    │
    ▼
  activeRun.abortController.abort()
    │
    ├─► streamFn(model, ctx, { signal })      provider SDK 中断 HTTP
    ├─► tool.execute(id, args, signal, …)     交给工具自己决定
    └─► runLoop 内部的 signal?.aborted 检查    阻止后续调用启动
```

第三条只出现在工具执行路径上，一共五处。典型的一处是在 `beforeToolCall` 返回之后再查一次：

```typescript title="packages/agent/src/agent-loop.ts:629" {1}
if (signal?.aborted) {                              // beforeToolCall 之后再查一次
  return {
    kind: "immediate",
    result: createErrorToolResult("Operation aborted"),
    isError: true,
  };
}
```

之所以前后各查一次，是因为 `beforeToolCall` 本身可能很慢——扩展可能弹了个确认框等用户点。串行模式下每执行完一个工具查一次然后 `break`，并行模式下每准备完一个查一次然后 `break`。

## 二、为什么 Abort 不是硬终止

`break` 只能阻止**还没启动**的工具。已经进入 `Promise.all` 的那些必须等它们自己结束：

```typescript title="packages/agent/src/agent-loop.ts:540" {2}
const orderedFinalizedCalls = await Promise.all(
  finalizedCalls.map((entry) => (typeof entry === "function" ? entry() : Promise.resolve(entry))),
);
```

贯穿场景里那个"测试命令跑了十分钟没返回"就撞在这里。`bash npm test` 已经 spawn 出去了，abort 之后循环仍然会 await 它。

能不能被真的杀掉，取决于工具自己：

| 工具 | 对 signal 的处理 | abort 后的表现 |
|---|---|---|
| 内置 `bash` | 监听 abort，`killProcessTree` 杀整棵进程树 | 很快返回 |
| 内置 `edit` / `write` | 每个 await 之后检查 `signal.aborted` | 当前文件操作做完就返回 |
| 第三方工具里的 `await fetch(url)` 未传 signal | 无 | 等它自己超时 |

所以 `agent.abort()` 的语义是"请求中止"，不是"立即中止"。`AgentSession.abort()`（`packages/coding-agent/src/core/agent-session.ts:1599`）因此写成三步：

```typescript title="packages/coding-agent/src/core/agent-session.ts:1599" {2-4}
async abort(): Promise<void> {
  this.abortRetry();          // 先打断重试退避里的 sleep
  this.agent.abort();         // 再中止运行
  await this.waitForIdle();   // 然后等，等到真的 idle
}
```

第三步是必要的：不等的话，你以为已经停了，实际后台还有工具在跑、还会往会话里写消息。

## 三、`agent_end` 之后还会发生什么

L1 发完 `agent_end` 就退出了，但产品层可能立刻让它再跑一次：

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

**① 上一条 assistant 是可重试错误吗** —— 是就退避、把错误消息从状态里摘掉、返回 true 让 L2 重跑。贯穿场景里"provider 返回可重试错误"走这条。

**② 需要压缩吗** —— `_checkCompaction` 判定溢出或超阈值就压缩，然后决定要不要重跑。这里有个上限：`_overflowRecoveryAttempted` 保证"压缩完再试一次"只做一次，还溢出就报错终止。

**③ 队列里还有消息吗** —— L1 在发 `agent_end` 之前已经排空过两个队列，所以这里剩下的只可能是 `agent_end` 事件处理器自己塞进去的。源码注释写得很直白：

> The agent loop drains both queues before emitting agent_end. Any messages here were queued by agent_end extension handlers and need a continuation.

一个扩展在 `agent_end` 里调 `pi.sendMessage()`，消息进队列时 L1 已经准备退出了，L2 这一圈就是为它准备的。

顺带一提，这也是 L2 唯一可能一直转下去的地方：扩展每次都在 `agent_end` 里再塞一条，L2 就会持续续跑。这里同样没有计数器。

## 四、为什么应该观察 `agent_settled`

`agent_end` 之后还可能有自动重试、压缩重跑、队列续跑。用它关 loading 会出现"转圈停了但字还在往外冒"。

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

三个"结束"信号的用途：

| 信号 | 含义 | 适合拿它做什么 |
|---|---|---|
| `agent_end` | L1 不再发事件 | 记录本次运行产生了哪些消息 |
| `agent_end` 的 `willRetry` | 产品层已知道马上还要重跑 | 决定要不要提前收起 UI |
| `agent_settled` | 产品层不会自动继续 | 关 loading、解锁输入框 |

`willRetry` 的计算在 `_willRetryAfterAgentEnd`（`packages/coding-agent/src/core/agent-session.ts:705`）。

### 三层重试

上面 ① 提到的重试，实际分布在三层，各有各的预算：

| 层 | 实现 | 预算来源 | 重试什么 |
|---|---|---|---|
| provider SDK | `retryProviderRequest`（`packages/ai/src/utils/provider-retry.ts:105`） | settings.retry.provider.maxRetries | 单次 HTTP 请求 |
| 摘要调用 | `retryAssistantCall`（`packages/ai/src/utils/retry.ts:163`） | `settings.retry` | 压缩与分支摘要的 LLM 调用 |
| agent 轮次 | `_prepareRetry`（`packages/coding-agent/src/core/agent-session.ts:2866`） | `settings.retry`，默认 3 次 / 2s 起 | 整个 assistant turn |

三层都用指数退避 `baseDelayMs * 2^(attempt-1)`，都能被 abort 打断。

判断"能不能重试"靠 `isRetryableAssistantError`（`packages/ai/src/utils/retry.ts:223`），实现是两个正则：

```typescript title="packages/ai/src/utils/retry.ts:223" {4-5}
export function isRetryableAssistantError(message: AssistantMessage): boolean {
  if (message.stopReason !== "error" || !message.errorMessage) return false;
  const errorMessage = message.errorMessage;
  if (NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN.test(errorMessage)) return false;  // 黑名单
  return RETRYABLE_PROVIDER_ERROR_PATTERN.test(errorMessage);                       // 白名单
}
```

| | 命中示例 | 判断依据 |
|---|---|---|
| 黑名单（不重试） | `insufficient_quota`、`quota exceeded`、`billing` | 确定性失败，重试没有意义 |
| 白名单（重试） | `429` `500` `503` `overloaded` `socket hang up` | 瞬时故障，下次可能成功 |
| 都不命中 | 其他错误 | 不重试，避免把未知错误当成瞬时的 |

用字符串匹配做分类，换来的是"加一家 provider 的怪异错误只要加一行"；代价是上游改文案就会漏判。30 多家 provider 的错误结构各不相同，有的连状态码都埋在 JSON 文本里，这里选了成本最低的做法。

## 五、无人值守要自己补的四类预算

到这里可以给出一个明确结论：**Pi 默认没有 turn、time、token、cost 的硬上限。** 交互式使用时，停下来的兜底是人；跑在 CI 或后台时这个兜底不存在。

下面是一个方向明确的最小实现，同时体现 turn 和 time 两层：

```typescript title="教学示例，非 Pi 源码" {4,8,12}
let turns = 0;

const agent = new Agent({
  shouldStopAfterTurn: () => ++turns >= 20,   // turn 预算：每轮结束后检查一次
  // model、tools、streamFn 等配置省略
});

const timeout = setTimeout(() => agent.abort(), 10 * 60_000);   // time 预算：请求协作式中止

try {
  await agent.prompt("修复 src/api.ts 的类型错误，并运行测试");
  await agent.waitForIdle();                                     // 等真的 idle，不是等 prompt 返回
} finally {
  clearTimeout(timeout);
}
```

关于这四类预算，有几点必须说清楚：

- **turn 预算只能在轮末检查。** `shouldStopAfterTurn` 的调用点在 `turn_end` 之后，当前这次模型回复和它的工具批次一定会跑完。它不能中断进行中的一轮
- **time 预算走的是 Abort。** 也就是协作式中止，受 §二 的全部限制约束
- **token 预算要从 assistant usage 累计。** `shouldStopAfterTurn` 的上下文里带着本轮的 `message`，从 `message.usage.totalTokens` 累加即可。注意它跟单次请求的 `maxTokens` 不是一回事——后者限制的是一次回复的输出长度
- **cost 预算需要自己按模型价格算。** `usage.cost.total` 里有本轮的金额，Pi 不会在总额超标时自己停
- **工具忽略 signal 时，`agent.abort()` 仍可能迟迟不返回。** 这是上面 time 预算的直接限制
- **真正的硬停止只能来自外部。** 宿主进程 timeout、worker 终止、容器资源限制、CI 的 job timeout——这些是唯一不依赖被中止方配合的手段

把 token 和 cost 也加上，`shouldStopAfterTurn` 大致是这个形状：

```typescript title="教学示例，非 Pi 源码" {3-4,6-8}
let turns = 0, tokens = 0, cost = 0;

shouldStopAfterTurn: ({ message }) => {
  if (message.role !== "assistant") return false;
  tokens += message.usage.totalTokens;
  cost += message.usage.cost.total;
  return ++turns >= 20 || tokens >= 500_000 || cost >= 5;
}
```

### 为什么进程级 watchdog 仍然必要

前面四类预算全部依赖"循环还在正常推进"这个前提。一旦工具卡死在一个不响应 signal 的 `await` 上，`shouldStopAfterTurn` 根本不会被调用，`agent.abort()` 也等不到返回——此时进程里没有任何一段代码有机会执行你的预算逻辑。

因此在无人值守场景下，应用层预算和进程级 watchdog 是两件事，都要有：前者负责在正常路径上省钱和防跑偏，后者负责在异常路径上保证一定会结束。

## 六、排障决策树

贯穿场景里"Agent 看起来没有停"，先按这棵树分流：

```text
Agent 看起来没有停
  │
  ├─ 仍持续出现 turn_end？
  │    ├─ 是：模型仍在请求工具 → 查是否重复调用同一工具、有没有 turn 预算
  │    └─ 否：继续往下
  │
  ├─ 卡在 tool_execution_start？
  │    └─ 工具没返回 → 查该工具是否响应 signal、子进程是否还活着、
  │                    第三方工具有没有自己的超时
  │
  ├─ 已经出现 agent_end，随后又有 agent_start？
  │    └─ 查三处：自动重试、压缩后重跑、agent_end handler 往队列塞消息
  │
  └─ 后台已经结束但 UI 仍未恢复？
       └─ 查是不是在等 agent_end 而不是 agent_settled / waitForIdle
```

四个分支分别对应四个不同的层：模型决策、工具实现、Session 续跑、界面订阅。走错分支会在错误的层里翻代码。

## 七、验证矩阵

自己实现类似机制时，下面这些用例值得覆盖：

| # | 用例 | 期望 |
|---|---|---|
| 1 | 模型不调用工具 | 一轮后自然结束 |
| 2 | 一次工具调用后收工 | 两轮后结束 |
| 3 | Steering 入队 | 在下一次模型请求之前注入 |
| 4 | Follow-up 入队 | 当前任务全部结束后才注入 |
| 5 | turn 预算到上限 | 当前轮跑完后停止，不中断进行中的一轮 |
| 6 | provider 请求期间触发 timeout | 走 abort 路径，产生 `stopReason: "aborted"` |
| 7 | 内置 bash 执行期间 abort | 子进程被杀，较快返回 |
| 8 | 第三方工具忽略 signal | 验证仅靠 abort 不构成硬上限 |
| 9 | 自动重试后 | 只在最终状态发出一次 `agent_settled` |
| 10 | `agent_end` handler 持续排队 | Session 层持续续跑，确认这是设计行为而非 bug |

第 8 和第 10 条是最容易被跳过的两条，它们恰好对应本页两个核心结论。

## 八、小结

- Abort 沿着请求、工具、循环三条路传播，但对已启动的工具只能等
- 真正兜住无限循环的只有三样：Abort（受工具配合限制）、上下文窗口、成本；前两样都不是硬上限
- `agent_end` 之后 Session 层会按顺序检查重试、压缩、队列，三者都可能让它再跑一次
- 界面应该观察 `agent_settled`，SDK 调用方应该 `await waitForIdle()`
- 三层重试各有预算，错误分类靠两个正则，黑名单在白名单之前
- 无人值守要自己补 turn / time / token / cost 四类预算，并且仍然需要进程级 watchdog

:::details 补充：`terminate` 为什么算不上防死循环机制

```typescript title="packages/agent/src/agent-loop.ts:582" {2}
function shouldTerminateToolBatch(finalizedCalls: FinalizedToolCallOutcome[]): boolean {
  // every()：只要有一个工具结果没说要停，整批就不停
  return finalizedCalls.length > 0 && finalizedCalls.every((finalized) => finalized.result.terminate === true);
}
```

要求整批工具结果全部为 true。模型在同一条消息里发了 `read` 加上你的终止工具，`read` 没有 `terminate`，整批就不终止。

而且没有任何内置工具会设置它——`packages/coding-agent/src/core/tools/` 里一处都没有。它是给扩展用的，官方把它描述为 `terminate`（`packages/coding-agent/docs/extensions.md:1999`），典型场景是“结构化输出工具调用即结束”。想可靠地实现这个语义，得在扩展的 tool_call 钩子里阻断其他调用，或者只暴露一个工具。

`shouldStopAfterTurn` 的情况类似：搜遍 `coding-agent` 全包，它只出现在类型定义和 `Agent` 的转发里，产品层没有设置过它。它是留给 SDK 使用方的口子，用法见 §五。

:::

:::details 本页源码索引

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

:::

## 下一步

→ [04 工具怎么被安全地执行](../04-tool-system/) — 循环把参数交给工具之前和之后各有哪些兜底，以及被 token 上限截断的那批工具调用为什么必须整批作废。
