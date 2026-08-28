---
title: 01 总体架构与设计哲学
description: Pi 的整体结构、每一层在做什么，以及这么拆的理由和代价
---

# 01 总体架构与设计哲学

以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准。文中所有 `file:line` 经 `pnpm check:refs` 校验，代码块里的中文注释为本文补充。

Agent 的基本循环在 [Learn 02](/learn/02-minimal-loop) 讲过，二十几行就能跑通。本文要看的是：从那二十几行到一个 12 万行的生产项目，中间多出来的东西被放在了哪里、为什么这么放。

## 0. 本章回答哪些面试问题

- **#1 AI Coding 整体的实现思路是什么** —— 三层职责、单向依赖、事件流，以及一次请求从哪进从哪出
- **#6 通用 Harness 的核心工程能力有哪些技术难点** —— 难点直接写在 `AgentLoopConfig` 的接口上

编号见交接文档 §12。

## 一、总体架构

Pi 是一个终端 AI 编码智能体。整体结构是这样的：

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                          入口：四种运行模式                                  │
│                                                                           │
│    交互模式(TUI)      -p 打印       --mode json      --mode rpc      SDK    │
│         └────────────────┴─────────────┴────────────────┴────────────┘     │
│                                     │                                     │
│  ┌──────────────────────────────────▼─────────────────────────────────┐   │
│  │  coding-agent   产品层                              78768 行         │   │
│  │                                                                    │   │
│  │   AgentSession ── 斜杠命令 · Skill/模板展开 · 上下文压缩              │   │
│  │                   会话读写 · 项目信任 · 认证解析 · 扩展加载 · 包管理    │   │
│  │                                                                    │   │
│  └──────────────────────────────────┬─────────────────────────────────┘   │
│                                     │                                     │
│         agentLoop(prompts, context, config, signal, streamFn)             │
│                                     │                                     │
│  ┌──────────────────────────────────▼─────────────────────────────────┐   │
│  │  agent-core     循环层                              12915 行         │   │
│  │                                                                    │   │
│  │    ① 发请求 ─► ② 收流式回复 ─► ③ 有工具调用吗                          │   │
│  │         ▲                              │                            │   │
│  │         │                              ▼                            │   │
│  │         └── ⑤ 结果写回上下文 ◄── ④ 校验参数 · 执行工具                 │   │
│  │                                                                    │   │
│  └──────────┬──────────────────────────────────────┬──────────────────┘   │
│             │ streamFn                             │ tool.execute        │
│  ┌──────────▼─────────────────────┐   ┌────────────▼──────────────────┐   │
│  │  ai        模型层    27715 行    │   │  内置工具                       │   │
│  │                                │   │                               │   │
│  │  30+ Provider 的协议差异         │   │  read / write / edit          │   │
│  │  认证（API Key / OAuth / 云）    │   │  bash / grep / find / ls      │   │
│  │  流式事件、模型能力目录           │   │                               │   │
│  └──────────┬─────────────────────┘   └────────────┬──────────────────┘   │
└─────────────┼──────────────────────────────────────┼──────────────────────┘
              ▼                                      ▼
     Anthropic / OpenAI / Google              你的文件系统和 shell
     / 本地 llama.cpp / ...
```

从上往下读这张图：

- **入口层**决定"谁在用"。同一套下层逻辑，套上 TUI 就是终端应用，套上 RPC 就能被 IDE 驱动，套上 SDK 就能嵌进别人的 Node 程序。
- **产品层**（`coding-agent`）把散落的东西收拢：你敲的是斜杠命令还是普通消息、要不要展开 Skill、上下文是不是快满了要压缩、凭据在哪、哪些扩展要拦一手。它的产出是喂给循环层的那五个参数。
- **循环层**（`agent-core`）只做一件事：拿上下文去问模型，模型要调工具就执行并把结果写回去，然后再问一次，直到模型不再要求调工具。
- **模型层**（`ai`）把 30 多家 Provider 的协议、认证、能力差异吃掉，对上暴露统一的"发一段上下文、回一串流式事件"。
- **工具**是真正碰磁盘和 shell 的地方。模型永远碰不到，它只能提出请求。

三个角色的分工可以这样记：

- **模型**负责决定下一步做什么
- **循环**负责执行并把结果交回去
- **产品**负责准备好这一切、并把过程呈现给你

## 二、把这张图跑一遍

架构图是静态的，看一次真实任务更直观。你在终端输入：

```text
把 src 下所有 console.log 删掉，然后跑一遍测试
```

接下来发生的事：

```text
你          Pi                              模型                本机
│           │                                │                  │
├─ 输入 ───►│                                │                  │
│           ├─ 组装上下文 ─────────────────►│                  │
│           │                                ├─ "先找一下"       │
│           │◄──── 请求调用 grep ────────────┤                  │
│           │                                │                  │
│           ├─ 校验参数、执行 ──────────────────────────────────►│
│           │◄──── 12 个文件 ───────────────────────────────────┤
│           ├─ 结果写成文本，塞回上下文 ────►│                  │
│           │                                ├─ "改第一个文件"   │
│           │◄──── 请求调用 edit ────────────┤                  │
│           ├─ 执行 ──────────────────────────────────────────►│
│           │                              ...重复 N 次...      │
│           │                                ├─ "跑测试"        │
│           │◄──── 请求调用 bash ────────────┤                  │
│           ├─ 执行 ──────────────────────────────────────────►│
│           │◄──── 测试失败，2 个用例挂了 ──────────────────────┤
│           ├─ 结果塞回上下文 ─────────────►│                  │
│           │                                ├─ "我知道哪错了"   │
│           │◄──── 再改一次 ─────────────────┤                  │
│           │                               ...                 │
│◄─ 完成 ───┤                                │                  │
```

这里有三点值得记住。

**模型自始至终没有碰过磁盘。** 它做的只是提出请求——请求调用 `grep`、请求调用 `edit`。真正读文件、改文件、跑命令的是 Pi。模型影响世界的唯一途径，是它写出的那段结构化 JSON。

**每一步都依赖上一步的结果。** 不知道 grep 找到哪些文件就没法决定改哪个，不知道测试报什么错就没法决定怎么修。所以这必须是循环，不能是一次性的批量请求。

**Pi 干的活可以概括成一句话**：把模型的决定翻译成本机的动作，再把动作的结果翻译回模型能读懂的文字。

这个角色有个通用叫法：**Harness**（挽具）。模型是马，harness 是把马和车连起来的那套装备。Pi 是面向编码场景的 harness。

被问到"AI Coding 整体是怎么实现的"，从这个边界讲起比从"有一个 while 循环"讲起清楚得多。它同时解释了后面所有设计：为什么需要参数校验、为什么需要副作用拦截、为什么工具描述写得好不好那么重要。

## 三、为什么要拆成三层

三层的职责不同，更重要的是**变化频率不同**：

- 模型厂商几乎每周都在变——新模型、新参数、新的兼容性坑
- 循环本身很少变，一个正确的工具循环写完之后，改动主要来自 steering、abort 这类交互语义
- 产品功能一直在加——新命令、新扩展点、新的界面细节

如果搅在一起，加一家 Provider 就得动循环，改一个 TUI 细节就得担心影响工具执行。拆开之后，三种变化互不干扰。

## 四、十个包与依赖方向

各包的行数与职责：

| 包 | 行数 | 职责 |
|---|---|---|
| `coding-agent` | 78768 | 产品层：四种运行模式、会话、认证、扩展、包管理 |
| `ai` | 27715 | 模型层：Provider 协议、认证、流式事件、模型目录 |
| `tui` | 17668 | 终端 UI 组件库 |
| `agent`（发布名 `pi-agent-core`） | 12915 | 循环层：Agent Loop、工具执行 |
| `session-backends` | 2566 | 会话存储后端，目前是 sqlite |
| `server` | 2314 | 实验中的远程服务端 |
| `client` | 1393 | 实验中的远程客户端 |
| `evals` | 1311 | 评估框架 |
| `protocol` | 1245 | 实验中的 CBOR 传输协议 |
| `telemetry` | 935 | 遥测 |

依赖关系写在各包的 `package.json` 里：

| 包 | 依赖谁 |
|---|---|
| `tui` / `protocol` / `telemetry` / `evals` | 不依赖任何内部包 |
| `ai` | `telemetry` |
| `client` | `protocol` |
| `agent-core` | `ai`、`telemetry` |
| `server` | `ai`、`protocol` |
| `session-backends` | `ai`、`agent-core` |
| `coding-agent` | `agent-core`、`ai`、`client`、`protocol`、`tui` |

判断一个架构是不是真的解耦，看它**缺哪些依赖**比看它有哪些依赖更准。这里有三处缺失值得注意：

- **`agent-core` 不依赖 `tui`。** 循环层不知道界面存在，所以同一个循环能跑在交互、RPC、JSON、SDK 四种场景下，不需要任何 if 判断。
- **`ai` 不依赖 `agent-core`。** 模型层不知道什么是 Agent、什么是工具循环，可以被任何非 Agent 项目单独拿去用。
- **`tui` 零依赖。** 17668 行的终端 UI 不引用 Pi 的任何东西，本质是一个可独立发布的组件库。

三层的知识边界：

```text
  coding-agent   知道：用户、终端、会话文件、API Key、扩展、包
                 不知道：怎么跟 Anthropic 的 SSE 打交道

  agent-core     知道：消息、工具、模型对象、事件
                 不知道：API Key 在哪、会话存哪、界面长什么样

  ai             知道：Provider 协议、认证、流式事件、模型能力
                 不知道：什么是 Agent、什么是工具循环
```

## 五、循环层看到的世界有多小

**文件**：`packages/agent/src/agent-loop.ts`

整个文件 796 行，入口函数是：

```typescript title="packages/agent/src/agent-loop.ts:31" {2-6}
export function agentLoop(
  prompts: AgentMessage[],          // 本次新加入的消息（通常是用户输入）
  context: AgentContext,            // 模型能看到的全部世界
  config: AgentLoopConfig,          // 产品层插进来的十一个回调
  signal: AbortSignal | undefined,  // 中止信号，按 Esc 走这里
  streamFn: StreamFn,               // 怎么跟模型说话，由外部注入
): EventStream<AgentEvent, AgentMessage[]> {   // 返回事件流，不是 Promise
```

高亮的这五个参数没有一个是全局状态：没有 API Key，没有会话对象，没有 UI 句柄，没有配置文件路径。想跑这个循环，把该给的都给它。

其中 `context` 是模型能看到的全部世界：

```typescript title="packages/agent/src/types.ts:412" {2,4,6}
export interface AgentContext {
  systemPrompt: string;        // 系统提示词，每次请求都带上
  /** Transcript visible to the model. */
  messages: AgentMessage[];    // 对话记录，压缩后的结果也是塞在这里
  /** Tools available for this run. */
  tools?: AgentTool<any>[];    // 本次运行可用的工具
}
```

三个字段。会话怎么存的、上下文被压缩过几次、用户是谁、跑在哪个终端，循环层一概不知。

这个约束反过来解释了后面几章的很多设计。比如上下文压缩：循环层拿到的 `messages` 就是要发出去的全部内容，压缩**必须发生在进入循环之前**，不可能在循环内部悄悄做（第 06 章）。再比如扩展想改上下文，只能通过 `config` 上的钩子，不能直接改状态（第 09 章）。

## 六、产品层怎么把东西喂进来

`AgentLoopConfig` 是产品层往循环层插的一排插头。

**文件**：`packages/agent/src/types.ts:149`

字段几乎全是回调，列出来就是一张"通用 Harness 要解决的问题清单"：

| 字段 | 解决的问题 | 展开章节 |
|---|---|---|
| `model` | 用哪个模型 | 08 |
| `convertToLlm` | Agent 内部消息不等于模型能懂的消息，中间要转换和过滤 | 02 |
| `transformContext` | 发出去之前还想再改一把上下文 | 05 |
| `getApiKey` | 凭据不归循环管，要用时再问产品层 | 08 |
| `shouldStopAfterTurn` | 什么时候该停下来 | 03 |
| `prepareNextTurn` | 下一轮开始前要做什么 | 03 |
| `getSteeringMessages` | 用户中途插话 | 03 |
| `getFollowUpMessages` | 用户排队的后续任务 | 03 |
| `toolExecution` | 工具并行还是串行 | 04 |
| `beforeToolCall` | 副作用发生前的唯一拦截点 | 04 / 09 |
| `afterToolCall` | 结果回填前还想改一把 | 04 / 09 |

被问到"如果让你设计一个通用 Agent Harness，核心难点有哪些"，这十一项就是答案：消息转换、上下文改写、凭据解耦、终止判定、插队与排队、工具调度、副作用前后的拦截。留少了产品层做不了事，留多了循环层就变成了框架。

`streamFn` 没有放进 `config`，而是作为第五个独立参数，类型是 `StreamFn`（`packages/agent/src/types.ts:28`）。区别在语义：`config` 是这次运行的策略，`streamFn` 是"怎么跟模型说话"这件事本身。抽成参数带来三个结果：测试不用起网络，传一个假的就能跑完整循环；换模型等于换传进来的函数，循环一行不改；Provider 实现可以懒加载，`ai/src/api/` 下有 11 个 `*.lazy.ts`，用到哪家才加载哪家的 SDK。

### 脏活都在产品层

**文件**：`packages/coding-agent/src/core/agent-session.ts:310`

`AgentSession` 3495 行，是全仓第二大的文件。它的职责就是把散落的产品能力翻译成循环层需要的那五个参数：

```text
          用户按下回车
               │
               ▼
  ┌──────────────────────────────────────┐
  │ AgentSession                          │
  │                                       │
  │  是斜杠命令吗    → 直接执行，不进循环    │
  │  是 Skill/模板吗 → 展开成普通文本       │
  │  上下文超了吗    → 先压缩               │
  │  有扩展要拦吗    → 触发 input 事件      │
  │  凭据在哪        → 组装 getApiKey       │
  │  谁来拦工具      → 组装 beforeToolCall  │
  │  消息存哪        → 订阅事件写 JSONL     │
  └───────────────────┬──────────────────┘
                      │
                      │ agentLoop(prompts, context, config, signal, streamFn)
                      ▼
          ┌────────────────────────┐
          │ agent-core 只管转圈      │
          └────────────────────────┘
```

这条链路的完整拆解是第 02 章的内容。

很多人第一次读 Pi 源码会问：核心循环这么短，那 12 万行都在干嘛。答案就在这里——Agent 的难点不在循环本身，而在**喂给循环的东西怎么来**。`coding-agent` 的 78768 行里，`modes/interactive/` 占 18264 行，`package-manager.ts` 2699 行，`session-manager.ts` 1715 行，全是"怎么来"的问题。

## 七、为什么返回的是事件流

`agentLoop` 的返回值是 `EventStream<AgentEvent, AgentMessage[]>`，不是 `Promise<Result>`。

`AgentEvent`（`packages/agent/src/types.ts:428`）分四层：

```text
agent_start ──────────────────────────────────────► agent_end
    │
    ├── turn_start ─────────────────────► turn_end      一轮 = 一次模型回复 + 它的工具调用
    │       │
    │       ├── message_start
    │       ├── message_update      流式增量，只有助手消息有
    │       ├── message_end
    │       │
    │       ├── tool_execution_start
    │       ├── tool_execution_update    工具自己的流式输出
    │       └── tool_execution_end
    │
    └── turn_start ──► ...   模型还要调工具就再转一圈
```

分层的意义是订阅者可以只关心自己那一层：TUI 只订阅 `message_update` 里的 `text_delta`，不关心一共转了几轮；成本统计只订阅 `message_end` 的 `usage`，不关心文字内容；权限扩展只订阅工具事件，不关心模型说了什么。

换成回调风格（`onText`、`onToolCall`、`onDone`……），每加一种订阅者就得加一个回调参数，接口会持续膨胀。事件流的接口是固定的，**扩展发生在订阅侧而不是被订阅侧**。

:::warning `agent_end` 不是终点

类型定义的注释里写明：`agent_end` 是最后一个事件，但 `Agent.subscribe()` 中被 await 的监听器仍然算作本次运行结算的一部分，监听器跑完 Agent 才真正 idle。

RPC 模式里还额外有一个 `agent_settled`——`agent_end` 之后可能还跟着自动重试、压缩后重跑、队列续跑。做界面时用 `agent_end` 关 loading，会出现转圈停了但字还在往外冒的情况。

:::

## 八、六条设计取舍

上面的结构里能反推出 Pi 的取向。每一条都有代价，只讲好处就成软文了。

### 核心小，工作流外推

官方在 `packages/coding-agent/docs/usage.md:304` 的 Design Principles 里写明，故意不内置 MCP、sub-agents、权限弹窗、plan mode、to-dos、后台 bash，清单在 `usage.md:308`。

换来的是核心稳定、升级不容易炸，每个人装自己需要的东西。代价是开箱即用程度低，很多人第一反应是"这也没有"；同一个能力在社区里有多个互不兼容的实现。

### 单向依赖

换来的是任何一层都能单独测试、单独复用。代价是跨层传信息只能靠参数和回调，写起来比直接读全局状态麻烦。

### 事件驱动而非回调嵌套

换来的是订阅者随便加而接口不膨胀。代价是事件顺序变成了隐式契约——并行工具模式下 `tool_result` 和 `tool_execution_end` 会交错，这件事只写在文档里，类型系统管不住（第 04 章）。

### 扩展优于修改

副作用前只留一个钩子 `beforeToolCall`，让扩展层去表达权限、审计、路径保护。

换来的是不改核心就能实现绝大多数需求。代价是扩展和 pi 同权限、是任意代码，不构成沙箱；而且有些语义扩展层根本表达不了，第 09 章列了五类。

### 数据优于分支

Provider 之间的差异不写成 `if (provider === "openai")`，而是收敛成模型对象上的 `compat` 数据。

换来的是加一家厂商等于加一条数据。代价是 `compat` 能统一请求格式，统一不了效果——同一个 prompt 在不同模型上表现仍然不同（第 08 章）。

### 渐进式复杂度

直接跑 `pi` 就是个聊天框，要工具有工具，要扩展有扩展，要 SDK 有 SDK。

换来的是上手成本低。代价是能力藏得深，很多人用了很久都不知道有 `/tree` 和动态工具加载。

## 九、这套架构没解决什么

- **恢复语义。** 现役的 `AgentSession` 没有对崩溃恢复做显式建模。新一代 `AgentHarness` 有完整设计，但编排器的方法体全部未实现，调用会抛 `HarnessNotImplemented`（`packages/agent/src/harness/agent-harness.ts:233`）。
- **并发单位。** 现役没有"同时跑多个任务"的抽象；新一代有 `AgentLane`，同样没接线。
- **隔离。** 架构层面完全没有沙箱，扩展与 pi 同权限。隔离只能来自操作系统或容器（第 10 章）。
- **多 Agent。** 只有 `examples/extensions/subagent/` 一个示例，没有调度、路由、仲裁。
- **效果一致性。** `compat` 抹平协议差异，抹不平模型能力差异。

:::danger 引用新一代类型时的规矩

`packages/agent/src/harness/` 共 10059 行，其中 `reducer.ts`、`compaction/`、`session/`、`telemetry.ts` 都是**已实现**的；未实现的只有编排器 `agent-harness.ts` 的方法体。

准确的说法是：作者已经把新一代的恢复语义和存储层写完并测试了，还没接上编排器。不能说成"Pi 已经支持断点续跑"。第 07 章给概览。

:::

## 十、未验证与推断

- ✅ 依赖关系、行数统计、`agentLoop` 签名、`AgentContext` 三字段、`AgentLoopConfig` 十一个字段、`harness/` 的实现状态，都是读源码得出并经 `check:refs` 校验
- ⚠️ 六条设计取舍中，第一条有官方原文出处，其余五条是从代码结构归纳的
- ⚠️ 每条取舍的"代价"未逐条实测
- ❌ 一次完整请求的落点尚未实跑打点验证，第 02 章补

## 十一、本章小结

- Pi 做的事：把模型的决定翻译成本机动作，再把结果翻译回文字。这个角色叫 harness
- 分四层：入口 → 产品层 → 循环层 → 模型层，工具挂在循环层下面
- 拆包的依据不是代码整洁，是三段职责的**变化频率不同**
- 判断解耦看缺失的依赖：`agent-core` 不依赖 `tui`，`ai` 不知道 Agent 存在
- 循环层看到的世界只有三个字段，所以压缩必须在进循环之前完成
- 通用 Harness 的难点全写在 `AgentLoopConfig` 的十一个回调上
- 12 万行不在循环里，在"喂给循环的东西怎么来"

<details>
<summary>本章源码索引</summary>

| 符号 | 位置 |
|---|---|
| `agentLoop` | `packages/agent/src/agent-loop.ts:31` |
| `StreamFn` | `packages/agent/src/types.ts:28` |
| `AgentLoopConfig` | `packages/agent/src/types.ts:149` |
| `AgentContext` | `packages/agent/src/types.ts:412` |
| `AgentEvent` | `packages/agent/src/types.ts:428` |
| `Agent` 类 | `packages/agent/src/agent.ts:173` |
| `AgentSession` | `packages/coding-agent/src/core/agent-session.ts:310` |
| `HarnessNotImplemented` 抛出点 | `packages/agent/src/harness/agent-harness.ts:233` |
| Design Principles | `packages/coding-agent/docs/usage.md:304`，六项清单在 `usage.md:308` |

</details>

## 下一步

→ [02 一条消息的旅程](./02-message-journey/) — 按下回车之后、真正发给模型之前，这条链路上一共有十四道闸。哪一道出问题会导致"它没按我说的做"。
