---
title: 03 Agent 如何持续工作并最终停止
description: 从最小 while 循环演进到 Pi 的生产循环，以及 agent_end 为什么不等于结束
---

# 03 Agent 如何持续工作并最终停止

以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准。本章所有 `file:line` 经 `pnpm check:refs` 校验，代码块里的中文注释为本文补充。

## 贯穿场景

接着[第 02 章](../02-message-journey/)的那条消息，模型现在拿到了任务：

```text
修复 src/api.ts 的类型错误，并运行测试确认修复结果。
```

正常路径是：读文件 → 改代码 → 跑测试 → 看结果决定继续还是收工。本章要处理的是路径不正常的四种情况：

- 模型反复读同一个文件，看起来停不下来
- 测试命令跑了十分钟没返回
- provider 返回了一个可重试的错误
- `agent_end` 已经发出来了，界面却发现字还在往外冒

## 一、最小循环是怎么长成 Pi 的

最小循环你已经写过（[Learn 06](/learn/06-multi-turn)）：

```typescript title="教学示例，非 Pi 源码" {2,5}
while (true) {
  const response = await callModel(messages);
  if (!response.toolCalls.length) break;          // 没有工具调用就收工

  const results = await executeTools(response.toolCalls);
  messages.push(response, ...results);
}
```

它能跑通，但每一条生产需求都会往上加一层：

```text
  最小 Agent Loop
  while (true): 模型回复 → 执行工具 → 回填结果
       │
       ├─ 模型正常完成
       │    没有 tool call → 退出，这条路径本来就成立
       │
       ├─ Provider 或回调出错
       │    → error / aborted 提前退出；回调 throw 由 Agent 补事件兜底
       │
       ├─ 用户要求停止
       │    → AbortSignal 沿着请求和工具往下传，阻止后续调用启动
       │
       ├─ 用户中途补充任务
       │    → Steering 插当前轮之后、Follow-up 等全部结束后
       │      两个队列把单层 while 撑成内外双层
       │
       ├─ Agent Loop 结束后仍需继续
       │    → Session 层判断要不要 retry / 压缩后重跑 / 消化队列
       │
       └─ 无人值守运行需要硬预算
            → Pi 默认没有；turn / time / token / cost 要自己加
              最终兜底仍然依赖宿主进程或容器
```

**阅读路线**：先看清楚"哪些机制在循环里、哪些在循环外"。循环里的部分（正常结束、错误、中止、两个队列）在 [03.1](./loop)；循环外的部分（Session 续跑、预算、排障）在 [03.2](./termination)。本章不会给出一个"Pi 自带的防死循环开关"，因为它没有。

## 二、最终的生命周期

```text
  prompt
    ↓
  Agent Loop ── turn 1 ── turn 2 ── ... ── agent_end
    ↑                                        │
    └──── Session retry / compaction ────────┘
          / queued continuation
                                             │
                                             ▼
                                       agent_settled
```

三件事需要先说清楚：

- **`agent_end` 只表示一次底层 Agent Loop 结束**，不表示产品层不会再启动新的一次
- **`agent_settled` 才表示产品层不会自动继续**，界面应该以它为准
- **Pi 默认没有 turn、time、token、cost 的不可绕过硬上限**，交互式使用靠人盯着，无人值守要自己补

## 三、三层循环

按上面的生命周期展开，Pi 里实际有三层 `while`，各管一件事：

```text
┌────────────────────────────────────────────────────────────────────────┐
│ L3  交互主循环         interactive-mode.ts:1176                          │
│     while (true) { userInput = await getUserInput(); session.prompt() } │
│     管的是：等人说话                                                      │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ 一条用户消息
┌──────────────────────────────▼─────────────────────────────────────────┐
│ L2  运行后重跑循环      agent-session.ts:1085  _runAgentPrompt            │
│     while (await this._handlePostAgentRun()) await agent.continue();   │
│     管的是：Agent Loop 停下来之后，要不要让它再跑一次                       │
│       ① 可重试错误  ② 上下文溢出  ③ agent_end handler 塞进来的消息         │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ agentLoop(...)
┌──────────────────────────────▼─────────────────────────────────────────┐
│ L1  Agent Loop         agent-loop.ts:155  runLoop                       │
│     外层 while：follow-up 队列非空就再来一圈                               │
│       内层 while：模型还想调工具、或有排队消息                              │
│     管的是：模型还想调工具就继续给它调                                      │
└────────────────────────────────────────────────────────────────────────┘
```

被问到"死循环怎么防"，先确认问的是哪一层——L1 转不停和 L2 转不停，排查方向完全不同。

## 四、控制流结果

L1 的退出路径可以按"对循环意味着什么"分成四类，而不是拉成一张并列清单：

**真正终止**

| 情况 | 触发条件 | 位置 |
|---|---|---|
| 自然结束 | 本轮没有工具调用，两个队列也空 | `agent-loop.ts:271` |
| 错误或中止 | `stopReason` 是 `error` 或 `aborted` | `agent-loop.ts:196` |
| 主动停止 | `shouldStopAfterTurn` 返回 true | `agent-loop.ts:247` |

**改变下一轮的条件**

| 情况 | 触发条件 | 位置 |
|---|---|---|
| 批次终止 | 整批工具结果都设了 `terminate` | `agent-loop.ts:216` |

它不直接退出，而是把 `hasMoreToolCalls` 置假，让内层条件自然不成立，最终走"自然结束"。

**继续运行**

| 情况 | 触发条件 | 位置 |
|---|---|---|
| Steering | 每轮结束时队列非空 | `agent-loop.ts:259` |
| Follow-up | 内层退出后队列非空 | `agent-loop.ts:263` |

**循环外的异常兜底**

回调违反 "must not throw" 契约时，异常会冒到 `Agent` 的 `handleRunFailure`（`packages/agent/src/agent.ts:511`），由它合成一条消息并补齐四个事件。这条路径严格说不在循环里，放进同一张表会混淆抽象层级。

→ 逐项展开见 [03.1 从最小循环到生产循环](./loop)

## 五、Pi 已解决和未解决的

### 已经处理的

- 模型不再要求调工具时自然退出，不需要额外判断
- provider 错误、用户中止各有明确的退出路径和事件序列
- 用户中途插话与排队后续任务，被拆成语义不同的两个队列
- Agent Loop 结束后的自动重试、压缩重跑、队列续跑，统一收在 Session 层，对界面只暴露一个 `agent_settled`

### 没有处理的

- **没有 turn / time / token / cost 的默认硬上限。** 无人值守场景要自己实现，做法见 [03.2 §五](./termination)
- **Abort 是协作式的。** 已经启动的工具必须自己响应 signal，否则 `agent.abort()` 不能让它立刻停
- **`terminate` 要求整批一致。** 模型在同一条消息里多带一个工具调用，终止意图就失效
- **回调 throw 只能补事件，补不回一致性。** 异常发生在半个 turn 中间时，订阅者会先收到半截真事件再收到一整套合成事件
- **没有"重放某个工具调用"的能力。** 重试粒度是整个 assistant turn。可重放执行是新一代 harness 的设计目标：记录日志的校验（`packages/agent/src/harness/reducer.ts:312` 的 `validateRecordLog`）和会话存储层都已实现，没实现的是编排器方法体，调用会抛 `HarnessNotImplemented`（`packages/agent/src/harness/agent-harness.ts:233`），细节见第 07 章
- **并行工具的事件顺序是隐式契约。** 只写在 `toolExecution` 字段的 JSDoc 里（`packages/agent/src/types.ts:268`），类型系统约束不了（[第 04 章](../04-tool-system/execution)）

## 六、本章导航

- [03.1 从最小循环到生产循环](./loop) —— 一轮的定义、自然结束、Steering、Follow-up 与内外双层结构
- [03.2 停止、续跑与无人值守预算](./termination) —— Abort 的传播与局限、Session 续跑、四类预算的写法、排障决策树与验证矩阵

## 七、未验证与推断

- ✅ 三层循环的分工、四类控制流结果的位置与条件、队列轮询的三个点，均读源码得出并经 `check:refs` 校验
- ✅ "生产代码没有轮数上限"经全仓 grep 确认，命中项只在测试文件里
- ⚠️ "扩展在 `agent_end` 里持续塞消息会让 L2 一直转"是从代码推的，未构造扩展实测
- ❌ 未实测 abort 之后并行工具的实际残留时长
- ❌ 未实测三层重试同时触发时的总耗时上界

## 八、小结

- 最小循环的每一条生产需求都对应一层新增结构，Pi 的双层循环是这些需求叠加的结果
- L1 管"模型还要不要调工具"，L2 管"停了要不要再跑一次"，L3 管"人还有没有别的要求"
- L1 的退出路径分四类：真正终止、改变下一轮条件、继续运行、循环外兜底
- `agent_end` 表示底层循环结束，`agent_settled` 才表示产品层不再自动继续
- Pi 默认不提供硬预算，交互式靠人、无人值守靠你自己加

:::details 面试对应（§12 编号）

- **#1 AI Coding 整体的实现思路是什么** —— 用"最小循环 + 五层生产需求"讲演进，比背三层结构更容易展开
- **#2 怎么保证执行过程中的准确性和可靠性** —— 四类控制流结果、三层重试、协作式中止的边界

:::

## 下一步

→ [03.1 从最小循环到生产循环](./loop)
