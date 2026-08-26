# Pi Agent学习型软分叉项目交接文档

> 交接时间 2026-08-26
>
> 修订时间 2026-08-26 第二次修订 基于 Pi v0.84.3 源码核查
>
> 文档状态 Final Handoff 学习路线已按源码核查结果修订
>
> 下一阶段 在新的独立文件夹Fork Pi并开始基础到核心的章节化学习
>
> 本次修订范围 §2 §3 §4 §6 §7 §8 §12 §15 §17 §20
>
> 本次未修订 §9 §10 §11 §16 §17-Phase4 属于lab二次开发范围 待选题确认后单独修订
>
> 项目背景：前端开发人员的 秋招简历的项目，用于投递agent开发or前端开发。最终是想有一个agent+前端 pi web 类型的项目。能够在2周内快速入门基础，agent基础 知识，pi相关知识，3-4周甚至之后可以进行二次开发拓展。

## 1 最终决策

正式选择 [Pi](https://github.com/earendil-works/pi) 作为Agent主项目

不继续把LoopLedger发展为第二套自研生产Runtime

不选择OpenCode整仓二开

保留 [pi-web](https://github.com/agegr/pi-web) 的Next.js和React架构 只做UI和展示功能二开

项目路线定义为

> 基于Pi成熟Coding Agent进行学习型软分叉 通过Package Extension AgentSession和受控Core实验学习Agent设计 并以可复现的前后对比形成简历差异化

## 2 为什么这条路线成立

### 已核验事实

以下事实基于 Pi v0.84.3 本机源码逐条核查 带行号的均已 grep 验证

**许可与工程**

- Pi使用MIT License并提供Fork与Rebranding配置 `LICENSE:1`
- Pi使用Node 22和npm workspaces `package.json` `engines.node >=22.19.0`

**仓库结构 修正原文的四包表述**

- Pi实际有10个包 不是4个 `agent` `ai` `client` `coding-agent` `evals` `protocol` `server` `session-backends` `telemetry` `tui`
- 仓库内 `packages/coding-agent/docs/development.md:66` 的项目结构说明仍写着4个包 该文档已过时 以 `packages/` 实际目录为准
- src规模约12万行 `coding-agent` 60784 `ai` 23581 `tui` 16790 `agent` 12635 测试文件470个
- 最大单文件 `modes/interactive/interactive-mode.ts` 6549行 其次 `core/agent-session.ts` 3495行

**两代运行时并存 这是当前最重要的事实**

- 生产路径是 `packages/coding-agent/src/core/agent-session.ts` 的 AgentSession 共3495行
- 新一代 `packages/agent/src/harness/agent-harness.ts` 仅约450行 接口与持久化schema完整 但方法体全部 `return this.unavailable(...)` 抛 `HarnessNotImplemented`
- `AgentHarness.create()` 遇到已有record直接 `throw new HarnessNotImplemented("create.restore")` `agent-harness.ts:351`
- `hooks.on()` 与 `events.on()` 同样抛异常 `agent-harness.ts:233`
- 结论不变 成熟生产路径仍应使用 AgentSession

**AgentHarness 已定义但未实现的类型 涉及§11选题 引用时必须标注未实现**

- `HarnessTool = AgentTool & { replay?: "never" | "safe" }` `agent-harness.ts:237`
- `ToolStartedRecord` 含 `effectiveArgs` `resultEntryId` `replay` `session/types.ts:149`
- `SuspendedOperation.reason: "crash" | "deferred"` 与 `missing: { tools, models }` `agent-harness.ts:139`
- `MissingIdentities` 错误类型 `agent-harness.ts:34`
- 11个 `HookName` 含 `before_tool` `after_tool` `agent-harness.ts:196`
- 上述均为上游已发布的设计 不是本项目原创 简历与文档表述必须区分设计与实现

**远程访问有两条路径 修正原文只写JSONL的表述**

- 现役 RPC mode 走 stdin/stdout JSONL 严格LF分帧 `docs/rpc.md:29` 文档特别说明 Node `readline` 不合规
- 实验中的新栈 `packages/protocol` 使用 CBOR + 4字节大端长度前缀 配 `packages/client` 与 `packages/server`
- `packages/server` 自述为 experimental 近30天 server/protocol/client 合计288次文件改动 变动中

**扩展与隔离能力**

- Pi Package可组合Extension Skill Prompt和Theme
- 官方Extension示例70余个 覆盖Tool Provider Permission Gate Protected Path Compaction Sandbox Subagent Plan Mode Todo和TUI定制
- OS级隔离已存在 不是空白 `examples/extensions/sandbox/` 用 `@anthropic-ai/sandbox-runtime` macOS走sandbox-exec Linux走bubblewrap
- `examples/extensions/gondolin/` 提供Linux micro-VM 把 read write edit bash grep find ls 全部路由进VM
- `docs/containerization.md` 给出 Gondolin / Docker / OpenShell 三种模式对比
- `tool_call` 事件在副作用前触发 可阻断 且 `event.input` 可原地修改并且不重新校验 `docs/extensions.md:762`

**上游速度 影响一切计划**

- 近30天690次提交 约23次/天
- 近30天文件改动 coding-agent 1046 agent 628 ai 506 tui 302
- 曾存在的 `packages/storage/` 已不在当前目录 包会被整体重命名或移除
- src全仓仅1处TODO 且是等待bun修复外部依赖 代码库很干净 不存在明显待填的坑

**pi-web 本机未clone 以下为文档转述 未核验**

- pi-web使用MIT License和Next.js React TypeScript
- pi-web在Next Server内直接创建Pi AgentSession并共享Pi认证 Settings Package Skill和Session JSONL
- pi-web已有Session Branch Context Cost Compaction File Diff Worktree Model Plugin和Skill管理

### 推断

Pi能减少Provider Tool Loop Session TUI和模型配置等无差异基础设施工作

它的扩展阶梯允许同一个设计假设先用Package或Extension验证 必要时再进入SDK或Core

这比同时维护多个Agent Runtime更适合个人学习 Vibe Coding和面试准备

### 必须纠正的前提

Fork成熟项目不会自动让所有Bug减少

上游保障只覆盖未修改路径 自有Core Patch和第三方Package仍需自己验证

面试不要求理解Pi每一行代码 但会追问简历声称的核心链路

没有数据结构 失败路径 Fixture和指标的设计不能作为个人核心贡献

## 3 项目定位

建议工作名

> Pi Reliability Lab

简历定位候选

> 基于Pi Coding Agent的学习型软分叉 通过章节化文档拆解其Agent Loop 工具执行 Session持久化 模型兼容层与扩展体系的设计取舍 并在扩展层完成二次开发验证

措辞规则 由§2已核验事实推出

- `replay` `SuspendedOperation` `MissingIdentities` 等语义是上游已发布的设计 不得表述为本人设计
- 引用 AgentHarness 任何能力时必须同时说明其方法体未实现 生产路径仍是 AgentSession
- 允许的表述是 拆解了某设计并能说明取舍 实现了某扩展并有过程记录
- 不允许的表述是 设计了断点续跑语义 实现了可靠性平台

不应使用的表述

- 完全自研Agent Runtime
- 融合多个框架的全部优点
- 实现完整Exactly Once副作用
- 实现Sandbox但实际只有Permission Prompt
- 实现断点续跑但没有验证中途副作用
- 实现Multi Agent但只有Subagent Tool调用

## 4 三条项目轨道

```text
Pi Fork
  Agent原理学习
  Extension和Core实验
  Conformance与Eval

Pi Web Fork
  UI视觉与信息架构
  Agent状态和实验结果展示
  不维护第二套Runtime

agent-doc
  章节化学习文档
  设计对比与失败记录
  面试问题索引
```

agent-doc 实际目录结构 位于 `D:/project/agent-doc-rspress` 使用 Rspress

```text
docs/
  learn/       Agent通识八篇 已完成 不绑定Pi实现
  pi/source/   Pi源码深入 按设计问题组织 见§8
  pi/lab/      二次开发与实验 选题待定 暂缓
  pi/guide/    Pi使用与配置 优先级最低 有余力再做
  compare/     Pi与其他方案的设计取舍对照
  practice/    本人Pi使用记录与踩坑 即刻开始持续累积
  interview/   按面试问题组织的回答索引 见§12
```

板块职责区分

- `learn/` 是入场券 内容通用 不产生差异性 不追加投入
- `pi/source/` 证明深度 `pi/lab/` 证明动手 `compare/` 证明判断力 `practice/` 证明真实性
- `interview/` 是最终交付物 从其余板块回收 不重复写作

三个项目使用同一个实验编号和版本矩阵关联

示例

```text
EXP-003 durable approval
  Pi Fork      实现语义和Fixture
  Pi Web Fork  展示审批与恢复状态
  agent-doc    记录Baseline取舍结果和STAR
```

## 5 新仓库要求

Pi Fork必须放在新的独立文件夹并作为独立Git仓库

不要clone到旧项目 `D:/project/ts-agent/agent` 内

原因

- 旧规则禁止嵌套Git仓库
- 旧目录已有LoopLedger Runtime和pnpm工程
- Pi使用npm workspaces和自己的发布流程
- 两套Runtime长期共存会重新制造架构混乱

建议Git关系

```text
origin
  自己的Pi Fork

upstream
  https://github.com/earendil-works/pi.git
```

分支约定

- `main` 基于已验证Release Tag并保持可运行
- `experiment/exp-xxx-name` 每个思想实验一个短分支
- Core Patch保持独立Commit并可Revert
- 不直接追踪上游main做日常开发
- 每两到四周评估一次上游安全和Bugfix版本

## 6 学习总路线

修订原则 章节按设计问题组织 不按代码目录组织

原因 按代码目录组织会强迫学习面试不会问的内容 例如启动链路需要啃6549行的 `interactive-mode.ts` 而这部分几乎不产生面试价值

```text
00 仓库地图与最小Trace
  -> 01 两代运行时对照 AgentSession与AgentHarness
  -> 02 Agent Loop与工具执行
  -> 03 Session双流与断点续跑设计
  -> 04 模型抽象 compat兼容层与版本治理
  -> 05 扩展体系与能力边界
```

从原8章的变更

| 原章节 | 处置 |
|---|---|
| 00 基线与仓库地图 | 保留为新00 补10包结构 |
| 01 Provider与模型流 | 重新聚焦为新04 以compat兼容层为主线 |
| 02 Agent Loop与Tool执行 | 保留为新02 |
| 03 Coding Agent与Workspace | 并入新02 |
| 04 Session Context与Compaction | 与原06合并为新03 |
| 05 Extension Package Skill | 保留为新05 |
| 06 Permission HITL Recovery | 与原04合并为新03 |
| 07 AgentSession RPC与Pi Web | 降为新05的一节 因CBOR新栈仍experimental 易过期 |
| 原启动链路计划 | 删除 投入产出比最差 |
| 新增 01 两代运行时对照 | 全新 见下方说明 |

新增01章的理由

Pi正处在 AgentSession 到 AgentHarness 的重构中途 前者3495行在跑生产 后者450行只有设计 两者差集就是作者认为第一版哪里做错了 这是一份权威的 如果重做会怎么做 的答案 且具有时间窗口 等 AgentHarness 实现完成该对照即消失

推荐阅读顺序与编号顺序可以不同 若要先做扩展层实验 可先读05再回头读00到04

每章必须结束后才能把对应能力写进简历

## 7 每章统一产物

修订原因 原14项 乘 8章 等于112项产物 那是研究计划不是学习笔记 且其中过半需要构建Fixture与测量 属于企业工程范畴 不符合学习型项目定位

每章文档必须包含 精简为6项

1. 本章回答哪个面试问题 见§12
2. 问题是什么 必须是一个具体场景 不是抽象描述
3. Pi怎么做的 必须带 `file:line`
4. 为什么这样做 加至少一个替代方案的取舍
5. 边界 抹不平什么 什么情况下失效
6. 未验证标记 哪些是推断 哪些是实际跑过

源码引用硬规则

- 每个符号必须 grep 验证过并标注 `packages/xxx/src/yyy.ts:行号`
- 不使用本机绝对路径 使用仓库相对路径
- 引用 AgentHarness 的类型时必须同时标注其未实现状态
- 建议写一个批量校验脚本 每次改完对照表后跑一遍 防止指错位置

面试问答与STAR不再放在每章内

原方案在每章末尾用折叠区放 STAR 面试问答 替代方案 未验证事项 共8章乘4块等于32个折叠块 初期大半是待补充 会让站点显示为半成品 且面试官检索的是问题不是章节 方向相反

改为独立 `interview/` 板块 按问题组织 每个回答链回对应章节

STAR 结构在 `interview/` 内使用

```text
Problem
Constraints
Baseline
Options
Decision
Tradeoffs
Failure Paths
Evidence
```

再翻译为STAR

```text
Situation
  Pi原始场景和可复现问题

Task
  准备改变的工程目标和不变量

Action
  调研选项 Seam选择 最小修改和验证方法

Result
  Before After结果 指标 失败案例和已知边界
```

没有实际Result时必须标记为设计提案 不能虚构结果

## 8 章节详细要求

对应§6修订后的6章 每章产物按§7的6项执行

### 00 仓库地图与最小Trace

学习目标

- 理解10个包的责任边界 `agent` `ai` `client` `coding-agent` `evals` `protocol` `server` `session-backends` `telemetry` `tui`
- 能说明从用户输入到最终消息的模块调用关系
- 能区分 Agent Core / Coding Agent / AgentSession / AgentHarness / Extension / RPC
- 固定Pi Release Tag Commit Node和npm版本

核心事实

- `docs/development.md:66` 的四包表述已过时 以实际目录为准 这个坑本身值得记录
- src约12万行 最大文件 `interactive-mode.ts` 6549行 不要试图通读

产物

- 总体模块图
- 一次最小Prompt Trace
- 上游版本记录
- 官方检查与本机Smoke结果

面试重点

- AI Coding整体实现思路
- Harness和普通LLM Chat的差别
- 为什么选择Pi而不是从零自研或OpenCode

### 01 两代运行时对照

本章为新增 是整个source板块差异性的核心 优先级最高

学习目标

- 说清 AgentSession 与 AgentHarness 的差集 以及差集背后的意图
- 能回答 如果重新设计你会怎么做 且答案有出处

核心源码

| 维度 | AgentSession | AgentHarness |
|---|---|---|
| 位置 | `coding-agent/src/core/agent-session.ts` | `agent/src/harness/agent-harness.ts` |
| 规模 | 3495行 | 约450行 |
| 状态 | 跑生产 | 方法体全部 `HarnessNotImplemented` |
| 错误处理 | throw | `Result<T,E>` 加 `TaggedError` 见 `harness/result.ts` |
| 并发单位 | 无显式抽象 | `AgentLane` 加 `LaneBusy` |
| 崩溃恢复 | 无显式建模 | `SuspendedOperation{reason:"crash"\|"deferred"}` |
| 工具重放 | 无 | `replay:"never"\|"safe"` 加 `ToolStartedRecord` |

要讲清楚的设计点

- 两级错误 预期内拒绝用 `Result` 加 `TaggedError` 例如 `LaneBusy` `NothingToResume` 程序bug用普通 Error 例如 `HarnessFault` `HarnessNotImplemented`
- 先定接口再补实现 接口完整发布 方法体抛 NotImplemented 让下游可以先编译对接 这本身是一种可命名的设计手法

产物

- 两代对照表
- 差集清单与每项的意图推断 推断必须标注为推断

面试重点

- 如果让你重新做这个题目 正确的步骤应该怎么做
- 通用Harness的核心工程能力需要具备哪些技术难点

### 02 Agent Loop与工具执行

原02与原03合并

学习目标

- 一次Turn和多轮Tool Loop 内外双层循环
- Tool参数校验 执行 结果回填和错误
- 并行与串行Tool Steering Follow Up Abort和Late Result
- 内置工具 System Prompt构建 路径安全 输出截断

核心源码 均已核验

- `agent/src/agent-loop.ts:31` `agentLoop`
- `agent-loop.ts:116` `runLoop`
- `agent-loop.ts:193` `streamAssistantResponse`
- `agent-loop.ts:214` `executeToolCalls`
- `agent-loop.ts:167` `getSteeringMessages`
- `agent-loop.ts:263` `getFollowUpMessages`
- `agent-loop.ts:232` `prepareNextTurn`
- `agent-loop.ts:619` `beforeToolCall`

产物

- Text Only与Tool Call两条Trace
- 一个失败Trace 工具报错或Abort
- Tool Call与Result配对顺序说明

面试重点

- AI执行准确性和可靠性
- Tool结果错误如何处理
- Coding Agent为什么需要专用Tool

### 03 Session双流与断点续跑设计

原04与原06合并 这是最能撑住面试的一章

学习目标

- 区分 Entry 与 Record 两条流 前者是模型看到的对话 后者是运行时恢复用的日志
- 说清三个崩溃切点 决定前 执行中 完成但结果未落盘
- 说清为什么 `resultEntryId` 必须预分配
- Context构建 Token估算与Compaction

核心源码

- `agent/src/harness/session/types.ts` Entry与Record类型
- `session/types.ts:149` `ToolStartedRecord` 含 `effectiveArgs` `resultEntryId` `replay`
- `agent-harness.ts:139` `SuspendedOperation`
- `agent-harness.ts:34` `MissingIdentities`
- `agent/src/harness/compaction/compaction.ts`
- `coding-agent/src/core/agent-session.ts:3085` `navigateTree` 真实实现在这里

必须标注的边界

- 上述恢复语义目前只有设计与schema AgentHarness的 `resume()` 抛 NotImplemented 生产路径仍是 AgentSession
- 讲述时不得写成 Pi已经这样运行

产物

- Session格式图 含Entry与Record双流
- 三个崩溃切点状态表
- Compaction前后Context对比

面试重点

- 断点续跑这个能力应该怎么样实现
- 数据不一致有没有回滚机制 怎么定位和修复
- Context为什么会溢出

### 04 模型抽象 compat兼容层与版本治理

原01重新聚焦 从罗列Provider改为聚焦兼容层设计

学习目标

- 说清 `Model.compat` 如何把provider差异从控制流收敛成数据
- 说清模型元数据为何是生成物而非手写

核心源码

- `ai/src/types.ts:562-620` `compat` 字段 含 `reasoningFormat` 十余种取值 `maxTokensField` `deferredToolsMode`
- `ai/src/types.ts:359` `thinkingSignature` provider绑定的reasoning重放数据
- `packages/ai/src/models.generated.ts` 生成物 仓库规则禁止直接修改 改 `scripts/generate-models.ts` 后重新生成

要讲清楚的设计点

- 朴素做法是按provider分支散落各处 加一家改十处
- Pi把差异变成模型上的数据对象 加一家等于加一条数据
- compat能统一请求格式 统一不了效果 效果差异只能跑固定任务对比

产物

- compat字段作用表
- 一个模型切换实验或明确标注未做

面试重点

- 这个项目怎么做模型版本管理
- 从开源模型切到商用API怎么保证兼容性和平滑过渡

### 05 扩展体系与能力边界

原05 并入原07的RPC内容 是lab板块的直接前置

学习目标

- Extension生命周期与事件 11个HookName各自时机
- Tool覆盖 Provider注册 Command与TUI定制
- Package的npm git local来源与审查
- 扩展层能表达什么 不能表达什么

核心源码与文档

- `docs/extensions.md` 3002行 是全仓最重要的扩展文档
- `docs/extensions.md:762` `tool_call` 在副作用前触发 可阻断 `event.input` 可原地改且不重新校验
- `docs/extensions.md:220` 长期资源规则 不在factory起后台资源 在 `session_start` 起 注册幂等 `session_shutdown`
- `docs/extensions.md:1347` `registerTool` 启动后可调用 当场生效
- `docs/extensions.md:2345` Dynamic Tool Loading 加载器模式与原生deferred loading
- `docs/usage.md:306` Design Principles 官方声明故意不内置的六项

RPC与远程 降为本章一节

- 现役 JSONL over stdin/stdout `docs/rpc.md:29`
- 实验中 CBOR加长度前缀 `packages/protocol` `client` `server` 标注为experimental 易过期 不深入

产物

- 11个HookName时机表
- 扩展层能力边界清单 即什么情况下必须进Core
- 一个第三方Package审查记录

面试重点

- 为什么先扩展而不是修改Core
- Extension Interface表达不了什么
- 如何控制第三方Package风险

### 08 单一Core差异化实验

只允许选择一个主题

- Durable Approval
- Outcome Unknown Recovery
- Model Profile与迁移Conformance

进入条件

- 已有失败Baseline Fixture
- Extension和SDK不足已有证据
- 修改不超过受控Patch预算
- 有独立Revert路径
- 能说明上游同步成本

Multi Agent只能作为后续方向 除非前三条主线已经收敛

## 9 实验阶梯

任何想法必须从最低层开始

```text
Level 0
  Config Skill Prompt Theme和已有Package

Level 1
  自有Extension

Level 2
  AgentSession SDK或RPC Wrapper

Level 3
  最小Core Patch
```

进入Core的证据必须至少满足一项

- Hook发生太晚 无法在副作用前保证不变量
- Extension状态无法恢复目标语义
- Hook无法原子写入所需Session状态
- 需要改变Tool调度 Abort或Late Result顺序
- 需要增加一个窄Hook而不是直接植入完整功能

通常不应修改Core的功能

- Custom Tool
- Custom Provider
- Skill Prompt Theme
- 普通Permission规则和Protected Path
- TUI和Web UI
- MCP和普通Subagent
- 产品名称 Logo和配置默认值

## 10 实验文档模板

```markdown
# EXP-xxx 实验名

## Baseline
固定Pi版本和原始行为

## Problem
可复现的问题和用户影响

## Hypothesis
准备验证的设计假设

## Seam
config package extension sdk rpc或core patch

## Before Fixture
修改前失败或暴露差异的场景

## Change
最小修改和明确不修改的范围

## After Fixture
相同输入下的新行为

## Eval
正确性 安全 延迟 Token 成本和恢复指标

## Result
confirmed rejected或inconclusive

## Upstream Impact
冲突面和是否值得提交上游

## Revert
删除Package Extension或回退Patch的方法
```

思想来源必须记录

| 字段 | 要求 |
|---|---|
| Source | 官方Repo Commit Issue PR或论文 |
| Idea | 只描述吸收的设计思想 |
| License | 复制代码时记录License和Notice |
| Implementation | 优先按Pi Interface重新实现 |
| Difference | 明确与来源实现的语义差异 |
| Evidence | Fixture Eval和失败案例 |

## 11 推荐差异化主线

> 本节属于lab二次开发范围 选题尚未最终确认 内容保持原样待单独修订
>
> 但必须先记录一条已核验事实 下列三条主线所依赖的核心语义均已存在于上游 AgentHarness 的类型定义中 详见§2 具体为 `HarnessTool.replay` `ToolStartedRecord` `SuspendedOperation` `MissingIdentities` 以及11个 `HookName`
>
> 这些是上游已发布的设计 不是本项目原创 因此本节的定位应从 设计这些语义 降级为 拆解这些设计并在扩展层验证
>
> 另需注意 官方 `docs/usage.md:306` Design Principles 明确列出故意不内置的六项 MCP sub-agents permission popups plan mode to-dos background bash 并建议做成扩展 其中四项已有官方示例 MCP 与 background bash 无示例 这是选题时的重要参考

### 主线一 Permission HITL与Workspace安全

必须掌握

- Permission Intent和Decision数据结构
- Ask发生在副作用前的哪个位置
- TUI RPC无UI和进程重启行为
- Windows Path Realpath Symlink和New Parent风险
- Permission Prompt和Sandbox的严格边界

### 主线二 断点续跑与Outcome Unknown

必须掌握

- Tool Planned Started Completed的持久化时点
- 不同Crash切点留下的状态
- Safe Replay和Never Replay分类
- Idempotency Key和人工Record Result
- Resume时Model Tool Policy身份校验

### 主线三 Model Profile与迁移Conformance

必须掌握

- Provider Model Thinking Context和Tool能力Profile
- Prompt Tool Provider和模型版本Fingerprint
- 旧Session遇到新Profile的拒绝 降级和迁移策略
- 固定Eval Canary阈值和回退流程

建议只完成其中两条并做深

## 12 面试问题证据矩阵

这12个问题是真实面试问题 它们是文档的规格 章节是对规格的实现 不是反过来

| # | 面试问题 | 支撑章节 | 证据来源 | 强度 |
|---|---|---|---|---|
| 1 | AI Coding整体的实现思路是什么 | 00 02 | 三层结构 一次最小Trace | 强 |
| 2 | 怎么保证执行过程中的准确性和可靠性 | 02 05 | Tool schema校验 `tool_call` 可阻断 `terminate` 语义 | 强 |
| 3 | 你的AI Coding过程为什么跑这么久 问题在哪 | 03 practice | Compaction 重试 `StepAttemptRecord.attempt` 加本人使用记录 | 中 需实际使用 |
| 4 | 如果重新做这个题目 正确步骤应该怎么做 | 01 | 两代运行时差集 有作者的真实答案 | 极强 |
| 5 | 多Agent调度怎么平衡路由准确性和执行效率 | 无 | 仅有 `examples/extensions/subagent/` 无数据 | 弱 必须诚实降级 |
| 6 | 通用Harness的核心工程能力有哪些技术难点 | 01 05 | `agent-harness.ts` 类型面本身就是难点清单 | 极强 |
| 7 | 以断点续跑为例 这个能力应该怎么实现 | 03 | `ToolStartedRecord` `SuspendedOperation` `replay` | 极强 |
| 8 | 这个项目怎么做模型版本管理 | 04 | `models.generated.ts` 是生成物 禁止手改 | 强 |
| 9 | 从开源模型切到商用API怎么保证兼容和平滑过渡 | 04 | `compat` 兼容层 `reasoningFormat` 十余种 | 极强 |
| 10 | 工程上做了哪些东西控制输出风险 | 02 05 | permission-gate protected-paths sandbox gondolin 四级 | 强 |
| 11 | 这个方案给你的任务带来了怎样的效率提升 | practice | 需本人测量 | 弱 必须实测 |
| 12 | 迁移后数据不一致 有没有回滚机制 怎么定位修复 | 03 | Entry/Record双流 append-only Branch git-checkpoint | 强 |

分布结论

- 9题靠读源码即可答透 应优先投入
- 第3与第11题只能靠本人真实使用记录 因此 `practice/` 必须即刻开始 不能事后补
- 第5题证据不足 应主动降级表述为 只有设计思路 没有实现和数据 硬答会被追问路由准确率与成本

回答强度规则

没有证据就降低表述强度

设计过不等于实现过

使用Pi能力不等于自己实现

上游已定义但未实现的类型 引用时必须同时说明未实现

没有证据就降低表述强度

设计过不等于实现过

使用Pi能力不等于自己实现

## 13 Pi Web范围

保留Next.js React TypeScript和现有Server

不做Vue重写

React只学习到能够维护现有Component Hook和SSE状态流

允许修改

- 品牌 Logo 配色 布局和信息架构
- Session Sidebar Tab Chat Message和Tool Result展示
- 响应式 可访问性 加载 空状态和错误状态
- Tool Timeline
- Permission HITL和Policy解释
- Context Token Cost和Compaction视图
- Recovery和Outcome Unknown状态
- Model Profile和Eval对比

默认不修改

- AgentSession生命周期
- Session JSONL
- SSE重连和对账
- Provider认证和Credential Storage
- File Allowed Root
- Worktree操作
- Package和Skill安装逻辑
- Next.js API Route总体结构

纯UI换皮只能展示基础前端能力

Agent状态可视化才能支撑主项目差异化

## 14 Pi与Pi Web版本一致性

pi-web在Server进程内直接依赖Pi Packages

只使用Extension时 CLI和Web可共享Pi配置和Package行为

修改Pi Core后必须让pi-web精确依赖Fork版本

否则CLI和Web会运行两套不同Runtime

必须维护

| 字段 | 内容 |
|---|---|
| Pi Base | 上游Release Tag和Commit |
| Pi Fork | 自有Patch版本 |
| Pi Web | 对应Commit |
| Product Package | 自有Extension版本 |
| Experiment | EXP编号和Fixture结果 |

## 15 安全和供应链门禁

### Pi和Package

- 社区Package默认按不可信代码处理
- 只安装精确npm版本或Git Commit
- 检查License Source package scripts dependencies和lockfile
- 记录文件 网络 子进程和Credential访问面
- 在无Secret临时Workspace运行Smoke
- Package升级等同新依赖重新审查

### Tool和Workspace

- 初始只启用Read Grep Find和Ls
- Write Edit PowerShell Bash和Network进入Permission策略
- 无UI模式默认Deny所有Ask
- 不把API Key放入Skill Prompt和Tool参数
- Windows默认标记Isolated False
- 未验证OS Isolation前不得称为Sandbox

OS隔离现状 修正原文把Sandbox当作待填空白的表述

上游已提供三条隔离路径 见 `docs/containerization.md`

| 方案 | 隔离对象 | 位置 |
|---|---|---|
| sandbox扩展 | bash工具 走 `@anthropic-ai/sandbox-runtime` macOS用sandbox-exec Linux用bubblewrap | `examples/extensions/sandbox/` |
| Gondolin | 全部内置工具与 `!` 命令路由进Linux micro-VM | `examples/extensions/gondolin/` |
| Docker/OpenShell | 整个pi进程 | 见containerization.md |

因此本项目不应把 实现Sandbox 作为差异化目标 应作为已有能力学习并说清三者边界

### Pi Web

- 保持127.0.0.1默认监听
- 不把Basic Auth当互联网传输加密
- 远程访问必须使用可信VPN或HTTPS反向代理
- UI不得返回或记录原始API Key
- 文件访问继续使用Allowed Root检查

## 16 旧LoopLedger资产处理

不迁移旧生产Runtime

保留并转换为Pi Conformance资产

- Permission Allow Deny Ask真值表
- Workspace Realpath Symlink和New Parent测试
- Tool Call Result配对和顺序Fixture
- Abort Late Result和资源清理Fixture
- Orphan Started Tool和Unknown Outcome场景
- Approval过期 Fingerprint不一致和Secret脱敏测试
- Fault Injection和固定Eval思路

删除或废止的旧前提

- 必须拥有自研Model Tool Loop
- Event Ledger必须继续作为生产唯一事实源
- Pi只能作为Fixture
- 自研ModelAdapter JSONL Store Checkpoint和Compaction继续作为默认路径

旧文档在清理前只用于提取上述高价值资产

## 17 第一阶段执行顺序

### Phase 0 新文件夹和基线

1. 创建自己的Pi Fork
2. Clone到新的独立文件夹
3. 添加upstream Remote
4. Checkout经过验证的Release Tag
5. 使用上游npm和Node版本
6. 不修改Core完成官方检查和本机Smoke
7. 记录Pi Base版本

### Phase 1 止血与起步

1. 修正 `learn/` 已发现的源码引用错误 `SessionTree` 在 `session/types.ts:328` 不在 `session.ts` `navigateTree` 在 `agent-harness.ts:279` 声明与 `agent-session.ts:3085` 实现 不在 `session/` 下
2. 修正 `learn/08` 把未实现设计写成已实现的表述 补 `HarnessNotImplemented` 标注
3. 建立源码引用批量校验脚本
4. 建立 `practice/` 并开始记录日常使用 此后持续累积
5. 跑通真实Provider和一次Coding任务

### Phase 2 扩展体系与源码主线

1. 先完成 05 扩展体系与能力边界 它是lab的前置
2. 完成 01 两代运行时对照 差异性最高 优先于其余章节
3. 完成 00 02 03 04
4. 每章按§7的6项产物执行
5. 暂不安装大量社区Package

### Phase 3 对照与索引

1. 完成 `compare/` 与其他方案的设计取舍对照 需在lab有结论后才有发言权
2. 建立 `interview/` 按§12的12个问题组织 从各章回收
3. `pi/guide/` 优先级最低 有余力再做 注意Pi每天约23次提交 guide最易过期

### Phase 3b Web展示 可选

1. Fork pi-web
2. 固定Pi依赖版本
3. 先只做品牌和UI整理
4. 每完成一个Agent章节增加一个状态展示切片
5. 不修改现有Server核心逻辑

### Phase 4 单一差异化实验

1. 在Durable Approval Outcome Unknown或Model Profile中选一个
2. 先写失败Fixture
3. 证明Extension或SDK不足
4. 必要时才建立最小Core Patch
5. 同步更新Pi Web展示和STAR总结

## 18 Definition of Done

一个章节完成必须满足 已按§7的6项产物对齐

- 明确本章回答§12中哪个编号的面试问题
- 问题以一个具体场景开头 不是抽象描述
- 所有源码引用带 `file:line` 且经grep验证
- 有至少一个替代方案及取舍
- 有边界说明 即抹不平什么 什么情况下失效
- 区分推断与实跑 未验证项显式标记
- 引用AgentHarness类型时同时标注其未实现

Fixture与STAR不再是章节级必须项 前者属于lab 后者移至 `interview/`

一个功能进入简历必须满足

- 能一句话区分Pi原有能力和个人贡献
- 能说明选择的Seam
- 能画出关键状态变化
- 能解释Crash和Rollback
- 有Before After数据
- 有已知边界
- Core Patch可Revert

## 19 立即禁止事项

- 不在旧agent目录内Clone Pi
- 不同时维护LoopLedger和Pi两套生产Runtime
- 不从多个Agent仓库直接复制核心实现
- 不为体现二开而强行修改Core
- 不在没审查时安装大量社区Package
- 不把Pi新AgentHarness当作成熟执行器
- 不重写pi-web为Vue
- 不让Web UI定义Runtime语义
- 不在没有数据时编造效率提升
- 不把设计提案写成已实现成果

## 20 仍未验证

已在本次修订中核验完成 从原清单移出

- Pi已clone至 `D:/project/ts-pi/pi` v0.84.3 包结构 规模 提交速度 两代运行时状态均已核验
- `learn/` 引用的8个agent-loop符号已逐个grep验证 全部正确

仍未验证

- 尚未运行Windows真实Provider Smoke
- 尚未审查准备安装的社区Package
- 尚未测量一次Pi上游升级的真实冲突数量 建议前移至Phase 1 成本约半天 结论决定Core Patch是否可行
- 尚未clone pi-web §2中pi-web相关事实均为文档转述
- 尚未验证Pi Fork Packages与pi-web的本地链接或发布流程
- 尚未执行pi-web浏览器E2E和安全测试
- lab选题尚未确认 §9 §10 §11 §17-Phase4 待选题确认后单独修订

这些内容必须在新项目中按阶段验证

## 21 参考资料

### 本次调研

- `D:/project/ts-agent/plan/research-pi-fork-vs-opencode.md`
- `D:/project/ts-agent/plan/research-pi-web-learning-route.md`
- `D:/project/ts-agent/plan/research-agent-runtime-foundation.md`
- `D:/project/ts-agent/plan/design-agent-harness-core-2.md`

### 本地路径

- Pi源码 `D:/project/ts-pi/pi` v0.84.3
- 文档项目 `D:/project/agent-doc-rspress` Rspress
- 文档写作计划 `D:/project/agent-doc-rspress/plan/DOC_WRITING_PLAN.md` 尚未同步本次修订

### 本次修订的关键源码锚点

- `packages/agent/src/harness/agent-harness.ts` 新一代设计面 方法体未实现
- `packages/agent/src/harness/session/types.ts` Entry与Record双流类型
- `packages/agent/src/harness/result.ts` `Result` 与 `TaggedError`
- `packages/agent/src/agent-loop.ts` 现役循环
- `packages/coding-agent/src/core/agent-session.ts` 生产路径 3495行
- `packages/ai/src/types.ts` `compat` 兼容层与 `thinkingSignature`
- `packages/coding-agent/docs/extensions.md` 3002行 扩展体系唯一权威文档
- `packages/coding-agent/docs/usage.md:306` Design Principles 故意不内置的六项
- `packages/coding-agent/docs/containerization.md` 三种隔离模式
- `packages/coding-agent/examples/extensions/` 70余个官方示例

### Pi官方资料

- [Pi Repository](https://github.com/earendil-works/pi)
- [Pi Packages](https://pi.dev/packages)
- [Pi Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)
- [Pi Package Docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md)
- [Pi SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
- [Pi RPC](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)
- [Pi Session Format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md)
- [Pi Development and Rebranding](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/development.md)
- [Pi License](https://github.com/earendil-works/pi/blob/main/LICENSE)

### Pi Web官方资料

- [Pi Web Repository](https://github.com/agegr/pi-web)
- [Pi Web README](https://github.com/agegr/pi-web/blob/main/README.md)
- [Pi Web Architecture](https://github.com/agegr/pi-web/blob/main/AGENTS.md)
- [Pi Web Package](https://github.com/agegr/pi-web/blob/main/package.json)
- [Pi Web License](https://github.com/agegr/pi-web/blob/main/LICENSE)

## 22 下一会话起点

Phase 0 已部分完成 Pi已clone至 `D:/project/ts-pi/pi` 版本v0.84.3 仓库结构与两代运行时状态已核验

下一会话执行 Phase 1 止血与起步

第一目标不是写新章节 是把已写的 `learn/` 错误修掉 否则错误会被后续章节引用放大

Phase 1 待办

1. 修 `learn/08` 对照表的两处位置错误
2. 修 `learn/08` 把未实现写成已实现的表述
3. 建源码引用批量校验脚本
4. 建 `practice/` 开始记录
5. Windows真实Provider Smoke 仍未做

之后进入 Phase 2 先写 05 扩展体系 再写 01 两代对照

待确认事项 未在本次修订中处理

- lab选题 影响 §9 §10 §11 §17-Phase4
- 确认后需同步修订上述四节 并同步 `DOC_WRITING_PLAN.md`

开始任何Core修改前必须先完成

- 测量一次上游升级的真实冲突数量 成本约半天 结论决定Core Patch是否可行
- 已在扩展层尝试并有表达不了的证据
