---
title: 02.2 从领域消息到 Provider Payload
description: 三层数据结构的边界设计——内部模型为什么更丰富、降级为什么有损、provider 差异为什么推迟到最后
---

# 02.2 从领域消息到 Provider Payload

[← 回到 02 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

[上一页](./gates)结束在 `_runAgentPrompt(messages)`。消息已经组装好了，但它还不能发出去——因为 Pi 手里的消息类型比任何一家 provider 认识的都多。

这一页只讲一件事：**Pi 用了三种数据结构来表示"一次对话"，每一层为什么必须存在。**

## 一、三层结构

```text
  AgentMessage           Pi 的领域模型
    user / assistant / toolResult
    + bashExecution / compactionSummary / branchSummary / custom
         │
         │  transformContext   扩展还能在这一层增删（仍是 AgentMessage）
         │  convertToLlm       把多出来的类型降级
         ▼
  Message                模型层统一协议
    只有 user / assistant / toolResult 三种角色
         │
         │  buildParams        按厂商协议重排字段
         ▼
  Provider Payload       厂商专属请求体
    Anthropic 的 MessageCreateParams / OpenAI 的 ChatCompletionCreateParams / ...
```

三层的分界不是随手划的，每一层都在回答一个不同的问题。

## 二、为什么内部模型要比协议丰富

产品要表达的东西，协议里没有对应角色。

用户敲 `!npm test` 让 Pi 直接跑一条命令；上下文满了 Pi 自己做了一次压缩；扩展往上下文里塞了一段项目状态。这三样东西**都需要被记进会话、被渲染到界面、被模型看见**，但它们既不是用户说的话，也不是模型说的话，更不是工具返回的结果。

如果强行用三种角色表示，会话文件就丢掉了"这条是压缩摘要"这个事实——下次 resume、分支切换、导出 HTML 的时候都还原不出来。所以 Pi 在 `AgentMessage` 里多定义了几种：

| 类型 | 表示什么 | 谁产生 |
|---|---|---|
| `bashExecution` | 用户直接跑的 shell 及其输出 | TUI 的 `!` 前缀 |
| `compactionSummary` | 一次上下文压缩的产物 | 压缩流程（第 06 章） |
| `branchSummary` | 分支切换时的摘要 | 会话树（第 06 章） |
| `custom` | 扩展自定义的上下文块 | 扩展 API |

内部模型丰富，是为了**让会话历史保持可还原**。这一层不受 provider 约束，所以可以按产品需要扩展。

## 三、为什么降级必然有损

`convertToLlm`（`packages/coding-agent/src/core/messages.ts:148`）负责把多出来的类型压平：

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

规律是一致的：**多出来的类型全部降级成 user 消息，语义靠文本里的前后缀标记来保留**。

| Pi 的类型 | 发出去变成 | 语义靠什么保留 |
|---|---|---|
| `bashExecution` | user | 格式化成带命令和输出的文本 |
| `compactionSummary` | user | `COMPACTION_SUMMARY_PREFIX` / `SUFFIX` |
| `branchSummary` | user | `BRANCH_SUMMARY_PREFIX` / `SUFFIX` |
| `custom` | user | 由扩展自己写的文本决定 |
| 标了 `excludeFromContext` | 直接消失 | 返回 `undefined` 被过滤掉 |

有损的原因在于：**接收方是模型，不是解析器**。前后缀只是提示词的一部分，模型可能照做，也可能忽略。降级之后没有任何机制保证模型把 `<compaction-summary>` 当成摘要而不是用户的话。

这是所有 Agent 框架都要面对的同一个约束——领域模型比协议丰富，落地时必然要牺牲一部分表达力。Pi 的选择是**把损失集中在一次转换里**，而不是让每个 provider 各自处理自定义类型。

## 四、为什么 provider 差异要推迟到最后一层

`Message` 这一层已经统一了，但各家的请求体仍然差得很远：字段名不同、system prompt 的位置不同、工具定义的形状不同、思考预算的表达方式不同。

Pi 的做法是让循环层只面对 `Context`，把厂商差异全部压到最后一步：

```typescript title="packages/coding-agent/src/core/model-runtime.ts:636" {3-4}
streamSimple(model: Model<Api>, context: Context, options?: ModelsSimpleStreamOptions) {
  return lazyStream(model, async () => {
    const prepared = await this.prepareRequest(model, options);   // 解析 auth、合 headers
    return prepared.provider.streamSimple(prepared.model, context, prepared.options);
  });
}
```

推迟到最后一层带来两个直接结果：

- **循环层可测试**。传一个假的 `streamFn` 就能跑完整流程，不需要任何 provider SDK（第 01 章）
- **加一家厂商不改上游**。新增的差异只存在于 `buildParams` 和模型目录的数据里（第 08 章）

代价出现在你想利用厂商私有能力的时候——见 §六。

## 五、为什么三个挂点在不同阶段

system prompt、API Key、payload hook 看起来都是"发请求需要的东西"，但它们的变化频率完全不同，所以被放在了三个位置。

```text
  system prompt   ── 工具集变化时重建一次，之后整段复用
       ↑ 慢
       │
  API Key         ── 每次请求重新解析一次
       │
       ▼ 快
  payload hook    ── 每次请求、且已经是厂商专属结构
```

### system prompt：按需重建，不是每轮现拼

它的来源有三层，优先级从低到高：

```text
  ① _baseSystemPrompt          工具集变化时重建，缓存住
       _rebuildSystemPrompt → buildSystemPrompt
       内容 = 工具清单 + guidelines + 项目上下文文件 + skills 索引
                    │
                    ▼
  ② _systemPromptOverride      扩展在 before_agent_start 里返回的，整轮生效
                    │
                    ▼
  ③ agent.state.systemPrompt   实际随请求发出的那一份
```

`_rebuildSystemPrompt`（`packages/coding-agent/src/core/agent-session.ts:1045`）里调的 `buildSystemPrompt`（`packages/coding-agent/src/core/system-prompt.ts:28`）负责拼接。分层构建的完整细节在第 05 章。

### API Key：每次请求重新解析

```typescript title="packages/agent/src/agent-loop.ts:304" {2-3}
// Resolve API key (important for expiring tokens)
const resolvedApiKey =
  (config.getApiKey ? await config.getApiKey(config.model.provider) : undefined) || config.apiKey;
```

不缓存的原因写在 `getApiKey` 的 JSDoc 里：Copilot 之类的 OAuth token 会在长工具执行期间过期。一次工具调用跑十分钟，回来再发请求时用的是新解析的 token。

### 上下文快照：一次浅拷贝

顺带说明一个容易忽略的边界。进入循环层之前，`Agent` 先拍了一张快照：

```typescript title="packages/agent/src/agent.ts:437" {4}
private createContextSnapshot(): AgentContext {
  return {
    systemPrompt: this._state.systemPrompt,
    messages: this._state.messages.slice(),   // 浅拷贝，循环层改不到 Agent 的数组
    tools: this._state.tools.slice(),
  };
}
```

`slice()` 让循环层可以往快照里 push 流式中间态而不污染真正的 transcript——落库发生在收到 `message_end` 之后，由 `processEvents`（`packages/agent/src/agent.ts:544`）写进 `_state.messages`。这也是**流式过程中的半截消息不会被存进会话**的原因。

## 六、排查两个常见现象

### 改了 `AGENTS.md`，system prompt 却没变

`_rebuildSystemPrompt` 的触发条件是**工具集变化**，不是每轮请求。项目上下文文件、skills 索引都是在重建时一次性读进来缓存的，之后整段复用。

所以改完 `AGENTS.md` 需要 `/reload`。这个设计是拿"改文件后不自动生效"换"每轮不重复读盘和拼接"——上下文文件可能有几千字，每轮重拼在长会话里是纯浪费。

判断当前用的是哪一份：如果扩展在 `before_agent_start` 里返回过 `systemPrompt`，那么 `_systemPromptOverride` 会盖住基线，此时 `/reload` 也看不到变化，得先确认没有扩展在改它。

### 跨 provider 改 payload 时出现抽象泄漏

最后一个挂点在每家 provider 的实现里各有一处：

```typescript title="packages/ai/src/api/anthropic-messages.ts:565" {1-2,4}
let params = buildParams(model, context, isOAuth, options);   // 按 Anthropic 协议拼请求体
const nextParams = await options?.onPayload?.(params, model); // 扩展最后一次改写机会
if (nextParams !== undefined) {
  params = nextParams as MessageCreateParamsStreaming;        // 返回 undefined 就保持原样
}
```

它拿到的已经不是 `Message[]`，而是 Anthropic 的 `MessageCreateParamsStreaming`。同一个扩展要同时支持 OpenAI，就得自己判断 payload 的形状。

这是推迟策略的代价：厂商差异被压到最后一层的好处是上游干净，坏处是**任何想要利用厂商私有能力的扩展，都必须在这一层重新面对差异**。`compat` 收敛的是 Pi 自己需要的那部分差异（第 08 章），扩展想要的私有字段不在收敛范围内。

实践上的处理办法是在 `onPayload` 里先按 `model.api` 分支，再各自改；或者干脆只在单一 provider 上启用该扩展。

## 七、小结

- Pi 用三层数据结构：领域模型 `AgentMessage`、统一协议 `Message`、厂商请求体
- 内部模型更丰富，是为了让会话历史可还原；协议只有三种角色，多出来的必须降级
- 降级有损，因为接收方是模型不是解析器；前后缀标记只是提示词，没有强制力
- 厂商差异推迟到最后一层，换来循环层可测试、加厂商不改上游
- system prompt 按需重建、API Key 每次重解析、payload hook 每次都在最下层，三者的位置由各自的变化频率决定
- 推迟策略的代价是最后那个挂点会泄漏厂商结构

:::details 本页源码索引

| 符号 | 位置 |
|---|---|
| `createContextSnapshot` | `packages/agent/src/agent.ts:437` |
| `processEvents` | `packages/agent/src/agent.ts:544` |
| `streamAssistantResponse` | `packages/agent/src/agent-loop.ts:281` |
| `getApiKey` 解析点 | `packages/agent/src/agent-loop.ts:305` |
| `convertToLlm` | `packages/coding-agent/src/core/messages.ts:148` |
| `transformContext` 装配点 | `packages/coding-agent/src/core/sdk.ts:362` |
| `streamFn` 装配点 | `packages/coding-agent/src/core/sdk.ts:314` |
| `_rebuildSystemPrompt` | `packages/coding-agent/src/core/agent-session.ts:1045` |
| `buildSystemPrompt` | `packages/coding-agent/src/core/system-prompt.ts:28` |
| `ModelRuntime.streamSimple` | `packages/coding-agent/src/core/model-runtime.ts:636` |
| `prepareRequest` | `packages/coding-agent/src/core/model-runtime.ts:573` |
| `onPayload` 调用点（Anthropic） | `packages/ai/src/api/anthropic-messages.ts:565` |

:::

## 下一步

→ [03 Agent 如何持续工作并最终停止](../03-agent-loop/) — 请求发出去之后，最小的 `while` 循环要长成什么样才能上生产。
