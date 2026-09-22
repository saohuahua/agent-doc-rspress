# Skill 机制

> 依据《2026 秋招 Agent 全栈面经统一版》：MCP / Skill / 工具治理是 P0，几乎每场都会问到 Skill 是什么、怎么被调用、和 MCP 怎么分工。
> 定位：能力封装层。MCP 协议细节见《06》，Loop / Harness 见《01》。
> 每题末尾的引用块是面试版回答，口述 1~2 分钟，可直接背。

## 1. Skill 是什么？它解决什么问题？

- 一句话：Skill 是把某类任务的打法打成文件夹的机制——指令、可选脚本、参考文档、模板放在一起，Agent 能自动发现、按需加载
- 它解决的不是"这次对话多贴一段 Prompt"，而是三件事：
  1. **可发现**：启动时 Agent 就知道有这份能力，不用人每次提醒
  2. **可复用**：跨会话、跨人用同一份 SOP，不靠复制粘贴
  3. **可按需加载**：正文和附件只在任务相关时才进上下文，不把窗口塞满

```text
普通 Prompt          这次对话里的一段话，用完就没了
CLAUDE.md / 项目规范  常驻事实：技术栈、目录、命令
Skill                某类任务的操作手册：何时用、先做什么、何时停
专用 Agent            独立 Loop / 权限 / 记忆的另一个系统
```

- 官方形态：Agent Skills 开放格式（`agentskills.io`，2025-12）。一个目录 + `SKILL.md`，跨 Claude Code、Codex 等 Host 可移植
- 和 Prompt 的硬区别：Prompt 是人贴的；Skill 是 Agent 自己根据 `name` / `description` 决定要不要读
- 类比：MCP 是给新员工配电脑和权限，Skill 是入职手册。没有手册，工具再全也只是每次现想流程

> Skill 我理解成把一类任务的打法打成文件夹：指令、脚本、参考文档放在一起，Agent 能自动发现、按需加载。它解决的是跨会话、跨人复用 SOP，不是把 Prompt 存一下下次再贴。
>
> 和普通 Prompt 的区别很明确：Prompt 是人这次对话里贴的，用完就没了；Skill 是 Agent 启动时就知道有这份能力，匹配到任务才把正文读进来。和项目里的 CLAUDE.md 也不一样——CLAUDE.md 是常驻事实，Skill 是"这类任务怎么做"的操作手册。
>
> 我自己的体会是：没有 Skill 的时候，每次还原设计稿都要把门禁和项目约定再说一遍，说漏一次就返工。Skill 把这些纪律固化下来，模型不用靠临场发挥。

### 容易答错的地方

- "Skill 就是 Prompt 模板"——缺了自动发现和按需加载，只是人工流程
- "Skill 是 Anthropic 私有协议"——2025-12 已作为开放格式发布，不是 MCP 那种 JSON-RPC 协议
- "有了 Skill 就是 Agent"——Skill 是打法包，真正跑起来的还是外面的 Agent Loop

## 2. 一个 Skill 由什么组成？SKILL.md 必填项是什么？

- 一个 Skill = 一个目录，里面**必须**有 `SKILL.md`（面经里常写成 `skill.md`，答题要纠正）
- 推荐结构：

```text
lanhu-implement-design/
├── SKILL.md                 # 入口：YAML 元数据 + 指令正文
├── scripts/                 # 可选：确定性脚本，执行不把源码灌进窗口
├── references/              # 可选：按需读的参考文档
│   ├── lanhu-mcp.md
│   └── project-conventions.md
└── assets/                  # 可选：模板、示意图、样例
```

- `SKILL.md` 分两段：YAML frontmatter + Markdown 正文。规范必填只有两个字段：

| 字段 | 必填 | 约束 | 作用 |
| --- | --- | --- | --- |
| `name` | 是 | 小写字母、数字、连字符，≤64，须与目录名一致 | 标识、显式调用名 |
| `description` | 是 | ≤1024，非空 | **路由面**：做什么 + 何时用 |
| `license` / `compatibility` / `metadata` | 否 | 兼容性、额外键值 | 环境声明、Host 扩展 |
| `allowed-tools` | 否 | 规范标了 Experimental | 预授权工具提示，**不是安全边界** |

- `description` 必须同时写 **做什么** 和 **何时用**，最好带触发词和反例。模型选 Skill 几乎只看这一句，选错多半是这里写飘了
- 正文没有强制 Schema，但建议有：步骤、输入输出、硬性门禁、失败时停下来问人
- 哪些该稳定、哪些可改：

```text
应稳定     name、触发边界、禁止事项、权限不进 markdown
可迭代     正文步骤、参考文档、脚本、路径
按项目覆盖  具体组件名、单位插件——写"先读目标仓库"，不要写死成唯一真值
```

- Claude Code 还有 `disable-model-invocation`、`context: fork` 等产品字段，那是 Host 扩展，**不是开放规范必填**。面试先答规范的 `name` + `description`

> 一个 Skill 就是一个文件夹，入口文件叫 SKILL.md，不是 skill.md。文件分两段：上面 YAML 元数据，下面 Markdown 指令。规范里必填只有 name 和 description——name 是标识，description 是路由面，既要写做什么，也要写什么时候用，最好带触发词和反例。
>
> 目录里还可以放 scripts、references、assets。正文建议写清步骤和门禁，但没有强制 Schema。我的习惯是：SKILL.md 只放流程和硬性约束，细节拆到 references 按需读，这样启动时每个 Skill 只占大约一百来个 token 的元数据。
>
> allowed-tools 规范里标了实验性，不能当成鉴权。Claude Code 那些谁能调用、是否 fork 子 Agent 的字段是产品扩展，开放标准不要求。

### 容易答错的地方

- 把 Host 扩展字段背成行业必填
- 只写"这个 Skill 做什么"，不写何时用——路由会漂
- 认为 Tool 的 JSON Schema 就是 Skill 的 Schema——Tool 才有 parameters，Skill 的"Schema"就是 frontmatter 那两个必填字段

## 3. 你写过哪些 Skill？为什么做成 Skill 而不是继续贴 Prompt？

### 先给结论

- 写过 `lanhu-implement-design`：在已有 Vue3/TS 的 C 端 H5 / 活动页里，按蓝湖设计稿还原页面
- 做成 Skill 不是为了"多一个文件"，而是调研后发现：**损耗几乎全发生在写第一行代码之前**，每次靠对话里贴纪律，留不住、说漏就回滚

### 问题从哪来

翻了四个已交付项目和一批真实还原会话，不是坐标算不准，是四件更靠前的事：

1. 蓝湖 MCP 有 DDS 结构分支和 Sketch/PSD 兜底分支，降级是**静默的**，拿到绝对定位 HTML 还以为能当布局
2. 切图工具不报告缺失：设计师没标的图层一张都没有，清单看起来却"正常"
3. 四个项目是四种布局模型，没判定类型就动手，规则会在第一个样本上判错
4. 项目约定（单位插件、`bg-image`、`OverlayHelper`、配置驱动）每次都从代码里现学

对应数字只作为调研口径：纠偏消息约占 56%，平均每任务约 5 轮纠偏，6 次回滚全部由人肉眼发现。所以方案不是再造一个转码器，而是 **MCP 负责取数 + Skill 负责纪律**。

### 目录怎么拆——对应渐进加载

```text
lanhu-implement-design/
├── SKILL.md                      # 门禁 + 六步流程，触发后才读
└── references/
    ├── lanhu-mcp.md              # 只用哪三个读工具、两条出码分支、切图三重闸门
    ├── layout-patterns.md        # 四种布局：长页 / 固定舞台 / Spine / 双端
    ├── project-conventions.md    # 单位、组件、弹窗、配置驱动
    └── visual-review.md          # 截图验证：构建通过 ≠ 还原正确
```

- `SKILL.md` 只放"拦什么、没做完五件事不许写整页、固定步骤"
- 工具边界、布局判定、项目约定、验收清单全部外置，用到再读
- 没放 `scripts/`：门禁是判断题（缺图要不要停、当前是不是兜底 HTML），不是一段确定性算法。判断留给模型，事实留给参考文件

### 几个可以展开的设计点

**1. description 当路由面，不只当简介**

```yaml
name: lanhu-implement-design
description: Use when 在已有 Vue3/TypeScript H5 或活动页项目中，根据蓝湖设计稿、上传到蓝湖的 PSD、或设计截图还原/实现页面时。触发词包括：按设计稿写页面、还原这个页面、蓝湖转代码……不用于无设计依据的 UI 创作和纯文案小改。
```

- 写了场景、触发词，也写了**反例**。旁边还有 `psd2code`（切图缺失时回 PSD 补证）和 `html-to-page`（B 端 HTML 转 Vue），靠 description 互斥，避免三个还原类 Skill 抢同一个任务

**2. 硬性门禁在写码前，不在生成后**

五件事没齐不许写整页：看过设计原图、知道数据走哪条分支、素材三清单对过、读过目标项目组件、判定了布局类型。借口对照表直接写进 Skill——"先搭页面图后面补"这种念头就是在违规。

**3. Skill 调 MCP，但不把 MCP 当权威**

固定顺序：`lanhu_get_designs` → `lanhu_get_ai_analyze_design_result` → `lanhu_get_design_slices`。禁止 `lanhu_say*`，那是留言工具，会改远端还通知协作者。Cookie / token 不读、不复述、不写进报告。蓝湖 HTML 的内置提示词把导出代码标成最高权威——Skill 里明确反转：项目代码是实现真值，蓝湖结构是设计真值，导出 HTML 只是参考。

**4. 外挂知识库怎么放**

会变的约定不写死在 `SKILL.md`：`project-conventions.md` 是公司 H5 的常见写法，但写明"目标项目 AGENTS.md 和 `vite.config.ts` 永远优先"。业务文案、活动配置更不进 Skill，那是项目配置和 RAG 的事。Skill 只固化**流程和门禁**。

**5. 完成标准不是"模型说做完了"**

每区截图、旧区域回归、收尾报告固定五项（改了哪、还差什么、缺什么图、验了什么、动没动旧交互）。不确定的值用 `ASSUMED / CONFIRMED / BLOCKED` 注释——这是八周年项目里验证有效、再搬进 Skill 的。

### 面试可能追问

| 追问 | 怎么接 |
| --- | --- |
| 为什么不做成 Workflow？ | 布局类型、是否缺图、要不要停下来问人，分支不可枚举；Workflow 适合固定管道，这里需要模型在门禁内做判断 |
| 为什么不单独做一个还原 Agent？ | Host 已经是 Coding Agent，缺的是打法不是 Loop；独立 Agent 还要自己管权限、记忆、发布，过重 |
| 模型不听门禁怎么办？ | Skill 是软约束。缺图、禁写凭据、禁调留言工具，最终要靠 Host 权限和工具白名单兜底 |
| 怎么证明有用？ | 看回滚次数、纠偏轮数、缺图是否在写码前被拦住；不要拿"感觉快了"交差 |
| 和 MCP 项目是什么关系？ | MCP 提供读稿/切图原子能力，Skill 决定用哪些工具、什么顺序、数据能不能信、什么时候停 |

> 我写过一个 lanhu-implement-design，用在已有 Vue3 活动页里按蓝湖稿还原页面。做成 Skill 是因为复盘四个项目之后发现，还原度低的第一成因不是坐标不准，而是写码前的信息没备齐：蓝湖降级分支是静默的、切图缺失不报告、布局类型没判、项目约定每次现学。这些纪律以前都活在对话里，说漏一次就整体回滚。
>
> 结构上 SKILL.md 只放门禁和六步流程，工具边界、四种布局、组件约定、截图清单拆成四份 references 按需读。description 写了触发词也写了反例，好和旁边的 psd2code、html-to-page 错开。MCP 只允许三个读取工具，留言类工具禁止调，凭据不进上下文；导出 HTML 不当布局真值，兜底分支只能当坐标清单。
>
> 我不会把它说成"装上就提升了多少个点"。它解决的是把反复踩过的坑变成每次任务的默认前置条件。模型仍可能跳过门禁，所以缺图即停、工具白名单这些硬约束还要落在 Host 和 MCP 执行层。

## 4. Skill 如何被调用？写进 Prompt 就能用吗？渐进式加载怎么实现？

- 短答：**写进 Prompt 不能算"会用 Skill"**。那是反模式——窗口浪费、Skill 互相干扰、选错率上升
- 正确调用链：

```text
启动     扫目录，只把每个 Skill 的 name + description 放进 System Prompt（约 ~100 token / 个）
匹配     用户任务 vs description；或用户显式 /skill-name
激活     Runtime 读取该 Skill 的 SKILL.md 正文，注入本轮上下文
按需     正文引用的 references / scripts / assets，用到再读或执行
执行     模型按指令调 Tool / MCP；脚本走执行器，进上下文的是输出不是源码
```

- 这就是渐进式加载（Progressive Disclosure），官方三层：

| 层 | 何时进上下文 | 典型体积 | 内容 |
| --- | --- | --- | --- |
| 1 Metadata | 启动，始终 | ~100 token / Skill | `name` + `description` |
| 2 Instructions | 触发后 | 建议控制在较短正文 | `SKILL.md` 正文 |
| 3 Resources | 用到再取 | 未读 = 0 token | `references/`、`assets/`；脚本只回传结果 |

- 自研 Runtime 不必神秘，本质是文件系统 + 一次匹配：

```typescript
type SkillMeta = { name: string; description: string; dir: string }

function loadCatalog(root: string): SkillMeta[] {
  return listSkillDirs(root).map(dir => ({
    ...readFrontmatter(join(dir, 'SKILL.md')),
    dir,
  }))
}

async function activate(meta: SkillMeta, task: string): Promise<string> {
  const body = await readFile(join(meta.dir, 'SKILL.md'), 'utf8')
  return stripFrontmatter(body)          // 只在这一步把正文注入
}
```

- 两种触发都要会说：模型按 description 自动选；用户显式调用。副作用大的流程（部署、群发）应做成"只允许人触发"，不要让模型自己决定
- 和"全塞 System Prompt"对比：100 个 Skill 若每个正文 2k token，全塞就是 20 万 token；渐进加载启动成本大约 100 × 100 token，差两个数量级

> 写进 Prompt 不等于会用。正确做法是启动时只把每个 Skill 的 name 和 description 放进系统提示，大约每个一百来个 token；模型判断当前任务匹配，或者用户显式点名，Runtime 再去读 SKILL.md 正文；正文里引用的参考文件和脚本，用到再读、再跑。这就是渐进式加载，官方分三层：元数据常驻、指令触发后加载、资源按需。
>
> 我自己的还原 Skill 就是按这个拆的：启动时模型只看到"蓝湖设计稿还原、不用于凭空做 UI"这一句描述；真的开始还原，才读门禁和步骤；判断切图闸门时才去读 lanhu-mcp.md。如果把四份参考一次塞进系统提示，既贵，也会和别的 Skill 抢注意力。
>
> 自研 Runtime 也是同一套：扫目录做 catalog，匹配到再 read 文件注入本轮。驱动循环的还是外面的 Agent Loop，Skill 不替代 Loop。

### 容易答错的地方

- "把 SKILL.md 全文写进 System Prompt 就算接入了"——这正是腾讯面经里的反例
- 把脚本源码当参考文档读进上下文——脚本应该执行，只留输出
- 以为 Skill 被调用后会自己变成一个进程——它只是一份被读进上下文的说明书

## 5. 十个或一百个 Skill 怎么加载和选择？两个介绍很像怎么消歧？

- 加载策略先定死：**catalog 常驻，正文按需**。十个和一百个的差别不在"能不能全塞"，而在 description 会不会撞车
- 选择分三档，按规模升级，不要一上来上向量库：

```text
< 20 个     只靠 description 匹配，写清触发词和反例通常够用
20 ~ 100    catalog 再加一层轻量检索（关键词 / 向量），召回 3~5 个再让模型选
> 100       按域分组：先路由到"设计还原 / 排障 / 测试"，再在组内选 Skill
```

- 相似 Skill 消歧，优先改描述，不要靠模型"感觉"：

| 手段 | 做法 | 例子 |
| --- | --- | --- |
| 互斥边界写进 description | 各写"用于 / 不用于" | C 端蓝湖还原 vs B 端 HTML 转 Vue vs PSD 补证 |
| 触发词错开 | 用户原话里的词要能对上 | "蓝湖转代码" vs "PSD 转 HTML" vs "把这个后台页接入项目" |
| 仍冲突就问人 | 两个分数接近时澄清，不默默挑一个 | "这是活动 H5 还是管理后台？" |
| 观测误触发 | 记录命中 skill_id，误触发就改 description | 比把正文写得更长更有效 |

- 全塞 System Prompt 的三个后果：Token 成本线性涨、lost in the middle、两个像的 Skill 更容易选错——因为模型同时看见两份完整说明书，注意力被稀释
- 路由错了不要先怪模型：先看两个 description 是不是都像"做页面"，把场景、输入、禁止项写开

> 十个还是一百个，加载原则一样：常驻的只有 catalog 里的名字和描述，正文绝不批量进系统提示。规模小就靠 description；到几十上百个，先按域分组或对 catalog 做检索，召回几个再让模型选，而不是把一百份 SKILL.md 塞进去。
>
> 两个功能不同但介绍很像，本质是路由面写糊了。消歧我先改 description，把"用于 / 不用于"和触发词写开，比如我这边三个还原相关 Skill：蓝湖已有项目还原、PSD 补图层、B 端 HTML 转 Vue，场景和输入都不一样。还撞车就向用户澄清，不默默选一个。选错了优先改描述和互斥边界，而不是把正文加长。

## 6. Function Calling、MCP、Skill、Tool、A2A 有什么区别？Skill 内如何调用 MCP？

- 先给层次，不要把它们说成四个竞品（和《06》第 4 题对齐，本篇从 Skill 往下看）：

```text
模型层     Function Calling    模型怎么"说出"要调哪个函数、传什么参数
能力原子   Tool                一个可调用接口，JSON Schema 描述入参出参
连接层     MCP                 工具从哪来、怎么被发现、怎么跨应用复用
封装层     Skill               这类任务按什么步骤、什么标准做，内部可调 Tool / MCP
协作层     A2A                 Agent 和 Agent 之间怎么交任务
交互面     CLI                 人怎么点名触发（例如 /lanhu-implement-design）
```

- Tool Schema 长什么样（面试常跟 Skill 一起问）：

```json
{
  "name": "lanhu_get_design_slices",
  "description": "获取当前设计稿的切图清单。只返回元数据和 URL，不下载文件。用于素材核对，不用于留言。",
  "parameters": {
    "type": "object",
    "properties": {
      "designId": { "type": "string", "description": "蓝湖设计稿 id" }
    },
    "required": ["designId"]
  }
}
```

- Tool 和 Skill 不是一张注册表：Tool 是"能干什么原子动作"，每次调用看 Schema；Skill 是"这类任务怎么串起来"，匹配后才加载正文
- Skill 内调 MCP 的真实链路：

```text
SKILL.md 写明：用 lanhu_get_designs 定位页面
  → 模型 Function Calling 提出调用
  → Host 校验权限 / 白名单（禁 lanhu_say）
  → MCP Client 把调用发给 Server
  → 结果作为 Observation 回灌
  → Skill 里的门禁判断这条结果能不能当布局真值
```

- 外挂知识怎么放：稳定 SOP 放 `references/` 按需读；会变的业务知识走 RAG 或项目配置；密钥和 Cookie 不进任何一层 Prompt
- 选型一句话：私有三五个函数用 FC；工具要跨 Host 复用上 MCP；要沉淀 SOP 用 Skill；多 Agent 协作才 A2A。CLI 只是人触发 Skill 的入口，不是第四种协议

> 这几个概念不在同一层。Function Calling 是模型说出"调哪个函数、参数是什么"；Tool 是原子能力，用 JSON Schema 描述；MCP 是跨应用连工具的协议；Skill 是打法包，教模型拿到工具之后怎么用；A2A 才是 Agent 之间协作。CLI 只是人点名触发的入口。
>
> Skill 调 MCP 并不是 Skill 自己去连 Server。正文只写何时调哪个工具、失败怎么收；真正执行是 Host 把模型的 Function Calling 翻译成 MCP 的 tools/call。我那个还原 Skill 就是这样：MCP 提供三个读取工具，Skill 规定顺序、禁止留言工具、拿到 HTML 之后先判定是 DDS 还是兜底分支。知识也不全写进 SKILL.md，项目约定放 references，活动文案走配置，凭据不进上下文。
>
> 选型：少量私有工具直接 FC；要复用就 MCP；要统一怎么做就 Skill。不是四选一。

### 容易答错的地方

- "Skill 和 MCP 二选一"——一个管打法，一个管连接
- "Skill 替代了 Function Calling"——Skill 一步都离不开 FC 或等价的工具调用
- 把 Tool 清单和 Skill 清单合成一个注册中心却不分加载时机

## 7. 为什么做成 Skill，而不是 Workflow 或专用大 Agent？Skill 何时不够？

- 三者回答的问题不同：

| | Workflow | Skill | 专用 Agent |
| --- | --- | --- | --- |
| 控制流在谁 | 代码 / 图写死 | 模型按手册执行，Host 做门禁 | 独立 Loop + 自己的 State |
| 适合 | 步骤可枚举、强合规 | 同类任务反复出现，步骤内要判断 | 独立权限、独立记忆、长任务恢复 |
| 加载 | 始终按图跑 | 按需加载手册 | 常驻一套系统 |
| 代价 | 改流程要改代码 | 约束是软的，要靠 Host 兜底 | 通信、评测、运维都更重 |

- 适合做成 Skill 的信号：同一套 SOP 要跨人跨会话复用；输入形态多、中间要判断；已经有 Coding Agent / 工具，缺的是打法
- Skill 不够、该升级的信号：
  1. 顺序必须强制，模型跳过会出事 → 关键路径收回 Workflow
  2. 高风险副作用（转账、删数、发通知）→ 程序闸门，不要只写在 SKILL.md
  3. 敏感数据不能进模型上下文 → 工具侧脱敏 / 独立权限 Agent
  4. 要独立 Checkpoint、独立评测、独立租户配额 → 拆专用 Agent
- 快手那种"故障诊断做成 Skill 而不是大 Agent"：领域 SOP 稳定、工具已有、需要渐进暴露能力时，Skill 更合适；一旦要跨系统改状态、要独立审计账户，就回到 Agent + 程序门禁
- 默认立场：能 Skill 就不要新开 Agent，能 Workflow 就不要假装模型在编排

> 做成 Skill 还是 Workflow 还是独立 Agent，我看控制流和复用范围。步骤能写死、合规要求高，用 Workflow，模型只在节点里干活。同类任务反复出现、中间要判断、Host 已经是通用 Agent，就做成 Skill，缺的是手册不是又一套 Loop。只有需要独立权限、独立记忆、独立长任务恢复时，才拆专用 Agent。
>
> 我的设计稿还原就选了 Skill：布局类型和缺图分支不可枚举，不适合纯 Workflow；而外面已经有 Coding Agent 和蓝湖 MCP，再做一个还原 Agent 过重。Skill 不够的时候也很明确——模型可以忽略手册，所以禁调留言工具、凭据不出上下文，这些必须落在 Host 和工具层。高风险动作不要只写在 SKILL.md 里。

## 8. 怎么写一个好 Skill？Skill 有什么缺点？

- 好 Skill 的五条，按官方实践 + 面经追问收：

  1. **description 当路由写**：做什么、何时用、何时不用，带用户会说的词
  2. **正文短**：模型已经会写代码，只补它没有的项目纪律和门禁；建议 `SKILL.md` 控制体积，细节外置
  3. **步骤可验证**：每步有完成标准（三清单对过、截过图），不要只写"认真还原"
  4. **确定性部分用脚本**：排序、校验、格式转换用代码；判断题留给模型
  5. **自由度匹配脆弱度**：迁库、发版给低自由度；代码审查可以高自由度

- 短 Skill 为什么也有效（面经里的 grill-me）：目标单一、约束清楚、触发面窄。短不是目的，**单职责**才是
- 主动说缺点，这是加分：

```text
选错       description 撞车或过宽，误触发比没有更糟
软约束     模型可以不遵守正文，必须配合 Host 权限
安全面     恶意 Skill ≈ 带指令的可执行包
绑模型     弱模型吃不透长手册，强模型又嫌你啰嗦
评测难     不像单元测试有硬断言，要 golden query + 轨迹
漂移       项目约定变了，references 不更新就变成错手册
```

- 反模式：把整本 wiki 贴进 `SKILL.md`；把鉴权写进 markdown 当唯一门禁；一个 Skill 同时干还原、发版、答疑

> 好 Skill 我抓三条：description 写清何时用何时不用；正文只放模型没有的纪律和可验证步骤，细节外置按需读；能脚本化的别让模型每次现写。短小的 Skill 有效，是因为职责单一、触发面窄，不是因为短本身有魔法。
>
> 缺点必须主动说。第一是选错，两个描述像了就会抢任务；第二是软约束，模型可以跳过门禁，所以高风险动作要靠 Host；第三是安全面，Skill 能带脚本，来源不可信就等于在执行未知说明书；第四是会漂，项目约定更新了手册不更新，比没有手册更危险。我写还原 Skill 时就把"先搭页面再补图"这种借口写进对照表，就是为了把已知失败模式固化进去，而不是写一篇很长的正确流程。

## 9. 鉴权该不该写在 Skill 里？Skill 有哪些安全风险？

- 短答：**不该把鉴权实现在 Skill 里**。Skill 是模型可读文本，能被忽略、被改写、被绕过式提问绕开
- 权限放哪：

```text
身份认证 / Token     Host、网关、MCP Server，凭据不进模型上下文
工具白名单           Host：哪些 Tool 对当前租户可见，禁调写操作
租户与配额           程序侧按 userId / session 隔离
人工闸门             删数据、发通知、花钱：waiting_approval，不是一句"请谨慎"
Skill 正文能写什么   禁止事项、何时停、向谁请示——只是提示，不是执行
```

- 主要风险：

  1. **恶意 Skill**：说明书让模型读密钥、外连、改文件；脚本依赖和图片里也能藏指令
  2. **间接注入**：Skill 让模型去读外部 URL / 用户文档，文档里再夹带新指令
  3. **绕过式提问**：用户换一种说法让模型输出敏感内容——输出约束不够，敏感数据根本不该进上下文
  4. **把 `allowed-tools` 当成授权**：规范标了实验性，Host 仍可能不执行；即便执行也不是完整鉴权模型
  5. **上下文泄露**：设计稿、源码、Cookie 一旦进对话，后续轮次都可能被带出去

- 快手原题"鉴权是否应在 Skill 中实现"：不应。Skill 负责"不要调用留言工具"；Host 负责"这个工具对当前会话不可见 / 调用直接拒绝"
- 最小落地：只装可信来源；审计 `SKILL.md` 和脚本；高危工具默认拒绝；凭据环境变量注入 Host，永远不进 Skill 和模型

> 鉴权不该写在 Skill 里实现。Skill 只是给模型看的说明书，模型可以不听，用户也可以换个问法绕过。身份、工具白名单、租户隔离、配额必须在 Host 和 MCP Server。Skill 里最多写禁止事项和"停下来问人"，那是提示不是门禁。
>
> 风险我一般讲三条：恶意 Skill 等于带指令的可执行包；外部资料造成间接注入；敏感内容一旦进上下文，输出层再拦已经晚了。allowed-tools 不能当授权系统用。我自己的还原 Skill 写明 Cookie 不读不复述，但真正有效的是 MCP 侧凭据不出进程、留言类写工具根本不对模型暴露。绕过式提问下，不让模型看见敏感字段，比在 Prompt 里写"不要泄露"可靠。

## 10. 如何评测一个 Skill？怎么提升调用准确性？

- 评测分层，避免只看"最终像不像"：

| 层 | 指标 | 怎么算 |
| --- | --- | --- |
| 路由 | 命中正确 Skill 的比例、误触发率 | golden query → 期望 skill_id |
| 过程 | 是否走上门禁、工具是否选对、禁调工具是否被调用 | 轨迹断言，规则就能算 |
| 结果 | 任务完成率、回滚次数、人工改写轮数 | 离线集 + 线上抽样 |
| 成本 | Token、轮次、P95 延迟 | 和基线比，手册变长不等于变好 |
| 安全 | 凭据是否出现在轨迹、越权调用次数 | 零容忍 |

- 对还原这类 Skill，过程指标往往比"像素差"更先能测：缺图是否在写码前拦住、是否误用兜底 HTML 当布局、有没有调 `lanhu_say`
- 提升"选对 Skill / 选对工具"的顺序：

```text
1. 改 description 和 Tool description，写何时用、何时不用
2. 互斥边界 + catalog 检索，降低同时可见的候选
3. Schema 加枚举和必填，减少参数胡编
4. 禁调工具在 Host 层摘掉，不依赖模型自觉
5. Badcase 回流入 golden 集，改完回归
```

- 离线好、线上差：查 query 分布是不是漂了、是不是出现了 description 没覆盖的新说法，不要先换模型
- Prompt / Skill 改完是否有效：同一评测集、同一模型、看路由准确率和任务完成率，而不是看单次对话顺不顺

> Skill 评测我分路由、过程、结果、成本四层。先看该不该点到这个 Skill、禁不禁用错工具，再看任务完成率和纠偏轮数。还原这种场景，我会先测"缺图有没有在写码前被拦住"、"有没有把兜底 HTML 当布局"，这些规则就能断言，比先上像素评测便宜。
>
> 提升准确性，我优先改 description 和互斥边界，这比把正文写长更有效；工具侧把不该出现的 API 从列表里拿掉，不指望模型看到说明书就自觉。每次改手册用同一批 golden query 回归，路由准确率和误触发率没有变好，就不算这次修改有效。线上变差就去看新 query 是不是手册没覆盖，而不是先换更大的模型。
