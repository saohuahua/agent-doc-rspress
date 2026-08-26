# agent-doc 文档重写计划

> 日期：2026-08-26
> 状态：Draft 待确认
> 前置：PI_AGENT_HANDOFF.md 已定稿，Pi v0.84.3 已 clone 到 `D:\project\ts-pi\pi`

---

## 1 背景

旧 `docs/` 7 章基于废止的 LoopLedger Runtime，全部失效。按 HANDOFF 决策清空重写，分两大板块。

---

## 2 整体结构

```
docs/
├── learn/                  ← Part 1：Learn Agent 基础
├── pi/                     ← Part 2：Pi Agent 项目
│   ├── guide/              ←   使用与配置
│   ├── source/             ←   源码深入（HANDOFF 00-07）
│   └── lab/                ←   二次开发与实验（HANDOFF 08 + 改造计划）
└── index.md
```

---

## 3 Part 1：Learn Agent

### 定位

面向"会写代码但不了解 Agent"的读者。目标是建立可靠的心智模型，**不是教 Pi 的用法，也不是讲 Pi 的源码**。

### 写作原则

参考 `minimal-agent.md` 和 Learn Claude Code s01-s04 的风格：

- **每篇只增加一个主要认知点**，不一次性铺开所有概念
- **用最小例子讲原理**：伪代码或简化 TypeScript，30 行以内能跑完一个概念
- **先提出问题，再给解法**：每篇开头是"上一篇留下了什么缺口"
- **结尾点到为止**：用一句话或一个表格说"这个概念在 Pi 中对应什么"，不展开实现
- **不提前引入后面的概念**：讲 Tool 时不提 Permission，讲 Loop 时不提 Compaction
- **页末固定三件事**：本篇学到了什么 → 在 Pi 中对应什么 → 下一篇要解决什么

### 目录

```
learn/
├── index.md                          # 学习路线总览
├── 01-what-is-agent.md               # 普通聊天 vs Agent
├── 02-minimal-loop.md                # 最小 Agent Loop
├── 03-tool-basics.md                 # 工具的定义与执行
├── 04-message-and-context.md         # 消息、角色与上下文窗口
├── 05-streaming-and-events.md        # 流式输出与事件
├── 06-multi-turn.md                  # 多轮交互与用户插队
├── 07-side-effects-and-safety.md     # 副作用与安全边界
└── 08-session-and-persistence.md     # 会话保存与恢复
```

### 各章要点

**01 普通聊天 vs Agent**

本篇问题：LLM 不是已经很强了吗，为什么还需要 Agent？

内容：
- 普通聊天是一条直线：`用户问题 → LLM → 文本回答`

```typescript
const answer = await llm.chat([{ role: 'user', content: '北京今天冷吗？' }]);
// 模型只能回答训练时知道的内容，不能查实时天气
```

- Agent 是一个循环：模型可以提出"我要用某个工具"，程序执行后把结果还给模型，模型再决定下一步
- 用一个天气查询的例子对比：Chat 只能猜，Agent 能查
- Agent 不是"更聪明的 Chat"，而是"程序给了模型做事的能力"

> 在 Pi 中：这个循环在 `packages/agent/src/agent-loop.ts` 的 `runLoop` 函数里

---

**02 最小 Agent Loop**

本篇问题：这个循环具体长什么样？

核心代码（参考 minimal-agent.md 第 3 节）：

```typescript
async function runAgent(question: string, tools: Tool[]) {
  const messages = [{ role: 'user', content: question }];

  while (true) {
    const response = await llm.chat(messages, { tools });

    if (response.type === 'text') {
      return response.text; // 没有工具调用，直接返回
    }

    // 模型要求调用工具
    const tool = tools.find(t => t.name === response.toolCall.name);
    const result = await tool.execute(response.toolCall.arguments);

    // 把工具结果放回消息列表
    messages.push({ role: 'assistant', content: response.toolCall });
    messages.push({ role: 'tool', name: tool.name, content: result });
    // 继续循环，让模型看到结果后决定下一步
  }
}
```

- 画一个运行过程图：用户提问 → 模型调工具 → 执行 → 结果回填 → 模型继续
- 为什么循环而不是两次请求？因为下一步取决于上一步的结果

> 在 Pi 中：`agentLoop()` 和 `runLoop()` 就是这个循环的生产版本

---

**03 工具的定义与执行**

本篇问题：上一篇的 `tool.execute()` 具体是什么？

工具的最小结构：

```typescript
type Tool = {
  name: string;           // 唯一标识
  description: string;    // 告诉模型这个工具能做什么
  execute: (args: unknown) => Promise<string>;
};

const getWeather: Tool = {
  name: 'get_weather',
  description: '查询一个城市当前的天气',
  async execute(args) {
    const city = (args as { city: string }).city;
    return `${city}：晴，22°C`;
  },
};
```

- 关键：模型不能直接执行函数，只能提出结构化请求（toolCall），程序校验后执行
- 一次可以调多个工具吗？可以，需要决定并行还是串行
- 失败怎么办？返回错误结果，模型看到错误后自行决定下一步

> 在 Pi 中：工具用 `AgentTool` 接口定义，执行在 `executeToolCalls()` 里

---

**04 消息、角色与上下文窗口**

本篇问题：循环中的 `messages` 到底是什么结构？

四种角色：

```typescript
const messages = [
  { role: 'system',    content: '你是一个编码助手' },     // 系统指令
  { role: 'user',      content: '帮我看看这个文件' },     // 用户输入
  { role: 'assistant', content: { toolCall: { ... } } },  // 模型回答
  { role: 'tool',      content: '文件内容...' },          // 工具结果
];
```

- 每次调 LLM 都把完整列表传过去，模型靠这个列表理解上下文
- 问题：上下文窗口有大小限制（Token），5 轮对话后消息就可能很长
- 用一个例子展示消息列表的增长曲线
- 超了怎么办？后面会讲的压缩（Compaction）就是为了解决这个问题

> 在 Pi 中：消息类型定义在 `pi-ai` 包，上下文压缩在 `harness/compaction/` 里

---

**05 流式输出与事件**

本篇问题：LLM 的回答是一次性返回的吗？

不是。用时间线展示流式过程：

```
时间 →
  [text_delta: "让"] [text_delta: "我"] [text_delta: "看看"] ...
  [toolCall_start: read_file] [args_delta: {"path":"/src"}]
  [message_end: stopReason="tool_use"]
```

- 流式的好处：用户能看到"正在思考"，不用干等完整回答
- 完整消息结束后（收到 `message_end`），Agent 才决定是否执行工具
- 流式还是完整？模型 API 通常两种都支持，Agent 用流式以提升体验

> 在 Pi 中：流式调用通过 `streamFn` 注入，`streamAssistantResponse()` 处理流事件

---

**06 多轮交互与用户插队**

本篇问题：Agent 在工作时，用户能打断它吗？

场景：

```
Agent 正在执行第 3 个工具调用...

用户打字："等等，先看 src 目录"       ← 这是 Steering（插入当前轮）
用户打字："做完这个再帮我看测试"       ← 这是 Follow-up（等完再处理）
```

- 内层循环处理 Tool Call + Steering 消息
- 外层循环处理 Follow-up 消息
- 区别：Steering 尽快影响当前工作，Follow-up 等当前任务结束

> 在 Pi 中：`getSteeringMessages()` 和 `getFollowUpMessages()` 提供这两种消息

---

**07 副作用与安全边界**

本篇问题：Agent 能执行 `rm -rf /` 吗？

最简单的拦截机制：

```typescript
async function beforeToolCall(toolName: string, args: unknown) {
  if (toolName === 'bash' && isSensitiveCommand(args)) {
    return { block: true, reason: '危险命令，已拒绝' };
  }
  return { block: false };
}
```

- 读文件和删文件风险完全不同，需要区分
- 三种策略：允许（Allow）、拒绝（Deny）、询问用户（Ask）
- 无 UI 模式下 Ask 应默认拒绝
- 这不是万能的——真正的隔离需要操作系统级 Sandbox

> 在 Pi 中：`beforeToolCall` 钩子返回 `{ block: true }` 阻止执行

---

**08 会话保存与恢复**

本篇问题：关掉终端，之前的对话就丢了吗？

最简单的持久化：

```typescript
// 保存
fs.writeFileSync('session.jsonl',
  messages.map(m => JSON.stringify(m)).join('\n')
);

// 恢复
const messages = fs.readFileSync('session.jsonl', 'utf-8')
  .split('\n').map(line => JSON.parse(line));
```

- 但崩溃恢复没这么简单：工具执行到一半崩了怎么办？
- 区分"安全重放"和"不能重放"：读文件可以重放，发邮件不行
- 会话可以分叉（Branch）：在某个节点走不同方向
- 历史太长时压缩（Compaction）：把早期对话总结为摘要

> 在 Pi 中：Session 用 JSONL 保存，支持 Resume / Fork / Navigate，`HarnessTool.replay` 区分 safe 和 never

---

### 每篇结尾固定格式

```markdown
## 本篇小结

- 学到了什么（一句话）

## 在 Pi 中

| 本篇概念 | Pi 中的对应 | 位置 |
|---|---|---|
| xxx | yyy | `packages/xxx` |

## 下一篇

→ [标题] — 上一篇没解决的问题是什么
```

---

## 4 Part 2：Pi Agent

### 4.1 guide/ — 使用与配置

参考官方文档 + 中文翻译，结合自己使用经验重写。

```
pi/guide/
├── index.md                    # Pi Agent 概述
│
├── getting-started/            # 从这里开始
│   ├── quickstart.md           # 快速开始
│   ├── usage.md                # 使用 Pi（模式、命令、常用操作）
│   ├── providers.md            # Providers 配置
│   ├── security.md             # 安全模型
│   ├── settings.md             # 设置
│   ├── keybindings.md          # 快捷键
│   ├── sessions.md             # 会话管理
│   └── compaction.md           # 上下文压缩
│
├── customization.md            # 自定义（一页，简要介绍各扩展点的定位和配置）
│
├── reference/                  # 参考
│   ├── session-format.md       # 会话文件格式
│   └── environment-variables.md
│
├── programmatic/               # 编程式使用
│   ├── sdk.md
│   ├── rpc.md
│   ├── json.md
│   └── tui.md
│
└── platform/                   # 平台设置
    ├── windows.md
    ├── containerization.md
    ├── terminal-setup.md
    └── shell-aliases.md
```

**customization.md** 只做一页速查：Extension / Skill / Prompt Template / Theme / Package / Custom Model / Custom Provider 分别是什么、怎么配置、什么时候用。机制细节在 source/06 里讲。

### 4.2 source/ — 源码深入

对应 HANDOFF 00-07 章。基于 Pi v0.84.3 真实源码，**复刻 pi-doc-cn/source/ 的写作风格**。

```
pi/source/
├── index.md                          # 源码阅读路线总览
├── 00-baseline.md                    # 基线与仓库地图
├── 01-cli-to-tui.md                  # 启动链路（CLI → main → TUI）
├── 02-provider-and-models.md         # Provider 与模型流
├── 03-agent-loop.md                  # Agent Loop 与 Tool 执行
├── 04-coding-agent.md                # Coding Agent 与 Workspace
├── 05-session-and-compaction.md      # Session Context 与 Compaction
├── 06-extension-and-package.md       # Extension Package Skill 扩展体系
├── 07-permission-and-recovery.md     # Permission HITL 与 Recovery
└── 08-agent-session-rpc.md           # AgentSession RPC 与 Pi Web
```

**各章核心**：

| 章 | HANDOFF 对应 | 核心源码 | 要讲清楚的事 |
|---|---|---|---|
| 00 | §8.00 | `packages/` 整体 | 10 个包的责任边界（pi-ai / pi-agent-core / pi-coding-agent / pi-tui / pi-protocol / pi-client / pi-server / pi-telemetry / pi-evals / session-backends），一次最小 Prompt Trace |
| 01 | — | `cli.ts` → `main.ts` → `interactive-mode.ts` | 四种运行模式、项目信任、createRuntime 工厂、TUI raw mode |
| 02 | §8.01 | `pi-ai/src/` | Provider 注册、Model 目录、流事件类型、认证 |
| 03 | §8.02 | `agent-loop.ts` | 双层循环（inner/outer）、stopReason 分支、工具执行模式、prepareNextTurn 钩子 |
| 04 | §8.03 | `coding-agent/src/core/tools/` | 内置工具实现、System Prompt 构建、路径安全、输出截断 |
| 05 | §8.04 | `harness/session/`、`harness/compaction/` | Session JSONL 和 Entry 类型、Branch、Compaction 策略 |
| 06 | §8.05 | `coding-agent/src/extensions/` | Extension 生命周期、11 个 HookName、Package 加载 |
| 07 | §8.06 | `agent-harness.ts`、`project-trust.ts` | 错误类型体系、RunOutcome 四态、SuspendedOperation、replay safe/never |
| 08 | §8.07 | `rpc-entry.ts`、`protocol/` | RPC 入口、CBOR framing、AgentLane API、Pi Web 连接 |

**写作风格（复刻 pi-doc-cn/source/）**：

- 版本标注：`以 Pi v0.84.3 源码为基准`
- 全景图：ASCII art 流程树开头
- 阶段拆解：`### 阶段 N：标题`，每段标注 `**文件**：packages/xxx/src/xxx.ts`
- 代码后解释：编号列表或"这个文件只做 N 件事"
- 对比表格：模式、类型、方案对比
- 概念总结：每篇末尾表格（概念 | 解释 | 代码位置）
- 下一步：`→ [标题](链接) — 一句话预告`

**HANDOFF 产物**：每篇末尾折叠区域覆盖 §7 的 14 项产物：

```markdown
---

## 学习产物

### 技术设计

> Problem → Constraints → Baseline → Options → Decision
> → Tradeoffs → Failure Paths → Evidence

<details>
<summary>STAR 总结</summary>
学习成果型，Result 可留空标记"待补充"。初期每章一个，后续可追加。
</details>

<details>
<summary>面试问题与回答</summary>
</details>

<details>
<summary>替代方案与取舍</summary>
</details>

<details>
<summary>仍未理解和仍未验证事项</summary>
</details>
```

### 4.3 lab/ — 二次开发与实验

```
pi/lab/
├── index.md                    # 实验总览：阶梯、EXP 编号、进入条件
├── roadmap.md                  # 二次开发路线图
├── conformance-assets.md       # LoopLedger 可转化资产清单
└── experiments/
    └── exp-001-xxx.md          # 具体实验（HANDOFF §10 模板）
```

**roadmap.md 大纲**：

```
# Pi 二次开发路线图

## 实验阶梯（HANDOFF §9）
- Level 0：Config / Skill / Prompt / Theme / 已有 Package
- Level 1：自有 Extension
- Level 2：AgentSession SDK 或 RPC Wrapper
- Level 3：最小 Core Patch（需证据）

## 进入 Core 的条件
（5 条证据要求，来自 HANDOFF §9）

## 通常不应修改 Core 的功能
（清单，来自 HANDOFF §9）

## 差异化主线一：Permission HITL 与 Workspace 安全
- 要掌握的 5 个点
- 预期产出

## 差异化主线二：断点续跑与 Outcome Unknown
- 要掌握的 5 个点
- 预期产出

## 差异化主线三：Model Profile 与迁移 Conformance
- 要掌握的 5 个点
- 预期产出

## 建议只完成其中两条并做深
```

**conformance-assets.md 大纲**：

```
# LoopLedger Conformance 资产

## 可转化资产
| 资产 | 旧来源 | Pi 对照点 |
（7 类资产 + 对应的 Pi 机制）

## 废止的旧前提
（不迁移 Event Ledger、自研 ModelAdapter、自研 Checkpoint）
```

---

## 5 代码引用规范

- 所有代码块标注出处：`**文件**：packages/agent/src/agent-loop.ts:160-280`
- 引用类型时标注包和路径：`AgentLoopConfig`（`packages/agent/src/types.ts`）
- 不使用本机绝对路径，用仓库相对路径
- Part 1 的代码是伪代码，**不标出处**；只在末尾"在 Pi 中"表格里指向真实文件
- Part 2 的代码全部来自 Pi 源码，**必须标出处**

---

## 6 EXP 编号

三轨道（Pi Fork / Pi Web / agent-doc）共享 `EXP-xxx` 编号。`lab/index.md` 维护索引。

---

## 7 执行阶段

```
Phase A — 基础设施
  ├── 旧文档归档到 .archive/loopledger-docs-20260826/
  ├── 建立新目录（learn/ + pi/guide/ + pi/source/ + pi/lab/）
  ├── 所有目录放占位 index.md
  ├── 更新 VitePress config 和 navigation
  └── 更新首页

Phase B — Learn Agent
  └── 完成 learn/01 ~ learn/08

Phase C — Pi Guide
  ├── 完成 guide/getting-started/
  ├── 完成 guide/customization.md
  └── 完成 guide/reference/ + programmatic/ + platform/

Phase D — Pi Source
  ├── 完成 source/00 ~ source/04
  ├── 完成 source/05 ~ source/08
  └── 每章满足 HANDOFF DoD

Phase E — Lab
  ├── 完成 lab/roadmap.md + conformance-assets.md
  ├── 选定实验方向，完成 exp-001
  └── 回填 STAR Result
```

---

## 8 确认后执行 Phase A
