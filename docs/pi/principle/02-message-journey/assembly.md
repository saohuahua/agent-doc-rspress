---
title: 02.2 从上下文到请求体
description: 循环层的三次格式转换、system prompt 的构建时机，以及模型层最后两次改写机会
---

# 02.2 从上下文到请求体

[← 回到 02 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

[上一页](./gates)结束在 `_runAgentPrompt(messages)`。从这里开始，消息离开产品层，剩下的事情只有一件：**把 Pi 的内部数据结构翻译成某一家 provider 认识的 HTTP body**。

一共翻译五次：

```text
  AgentMessage[]                   Pi 自己的消息类型（含 bashExecution / custom / 摘要）
       │  ① transformContext       扩展的 context 事件
       ▼
  AgentMessage[]
       │  ② convertToLlm           压平成 user / assistant / toolResult
       ▼
  Message[]
       │  ③ 拼 llmContext          + systemPrompt + tools
       ▼
  Context
       │  ④ prepareRequest         解析 auth、合并 headers
       ▼
  Context + headers
       │  ⑤ buildParams            按 provider 协议拼请求体
       ▼
  provider 专属 payload  ──► HTTP / SSE
```

前三次在循环层，后两次在模型层。扩展在这条路上还有三个挂点：`context`、`before_provider_headers`、`before_provider_request`。

## 一、进循环层之前：一次浅拷贝

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

这个设计解释了一件事：**流式过程中的半截消息为什么不会被存进会话**。它只存在于快照里，事件走完才有资格进真正的状态。

## 二、三次转换

**文件**：`packages/agent/src/agent-loop.ts:281`

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

三次转换的分工：

| 转换 | 输入 → 输出 | 谁能插手 | 典型用途 |
|---|---|---|---|
| `transformContext` | AgentMessage[] → AgentMessage[] | 扩展 `context` 事件 | 删旧消息、插外部上下文 |
| `convertToLlm` | AgentMessage[] → Message[] | 产品层固定实现 | 类型压平、过滤不该发的 |
| 拼 `llmContext` | Message[] → Context | 无 | 补上 systemPrompt 和 tools |

### `transformContext`：还在 Pi 的类型系统里

`transformContext`（`packages/coding-agent/src/core/sdk.ts:362`）工作在 AgentMessage 这一层，扩展的 `context` 事件就挂在它上面。能删消息、能插消息，但插进去的还得是 Pi 认识的消息类型。

### `convertToLlm`：把自家类型降级成 user 消息

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

这里能看出一个反复出现的手法：**Pi 自己的消息类型全部降级成 user 消息发出去**。

| Pi 的类型 | 发出去变成 | 靠什么保留语义 |
|---|---|---|
| `bashExecution` | user | 格式化成一段带命令和输出的文本 |
| `compactionSummary` | user | `COMPACTION_SUMMARY_PREFIX` / `SUFFIX` 包裹 |
| `branchSummary` | user | `BRANCH_SUMMARY_PREFIX` / `SUFFIX` 包裹 |
| 扩展的 `custom` | user | 由扩展自己写的文本决定 |
| 标了 `excludeFromContext` | **消失** | 返回 `undefined` 被过滤掉 |

协议只有三种角色可用，多出来的语义只能靠前后缀标记来表达。这是所有 Agent 框架都要面对的同一个约束：**你的领域模型比协议丰富，落地时必须有损。**

### `getApiKey`：每次请求重新解析

不缓存。注释写明了原因：Copilot 之类的 OAuth token 会在长工具执行期间过期。一次工具调用跑十分钟，回来再发请求时用的是新解析的 token。

## 三、system prompt 是什么时候拼好的

上面 `llmContext.systemPrompt` 直接取自快照，不是每次请求现拼的。它的来源有三层，优先级从低到高：

```text
  ① _baseSystemPrompt          工具集变化时重建一次，缓存住
       由 _rebuildSystemPrompt → buildSystemPrompt 生成
       内容 = 工具清单 + guidelines + 项目上下文文件 + skills 索引
                    │
                    ▼
  ② _systemPromptOverride      扩展在 before_agent_start 里返回的，整轮生效
                    │
                    ▼
  ③ agent.state.systemPrompt   实际发出去的那一份
```

`_rebuildSystemPrompt`（`packages/coding-agent/src/core/agent-session.ts:1045`）里调的 `buildSystemPrompt`（`packages/coding-agent/src/core/system-prompt.ts:28`）负责把这些拼成一整段文本。

注意重建的触发条件是**工具集变化**，不是每轮。所以 `AGENTS.md` 改了不会自动生效，得 `/reload`。分层构建的完整细节在第 05 章。

## 四、模型层：最后两次改写机会

SDK 装配时注入的 `streamFn`（`packages/coding-agent/src/core/sdk.ts:314`）转手交给 `ModelRuntime` 的流式入口：

```typescript title="packages/coding-agent/src/core/model-runtime.ts:636" {3-4}
streamSimple(model: Model<Api>, context: Context, options?: ModelsSimpleStreamOptions) {
  return lazyStream(model, async () => {
    const prepared = await this.prepareRequest(model, options);   // 解析 auth、合 headers
    return prepared.provider.streamSimple(prepared.model, context, prepared.options);
  });
}
```

`prepareRequest`（`packages/coding-agent/src/core/model-runtime.ts:573`）里有倒数第二个扩展挂点：`transformHeaders` 回调最终连到扩展的 `before_provider_headers`。

最后一个挂点在 `ai` 包里，每家 provider 的实现各有一处：

```typescript title="packages/ai/src/api/anthropic-messages.ts:565" {1-2,4}
let params = buildParams(model, context, isOAuth, options);   // 按 Anthropic 协议拼请求体
const nextParams = await options?.onPayload?.(params, model); // 扩展最后一次改写机会
if (nextParams !== undefined) {
  params = nextParams as MessageCreateParamsStreaming;        // 返回 undefined 就保持原样
}
```

### 换来什么 / 代价是什么

换来的是"给某家厂商加一个私有字段"这件事完全不用改核心——这是唯一能表达它的位置。

代价是抽象泄漏：`onPayload` 拿到的已经不是 Pi 的抽象消息，而是 **provider 专属的请求体**。同一个扩展要兼容 Anthropic 和 OpenAI，就得自己判断 payload 的形状。`compat` 收敛了协议差异（第 08 章），但这个钩子的位置在收敛之后。

至此，字符串终于变成了 HTTP body。

## 五、小结

- 从 AgentMessage 到 HTTP body 一共五次翻译，前三次在循环层、后两次在模型层
- 快照的 `slice()` 是流式中间态不污染会话状态的唯一保障
- `convertToLlm` 把 Pi 的五种自有消息类型全部降级成 user 消息，语义靠前后缀标记
- `getApiKey` 每次请求重新解析，为的是长工具执行期间过期的 OAuth token
- system prompt 三层来源，重建触发条件是工具集变化而不是每轮
- 扩展在这条路上有三个挂点，最后一个已经拿到 provider 专属结构

<details>
<summary>本页源码索引</summary>

| 符号 | 位置 |
|---|---|
| `createContextSnapshot` | `packages/agent/src/agent.ts:437` |
| `createLoopConfig` | `packages/agent/src/agent.ts:445` |
| `processEvents` | `packages/agent/src/agent.ts:544` |
| `streamAssistantResponse` | `packages/agent/src/agent-loop.ts:281` |
| `convertToLlm` | `packages/coding-agent/src/core/messages.ts:148` |
| `transformContext` 装配点 | `packages/coding-agent/src/core/sdk.ts:362` |
| `streamFn` 装配点 | `packages/coding-agent/src/core/sdk.ts:314` |
| `_rebuildSystemPrompt` | `packages/coding-agent/src/core/agent-session.ts:1045` |
| `buildSystemPrompt` | `packages/coding-agent/src/core/system-prompt.ts:28` |
| `ModelRuntime.streamSimple` | `packages/coding-agent/src/core/model-runtime.ts:636` |
| `prepareRequest` | `packages/coding-agent/src/core/model-runtime.ts:573` |
| `onPayload` 调用点（Anthropic） | `packages/ai/src/api/anthropic-messages.ts:565` |

</details>

## 下一步

→ [03 Agent Loop 与终止控制](../03-agent-loop/) — 请求发出去之后，那个循环怎么转、什么时候停、以及为什么它不会转到天荒地老。
