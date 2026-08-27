# Pi 原理板块 写作规划

> 创建 2026-08-26 ｜ 状态 Active ｜ 取代 `plan/DOC_WRITING_PLAN.md` 中 Part 2 `source/` 的旧规划
>
> **本文件的用途**：任何新开的对话读完这一份就能接着往下写，不需要回溯历史会话。

---

## 1 背景

### 1.1 作者背景与最终目标

前端开发，秋招简历项目，投递方向 **Agent 开发 or 前端开发**。

最终形态是 **Agent + 前端**：以 Pi Coding Agent 为内核，做一点差异化二开，最后基于 pi-web 做界面。

### 1.2 整条路线与本板块的位置

```
learn/        Agent 通识 8 篇          ✅ 已完成 —— 入场券，不产生差异性
pi/guide/     Pi 会用 20 页            ✅ 已完成 —— 几乎不涉及原理
pi/principle/ Pi 懂了 10 章            ← 本规划，简历深度的主要来源
practice/     真实使用记录              🔄 持续累积（面试题 #3 #11 的唯一证据）
差异化二开     MCP 或 pi-extension      ⏳ 之后
pi-web 改造    基于现有 pi-web           ⏳ 最后
```

### 1.3 本板块的判断标准

从"能指出代码在第几行"改成**"能在面试里讲清楚"**：

```
它想解决什么问题 → 总体怎么拆的 → 关键实现怎么做的
    → 这么做会遇到什么问题 → Pi 怎么解的 / 哪些没解
```

代码只在"不看这段就说不清"时出现，**不逐行死磕**。

---

## 2 事实基准

| 项 | 值 |
|---|---|
| Pi 源码 | `D:/project/ts-pi/pi` |
| 版本 | **v0.84.3 (+20 commits, `8fa7eebd`)** —— 固定不动，不 pull 不 checkout |
| 已安装 CLI | v0.84.2（与源码有漂移，写实测结论时须标注） |
| 文档仓库 | `D:/project/agent-doc-rspress`，Rspress 1.47.2 |
| 板块路径 | `docs/pi/principle/`（原 `docs/pi/source/`，已迁移） |

### 2.1 包规模（实测）

| 包 | 行数 | 内部依赖 |
|---|---|---|
| `coding-agent` | 78768 | `agent-core` `ai` `client` `protocol` `tui` |
| `ai` | 27715 | `telemetry` |
| `tui` | 17668 | **无** |
| `agent`(agent-core) | 12915 | `ai` `telemetry` |
| `session-backends/sqlite-node` | 2566 | `ai` `agent-core` |
| `server` | 2314 | `ai` `protocol` |
| `client` | 1393 | `protocol` |
| `evals` | 1311 | 无 |
| `protocol` | 1245 | **无** |
| `telemetry` | 935 | **无** |

### 2.2 必须纠正 `PI_AGENT_HANDOFF.md` 的四处

写作时以本节为准，**不要沿用交接文档的说法**。

| # | HANDOFF 的说法 | 实测 |
|---|---|---|
| 1 | 新一代 `AgentHarness` **"仅约 450 行，方法体全部未实现，只有设计"** | `packages/agent/src/harness/` 共 **10059 行**；`HarnessNotImplemented` **只出现在 `agent-harness.ts`**（508 行，27 处）。`reducer.ts`(667) `compaction.ts`(848) `env/nodejs.ts`(695) `telemetry.ts`(615) `session/testing/conformance.ts`(1016) **全部已实现** |
| 2 | §8-05「11 个 HookName」是扩展体系的钩子 | 那是**新一代** `agent-harness.ts:198` 的 11 个（未实现）。**现役扩展事件是 34 个**（`coding-agent/src/core/extensions/types.ts:1237` 起的 `on()` 重载） |
| 3 | `agent-loop.ts` 行号：`runLoop:116` `streamAssistantResponse:193` `executeToolCalls:214` | 那些是**调用点**。定义在 **155 / 281 / 411** |
| 4 | `usage.md:306` Design Principles；官方示例「70 余个」 | Design Principles 在 **`usage.md:304`**，六项清单在 **:308**；示例实际 **78 个**（69 单文件 + 9 目录） |

---

## 3 与参考文档的关系

| 参考 | 用途 | 注意 |
|---|---|---|
| `https://pi-doc.com/docs/latest/source/` | 中文源码走读，9 页，结构与叙事可参考 | **基于 v0.80.10，比我们旧**；含 3 页环境搭建/断点调试，对本项目无用 |
| `https://pi.dev/docs/latest/` | 官方文档，功能与配置的权威 | 英文，偏使用不偏原理 |
| 本地 `packages/coding-agent/docs/*.md` | 与官方站同源，可直接读 | `extensions.md` 3002 行是扩展体系唯一权威 |

**差异化定位**：参考站是"源码走读"，本板块是**"面试导向的设计拆解"**——多讲取舍、失败模式、边界，少讲文件目录；且所有引用**可机器校验**。

**不抄。** 遇到参考站与本地源码不一致时，以本地源码为准，并把差异当作素材。

---

## 4 面试考察维度映射

调研来源：阿里云《65 题 AI Agent 全栈面试宝典》、字节/百度真实凉经、zero2Agent 面试库（题目标注来自蚂蚁 AI Coding、阿里通义、字节豆包、腾讯混元真实面试）。

### 4.1 Pi 能强证明的

Agentic Loop 流程 ｜ 工具契约与参数校验 ｜ LLM 吐错 JSON 的鲁棒处理 ｜ 并行 vs 串行工具调度 ｜ 死循环防御 ｜ 上下文窗口与压缩 ｜ Context Engineering ｜ Skills 机制 ｜ Prompt Injection 与高危操作防呆 ｜ Sandbox 与隔离边界 ｜ 模型兼容与平滑迁移 ｜ 插件化与扩展边界 ｜ Harness Engineering ｜ 断点续跑与幂等 ｜ 可观测性 ｜ Token 成本控制

### 4.2 Pi 证明不了的（**面试时主动划到范围外，不硬答**）

RAG / 向量库 / Rerank ｜ 训练与微调（LoRA / DPO / PPO）｜ A2A 协议 ｜ 分布式状态同步 ｜ 多 Agent 深度协作（Pi 只有 subagent 示例）

### 4.3 §12 的 12 个面试问题仍然有效

见 `PI_AGENT_HANDOFF.md` §12。本板块每章开头必须写明"本章回答第几题"。

---

## 5 章节大纲（10 章）

**权重说明**：★★★ = 重点，写深写透，500–700 行；★★ = 正常，350–500 行；★ = 轻量，抓核心即可，200–300 行。

| 章 | 文件名 | 标题 | 权重 | 核心问题 | 面试题 |
|---|---|---|---|---|---|
| — | `index.md` | 总览与阅读路线 | ★ | 这板块怎么读、基准是什么 | — |
| 01 | `01-architecture.md` | 总体架构与设计哲学 | ★★★ | 10 个包为什么这么拆？依赖方向说明了什么？ | #1 #6 |
| 02 | `02-message-journey.md` | 一条消息的旅程 | ★★★ | 按下回车到模型收到请求，中间发生了什么 | #1 #2 |
| 03 | `03-agent-loop.md` | Agent Loop 与终止控制 | ★★★ | 循环怎么转、**怎么防死循环**、什么时候停 | #1 #2 |
| 04 | `04-tool-system.md` | 工具系统 | ★★★ | 工具契约、参数校验、并行 vs 串行、失败与重试 | #2 #10 |
| 05 | `05-context-engineering.md` | Context Engineering | ★★★ | System Prompt 怎么拼、上下文怎么不被污染 | #1 #3 |
| 06 | `06-session-and-compaction.md` | 会话、压缩与分支 | ★★ | 长会话为什么会崩、压缩的代价是什么 | #3 #12 |
| 07 | `07-durable-execution.md` | 断点续跑与幂等（概览） | ★ | 崩了怎么恢复、什么能重放 | #7 |
| 08 | `08-model-and-provider.md` | 模型抽象与 Provider | ★★ | 30+ Provider 的差异怎么收敛成数据 | #8 #9 |
| 09 | `09-extension-system.md` | 扩展体系与能力边界 | ★★ | 扩展层能表达什么，从哪行开始表达不了 | #2 #6 #10 |
| 10 | `10-security-observability.md` | 安全、可观测与成本（概览） | ★ | 四级防线、怎么看清跑了什么、钱花哪了 | #10 #11 |

### 5.1 各章要点与关键源码

**01 总体架构与设计哲学** ★★★
- 真实依赖图（`tui` `protocol` `telemetry` 零依赖；`agent-core` 不依赖 `tui`；`ai` 不知道 Agent 存在）
- 三个角色：模型 / 循环 / 产品
- 设计哲学：核心小、扩展优于修改、事件驱动、类型安全、渐进复杂度
- 关键：`packages/*/package.json` 依赖、`packages/agent/src/agent-loop.ts`、`packages/coding-agent/src/core/agent-session.ts`

**02 一条消息的旅程** ★★★
- 阶段：TUI 输入 → 斜杠命令 → 扩展 `input` 拦截 → Skill/模板展开 → 流式检查 → 模型与认证校验 → 压缩检查 → 构建上下文 → 发送
- 关键：`coding-agent/src/core/agent-session.ts`、`modes/interactive/`、`core/slash-commands.ts`、`core/skills.ts`

**03 Agent Loop 与终止控制** ★★★
- 内外双层循环、`stopReason` 分支、Steering / Follow-up、Abort、Late Result
- **死循环防御**：`terminate`、`shouldStopAfterTurn`、`maxTokens`、重试上限
- 关键：`agent-loop.ts:31 agentLoop` `:155 runLoop` `:281 streamAssistantResponse` `:411 executeToolCalls` `:232 prepareNextTurn`；`agent/src/agent.ts`

**04 工具系统** ★★★
- 工具契约、JSON Schema 校验、`prepareArguments` 兼容 shim、并行/串行、错误回填、输出截断、路径安全
- 关键：`agent-loop.ts:586-760`、`coding-agent/src/core/tools/`（`bash.ts` 544 / `edit.ts` 461 / `read.ts` 358 / `truncate.ts` 276 / `path-utils.ts` 118）

**05 Context Engineering** ★★★
- System Prompt 分层构建、`AGENTS.md` 层叠与覆盖、Skills 渐进披露、Prompt 模板、上下文污染
- 关键：`coding-agent/src/core/system-prompt.ts`、`core/skills.ts`(507)、`core/prompt-templates.ts`(285)

**06 会话、压缩与分支** ★★
- 树结构、压缩触发与切点、split turn、`retainedTail` 自包含检查点、分支摘要
- 关键：`core/session-manager.ts`(1715)、`core/compaction/`(1558)

**07 断点续跑与幂等（概览）** ★
- 只讲清三件事：三个崩溃切点、`replay: safe/never` 的分类依据、为什么 `resultEntryId` 要预分配
- 提一句新一代已有 `reducer.ts` 和 conformance 套件，**不展开**
- 关键：`agent/src/harness/session/types.ts`、`harness/reducer.ts`、`harness/agent-harness.ts`（标注未实现）

**08 模型抽象与 Provider** ★★
- `compat` 把差异从控制流收敛成数据、88 个 provider 目录文件、`*.lazy.ts` 按需加载、认证解析顺序、模型目录是生成物
- 关键：`ai/src/types.ts` `compat` 字段、`ai/src/compat.ts`(298)、`ai/src/providers/`(88 文件)、`ai/src/api/`(32 文件含 lazy)

**09 扩展体系与能力边界** ★★ ✅ 已完成，需按新口径轻改
- 已有内容：34 事件、`tool_call` 精确时机、fail-safe/fail-open 不对称、能力边界、第三方包审查
- 待改：补一张"扩展体系在整体架构中的位置"图；把逐行链路表折叠成附录

**10 安全、可观测与成本（概览）** ★
- 四级防线（工具白名单 → `tool_call` → 项目信任 → OS 隔离）
- 可观测三件套：`telemetry` 包 / JSON 事件流 / 会话 JSONL
- 成本三招：prompt 缓存、压缩、用量统计
- 供应链：`core/package-manager.ts`(2699) 一句话带过

### 5.2 明确不做

| 内容 | 原因 |
|---|---|
| 百级工具路由 / Dynamic Tool Loading 专章 | 已砍 |
| 断点续跑深挖（12 类损坏分类等） | 只保留概览 |
| v0.80 → v0.84 架构演进 | 已砍 |
| 二开接缝（MCP 挂点 / pi-web 接入） | **移到之后的二次开发阶段做** |
| `modes/interactive/`(18264 行) 逐行 | 投入产出比最差 |
| TUI 渲染细节 | guide 的 `programmatic/tui` 已覆盖使用层 |

---

## 6 写作规范

### 6.1 每章固定结构

```markdown
---
title: 0X 标题
description: 一句话
---

# 0X 标题

> 以 Pi v0.84.3 (+20, 8fa7eebd) 源码为基准。所有 file:line 经 pnpm check:refs 校验。

## 0. 本章回答哪些面试问题     ← 表格，写明 §12 编号
## 1. 问题：<一个具体场景>      ← 必须具体，不能是抽象描述
## 2. 全景图                   ← ASCII 或 mermaid
## 3~N. 分主题拆解             ← 每节：先讲思路，再给必要代码，最后给取舍
## N+1. 边界：抹不平什么        ← 什么情况下失效
## N+2. 未验证 / 推断标记       ← ✅实测 / ⚠️推断 / ❌未做
## N+3. 本章小结               ← 表格
## 下一步
```

### 6.2 硬性要求

| 项 | 要求 |
|---|---|
| 图表密度 | 每章至少 **1 张架构/全景图 + 1 张流程图** |
| 代码密度 | 每个设计点最多 **1 段 ≤25 行**；完整行号索引放章末折叠区 |
| 引用 | 每个 `file:line` 必须过 `pnpm check:refs`（符号须在声明行 ±3 行内） |
| 交叉链接 | 每章开头一句话链回 `learn/` 对应篇；概念速查链到 `guide/` |
| AgentHarness | 引用其任何类型时**必须同时标注未实现状态** |
| 诚实标注 | 没实跑过的写 ⚠️/❌，不许把推断写成事实 |

### 6.2.1 表格使用规则

表格只用于**多行 × 多列的真对照**，例如：包名/行数/职责、字段/作用/章节、方案 A/B/C 对比。

**不要用表格的情况**：

- 只有 1–2 行内容
- 只有两列且右列是一句话解释 → 用 `-` 列表
- 并列的短语句 → 直接写成正文或列表
- "换来什么 / 代价是什么" 这类两句话的取舍 → 小标题 + 正文两段

### 6.2.1.5 代码块规则

每个代码块必须同时做到三件事：

1. **标题写完整路径行号**：` ```typescript title="packages/agent/src/agent-loop.ts:31" `
2. **关键行高亮**：紧跟在 title 后面写 `{2-6}` 或 `{4,11,15-16}`，只高亮真正要讲的行
3. **行尾中文注释**：解释这一行在干什么，不是重复代码字面意思

示例：

````markdown
```typescript title="packages/agent/src/agent-loop.ts:31" {2-6}
export function agentLoop(
  prompts: AgentMessage[],          // 本次新加入的消息
  context: AgentContext,            // 模型能看到的全部世界
  ...
```
````

其他约束：

- 中文注释是**本文补充**，不是源码原文，每章开头声明一次
- 原始英文 JSDoc 如果短且有信息量，可以保留
- 一个代码块 ≤ 25 行；更长的拆成两个或只截关键段

### 6.2.1.6 排版禁忌

**不要手写 `---` 分隔符。**

Rspress 1.47.2 默认主题的 `h2` 自带 `border-t-[1px]` 顶部分割线：

```html
<hr class="my-12 border-t border-solid border-divider-light"/>          <!-- 你写的 --- -->
<h2 class="mt-12 mb-6 pt-8 ... border-t-[1px] border-divider-light">    <!-- h2 自带的 -->
```

两者叠加会渲染出**两条横线**。`learn/` `guide/` `practice/` 全部没用 `---`，原理板块也要保持一致。

其他排版约束：

- frontmatter 的两条 `---` 当然要保留
- 不要连续空行，最多一行
- 章节之间靠 `## ` 分隔，不靠视觉元素

### 6.2.2 图的选型

- **Mermaid**：节点 ≤ 10、层级 ≤ 3 的流程图与时序图
- **ASCII / 纯文本图**：节点多、需要对齐、带时间线或分层结构的（mermaid 在这种场景下可读性反而差，且客户端渲染慢）
- 已经写成 mermaid 但节点超过 10 个的，改写成 ASCII 或拆成两张

### 6.2.3 语气规则

参照 `https://pi-doc.com/docs/latest/source/input-to-llm.html` 的写法：阶段化推进，`**文件**：路径` 标注，代码片段后跟一两句平实解释。

**禁止的写法**：

- 自我指涉、自我辩护。如"这张图不是我画的，是从 package.json 里读出来的"——直接写"依赖关系写在各包的 package.json 里"
- "我们可以看到""接下来让我们""值得注意的是"连用
- 夸张词："杀手级""重磅""一把双刃剑"
- 把写作过程当内容："我查了 X 发现……"

**提倡的写法**：短句、先结论后展开、直陈事实、取舍成对出现（换来什么 + 代价是什么）。

### 6.3 Rspress 1.47.2 可用能力（已实测）

下表是**实测结果**（写一个临时页面构建后看产物 HTML），不是推测：

| 能力 | 写法 | 可用 |
|---|---|---|
| 代码标题 | ` ```ts title="x.ts" ` | ✅ |
| 行高亮 | ` ```ts {1,3-5} ` | ✅ |
| 容器 | `:::tip/info/warning/danger` | ✅ |
| 折叠区 | `<details><summary>` | ✅ |
| Mermaid | ` ```mermaid `（含 `sequenceDiagram`） | ✅ 客户端渲染 |
| 代码组 | `:::code-group` | ❌ **原样输出 `:::code-group` 文本** |
| shiki 标记 | `// [!code ++]` `// [!code highlight]` | ❌ **原样留在代码里** |

| 折叠代码块 | ` ```ts fold height="200" ` | ❌ **`fold` 会被当成 title 文本输出** |
| 单块行号 | ` ```ts showLineNumbers ` | ❌ v1 只有全局配置 `markdown.showLineNumbers` |
| 代码换行 | ` ```ts wrap ` | ❌ |
| 外部文件引用 | ` ```ts file="./x.ts" ` | ❌ |

后六项都是 Rspress **v2** 的能力。官方文档 `rspress.rs/zh/guide/use-mdx/code-blocks` 描述的是 v2，**不能直接照抄**。

:::danger v1 的 title 解析坑

v1 的标题解析是 `meta.split("=")[1]`，所以 **meta 里只能出现一个 `=`**。

- ✅ ` ```ts title="a.ts" {2-6} ` —— 行高亮会先被剔除，不影响标题
- ❌ ` ```ts title="a.ts" height="200" ` —— 标题会变成 `a.ts height`

:::

需要代码分组时，v1 用 `<Tabs>` / `<PackageManagerTabs />` 组件代替；需要折叠长内容时用 `<details><summary>` 包住代码块。

### 6.4 校验命令

```bash
pnpm check          # 链接 + 源码引用，写完必跑
pnpm check:links    # 站内链接与锚点
pnpm check:refs     # file:line 对照本机 Pi 源码
npx rspress build   # 构建，不能有 error/warn
node scripts/session-stats.mjs --latest --cwd "D:/project/agent-doc-rspress"   # 采集 practice 指标
```

---

## 7 进度

| 章 | 状态 | 备注 |
|---|---|---|
| index | ✅ | |
| 01 架构 | ✅ | |
| 02 消息旅程 | ✅ | `02-message-journey.md`，四层链路 / 十四道闸 |
| 03 Agent Loop | ✅ | `03-agent-loop.md`，三层循环 / 六个出口 / 无 maxTurns |
| 04 工具系统 | ⏳ | |
| 05 Context Engineering | ⏳ | |
| 06 会话与压缩 | ⏳ | |
| 07 断点续跑（概览） | ⏳ | |
| 08 模型与 Provider | ⏳ | |
| 09 扩展体系 | 🔄 | 已写完，待按新口径轻改 |
| 10 安全可观测（概览） | ⏳ | |

写完一章：更新本表 → 更新 `docs/pi/principle/index.md` 的状态表 → 更新 `rspress.config.ts` 侧边栏 → 跑 `pnpm check` → 构建。

---

## 8 新对话接续指引

1. 读本文件（尤其 §2.2 的四处纠错、§5 大纲、§6 规范）
2. 读 `docs/pi/principle/index.md` 看当前状态
3. 读 `docs/pi/principle/01-architecture.md` 感受目标风格
4. 挑 §7 里第一个 ⏳ 的章节开写
5. 写完跑 `pnpm check` 和构建，更新 §7 与 index 状态表

**不需要**回溯历史会话，也**不需要**重读 `PI_AGENT_HANDOFF.md` 全文（它在 §2.2 列出的四点上已过时）。

---

## 9 相关文件

| 文件 | 作用 |
|---|---|
| `PI_AGENT_HANDOFF.md` | 项目总交接，注意 §2.2 的四处已过时 |
| `plan/DOC_WRITING_PLAN.md` | 旧规划，Part 2 部分已被本文件取代 |
| `scripts/check-source-refs.mjs` | 源码引用校验 |
| `scripts/check-links.mjs` | 站内链接校验 |
| `scripts/session-stats.mjs` | 会话指标采集 |
| `docs/practice/` | 真实使用记录，面试题 #3 #11 的唯一证据 |
