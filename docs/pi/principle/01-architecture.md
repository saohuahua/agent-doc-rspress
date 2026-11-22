---
title: 01 Pi 总体架构
description: Pi Coding Agent 的分层、运行链路与状态边界
---

# 01 Pi 总体架构

Pi Coding Agent 将模型请求、工具执行、会话管理和用户交互组织为一套运行过程。其核心由三个包构成：`pi-ai` 定义消息及模型接口，`pi-agent-core` 实现 Agent 状态和执行循环，`pi-coding-agent` 将循环与会话、工具、扩展和运行界面组装成应用。

## 分层与依赖

```text
CLI / SDK / RPC
       │
       ▼
pi-coding-agent   会话、资源、工具、界面与运行配置
       │
       ▼
pi-agent-core     Agent 状态、事件、模型与工具循环
       │
       ▼
pi-ai             消息类型、模型请求、Provider 适配
```

这是核心依赖关系的简化视图。`coding-agent` 也直接使用 `pi-ai`，并依赖 TUI、MCP 和 Codemode 等包。Agent 核心并不依赖终端界面，因此可以由不同的宿主组装和驱动；模型层可以独立用于非 Agent 的模型调用。

| 包 | 主要输入 | 主要输出 |
|---|---|---|
| `pi-ai` | 模型、消息上下文、模型请求选项 | 模型的流式事件和最终消息 |
| `pi-agent-core` | 消息、工具、模型、调度配置 | 状态变化、Agent 事件、工具结果 |
| `pi-coding-agent` | 用户输入、资源配置、历史会话 | 用户界面、持久化会话、可嵌入的 SDK |

Provider 是对模型服务接口的适配。`pi-ai` 处理不同 Provider 的协议差异；它不决定任务是否继续、是否执行工具。这个决定由 Agent 循环根据模型消息、工具结果、队列和运行策略共同完成。

分层同时形成两种接口：向下调用和向上通知。产品层向 Agent 提供模型、消息、工具和运行策略；Agent 执行期间产生事件，由订阅者更新界面、保存会话或触发扩展。模型的文本增量、工具执行进度和最终结果由不同事件承载，因此界面可以在任务结束前呈现过程。

## 入口与运行组装

### CLI

`packages/coding-agent/src/cli.ts` 执行启动配置，将命令行参数交给 `main`：

```typescript
setupCli();
main(process.argv.slice(2));
```

`main` 解析参数，建立运行所需的服务、会话和运行模式。当前实现通过 `createAgentSessionFromServices` 传入模型、工具和 `SessionManager` 等选项，再由运行时为所选模式提供会话。

### SDK

SDK 的公开入口 `createAgentSession()` 用于在进程内创建可控制的会话。CLI 和 SDK 在入口参数与运行模式上不同，底层都要组装 Agent、模型运行能力和会话服务。

`packages/coding-agent/src/core/sdk.ts` 创建 `Agent` 时提供初始状态、消息转换、模型请求函数和扩展回调。以下片段省略了缓存、请求选项及其余配置：

```typescript
const agent = new Agent({
  initialState: { /* model、tools、messages 等 */ },
  convertToLlm: convertToLlmWithBlockImages,
  streamFn: async (model, context, options) => {
    const requestOptions = buildRequestOptions(options);
    return modelRuntime.streamSimple(model, context, requestOptions);
  },
});
```

`streamFn` 把模型请求能力传给 Agent；循环调用它，不需要自己创建 Provider 客户端。宿主也可以注入模拟实现测试调度。`convertToLlm` 定义内部消息如何转换为模型接口接受的消息，这使界面专用消息可以被转换或过滤。

## 从输入到模型请求

用户输入经过产品层和 Agent 层，最终进入一次或多次模型请求：

```text
AgentSession.prompt(text)
  ├─ 扩展命令、输入处理和模板展开
  ├─ 运行中输入 → steering / follow-up 队列
  └─ 模型与认证检查 → 启动运行
                             │
                             ▼
Agent.prompt(message) → runPromptMessages() → runAgentLoop() → runLoop()
```

在 `AgentSession.prompt()` 中，扩展命令可能直接处理输入；普通输入经过输入处理器、Skill 和模板展开。运行中收到的新消息根据 `streamingBehavior` 进入 steering 或 follow-up 队列。会话未处于运行状态时，还需要检查模型和认证，才能启动 Agent。

`Agent.prompt()` 是较低一层的入口。它拒绝并发启动同一个 Agent，将输入规范化为消息，并通过 `runPromptMessages()` 进入循环。运行期间 `Agent` 管理中止信号、活动运行状态和事件监听器。

`AgentSession.prompt()` 与 `Agent.prompt()` 之间的边界直接影响输入语义：前者了解扩展命令、资源、认证和产品级队列；后者只接受进入 Agent 的消息并管理执行。如果应用绕过 Session 直接使用 Agent，就需要自行提供这些产品层能力。

### 循环实际接收的数据

`runPromptMessages()` 将当前消息和工具整理为 `AgentContext` 快照，并传入循环配置、事件处理函数、中止信号和 `streamFunction`。`AgentContext` 的核心结构是：

```typescript
interface AgentContext {
  messages: AgentMessage[];
  tools?: AgentTool<any>[];
}
```

系统提示属于消息历史中的系统消息。工具列表保存运行时可执行的工具；Pi 还会比较消息历史中的工具声明与当前工具集，必要时通过系统消息记录工具增删。这使模型看到的工具声明与运行时工具集能够同步，而不是把工具函数本身发送给模型。

`runAgentLoop()` 将新消息追加到已有消息，发出 `agent_start`、`turn_start` 及初始消息事件，再调用 `runLoop()`。它为本次循环构造消息数组，因此循环对上下文的追加不会通过共用同一个数组直接修改 Agent 的原数组；`Agent` 再根据事件更新自身状态。

## Agent Loop 与一次 Turn

一个 **turn** 是一次助手响应及其关联的工具执行。一次 Agent 运行可以包含多个 turn；当模型给出工具调用时，工具结果进入上下文，后续 turn 才能根据结果继续处理。

`runLoop()` 的主要顺序如下：

1. 根据上一轮结果调用 `prepareNextTurn`，必要时更新上下文、模型或待加入的消息。
2. 将待处理消息加入上下文；在每次请求前调用 `prepareRequest`。
3. 通过 `streamAssistantResponse()` 获取助手消息，并检查其停止原因。
4. 提取工具调用，执行工具并将结果追加到当前上下文。
5. 调用 `finishTurn`，发出 `turn_end`，再根据工具调用、steering 与 follow-up 决定是否继续。

首次请求没有上一轮结果，因此不调用基于上一轮的 `prepareNextTurn`。`prepareRequest` 则在每次对话模型请求之前调用，包括首次请求。二者分别作用于“决定进入下一轮后”和“即将发送请求前”，不应当作同一个钩子。

循环包含内外两层：内层处理工具调用和 steering；内层工作结束后，外层检查 follow-up。`finishTurn` 可明确要求结束或继续。模型响应的 `error` 和 `aborted` 是提前退出路径；当响应因长度限制截断时，工具参数可能不完整，循环会使这些调用失败，而不是直接执行。

例如模型发出一次 `read` 调用：助手消息和工具结果按顺序进入上下文；下一次模型请求据此生成回答。如果工具返回错误，错误结果同样可进入上下文，后续处理取决于循环配置和模型响应。

### 一个工具调用的消息轨迹

以下是教学用的简化轨迹，省略时间、模型元数据和事件字段：

```text
请求 1 的 messages:
  system      系统指令、工具声明
  user        读取 package.json

模型响应:
  assistant   toolCall(id=call_1, name=read, arguments={path: "package.json"})

工具执行后的 messages:
  system → user → assistant(toolCall: call_1)
  → toolResult(toolCallId: call_1, content: 文件内容)

请求 2:
  使用包含上述助手消息和工具结果的上下文
  → 模型生成文本回答
```

工具调用 ID 将结果与助手消息中的请求关联。工具的参数先按工具定义校验，再进入可选的 `beforeToolCall` 和实际执行；执行结果可由 `afterToolCall` 调整，最后转换为工具结果消息。返回给模型的 `content` 与供界面使用的 `details` 是不同字段，不能假设模型能看到所有 UI 元数据。

### 模型请求的边界

`streamAssistantResponse()` 依次执行 `transformContext`、`convertToLlm`、`normalizeContext`，然后用处理后的上下文调用 `streamFunction`。这一步产生的是模型本次请求使用的消息视图；会话文件中的所有条目并不会自动原样发送给模型。

响应流的 `start` 创建部分助手消息；文本、思考或工具调用增量更新该消息，并发出 `message_update`；`done` 或 `error` 将最终消息写回上下文并发出 `message_end`。因此，一条助手消息可以经历多次更新，但持久化和下一轮上下文需要的是完成后的消息。

## 状态、会话与模型上下文

三个结构解决的问题不同：

| 结构 | 管理什么 | 生命周期 |
|---|---|---|
| `AgentState` | 当前模型、工具、消息、流式状态及运行信息 | Agent 实例运行期间 |
| Session 历史 | 消息及模型切换、压缩等会话条目 | 可持久化并在之后恢复 |
| 模型上下文 | 当前请求经过转换后交给模型的消息与工具信息 | 每次模型请求 |

`SessionManager` 的条目用 `id` 和 `parentId` 组织成树；当前叶节点决定活动分支。恢复时，`buildSessionContext()` 从分支构建消息。压缩会在后续模型上下文中使用摘要替代较早内容，但原始条目仍保留在会话树中。

Agent 上下文中的消息可能包含内部类型。发送前可经过 `transformContext`，再通过 `convertToLlm` 转换。系统提示在当前消息模型中通过系统消息表达，因此不能直接把旧版文档中的 `AgentContext.systemPrompt` 当作当前接口。

## 事件与运行结束

Agent 通过 `subscribe()` 向调用方提供事件。`agent_start` 和 `agent_end` 标记一次底层运行，`turn_start` 和 `turn_end` 标记一轮；消息更新与工具执行事件用于显示过程和记录结果。

`agent_end` 表示底层循环不会再发出该次运行的事件。`Agent` 仍会等待订阅者处理完事件后清理运行状态；产品层还可能进行重试、压缩或继续排队任务。因而 UI 使用哪个事件标记整体任务完成，必须结合所在运行模式的协议，不能只依据事件名称推断。

Agent 对 `message_start`、`message_update` 和 `message_end` 的处理分别反映当前流式消息的开始、更新和结束；完成后的消息进入 Agent 消息状态。`AgentSession` 收到 `message_end` 后，普通系统、用户、助手和工具结果消息通过 `SessionManager.appendMessage()` 追加到会话。状态更新和持久化依赖同一事件，但发生在不同层，不能把一次增量当作一条完整会话消息。

监听器会按订阅顺序被等待。一个耗时监听器会延长事件处理和运行结算时间；这提供了明确的处理顺序，也意味着订阅逻辑会影响运行延迟。

## 本地运行与验证

仓库根目录要求 Node.js 22.19 或更新版本。PowerShell 中安装依赖并从源码启动：

```text
cd D:\project\pi
npm install --ignore-scripts
npm run hydrate:model-data
node --import ./packages/coding-agent/src/experimental/source-resolver.ts ./packages/coding-agent/src/cli.ts --help
node --import ./packages/coding-agent/src/experimental/source-resolver.ts ./packages/coding-agent/src/cli.ts
```

`hydrate:model-data` 从上游模型目录获取数据，生成被 Git 忽略的 Provider 模型数据；网络不可用时无法完成。第一条 Node 命令输出帮助，确认 CLI 入口和依赖可加载；第二条进入交互模式。真实对话还需要配置可用的模型和凭据。模型请求可能产生费用；`--help` 成功不代表模型已连接。

如果配置的 npm 镜像缺少包，可在安装命令中指定 `--registry=https://registry.npmjs.org`，不必修改全局配置。数据准备只生成本地忽略文件，不需要手动修改生成的模型源码。

循环可以不连接模型服务进行验证。现有测试使用模拟 `streamFn` 返回预设的助手消息，从而检查事件和工具调用。PowerShell 中执行：

```text
cd D:\project\pi\packages\agent
node ../../node_modules/vitest/dist/cli.js --run test/agent-loop.test.ts -t "should handle tool calls and results"
```

该测试构造工具及两次模拟模型响应，并检查工具结果与事件。它验证的是 Agent 对既定响应的调度，不验证真实 Provider 的协议、认证或模型是否会选择正确工具。通过后可对比同文件中 `should build provider context exclusively from transcript messages`：该用例检查模型请求上下文以消息为来源。

## 扩展和安全边界

扩展可以在生命周期节点接收事件，并通过工具调用前后的钩子参与处理。`beforeToolCall` 在参数校验后、实际执行前调用，可阻断调用并返回错误结果；`afterToolCall` 可覆盖执行结果的部分字段。这些钩子适合实现应用层策略和审计。

扩展与 Pi 进程共享权限。项目资源信任、工具钩子和进程隔离是不同层次的机制：项目资源信任控制资源加载；钩子处理经过该执行链的调用；限制进程、文件系统或网络访问还需要外部隔离机制。

## 源码索引

| 位置 | 主要内容 |
|---|---|
| `packages/coding-agent/src/cli.ts` | CLI 入口 |
| `packages/coding-agent/src/main.ts` | 参数、服务和运行模式组装 |
| `packages/coding-agent/src/core/sdk.ts` | SDK 与 Agent 组装 |
| `packages/coding-agent/src/core/agent-session.ts` | 输入、会话和产品层生命周期 |
| `packages/coding-agent/src/core/session-manager.ts` | 会话条目、分支与上下文恢复 |
| `packages/agent/src/agent.ts` | Agent 状态、队列和事件订阅 |
| `packages/agent/src/agent-loop.ts` | 循环、模型请求与工具执行 |
| `packages/agent/src/types.ts` | Agent 状态、配置与事件契约 |
| `packages/ai/src/types.ts` | 消息和模型接口类型 |
