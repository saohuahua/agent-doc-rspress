# Pi 原理 02 / 03 章重构规划

> 范围：`docs/pi/principle/02-message-journey/` 与 `docs/pi/principle/03-agent-loop/`
>
> 目标：把现有的源码机制清单重构成面向有一定 Agent 基础读者的原理教程，形成“已有认知 → 最小实现 → Pi 的工程化演进 → 真实问题 → 解决方案”的连续路径。

## 1. 当前问题

### 1.1 共性问题

- 信息量足够，但主叙事被源码证据、编号、表格和局部结论挤压。
- 总览页与详解页重复较多，读者先读一遍结论，进入详解页后又读一遍相同分类。
- 当前更像源码复盘和面试速记，不像从已有 Agent 基础继续向工程实现推进的教程。
- 缺少贯穿两章的最小示例，读者难以把 Pi 的设计映射到自己会写的 Agent 上。
- 经常直接给出“十四道闸”“六个出口”等最终分类，没有先说明这些结构是为了解决什么问题而逐步产生的。
- 真实问题虽然被提到，但缺少“怎么识别 → 定位哪一层 → 如何修改 → 如何验证”的完整处理闭环。
- “最值得记”“不及格”“必须”等面试式表达偏多，正文应优先服务理解，面试总结放到章末。

### 1.2 第 02 章特有问题

- “十四道闸”是源码作者视角的完整清单，不是读者理解输入链路的最佳起点。
- TUI 命令数量、每道闸的逐项证据等细节权重过高，掩盖了输入处理的四个核心阶段。
- `index.md` 已经详细介绍十四道闸和五次转换，`gates.md`、`assembly.md` 又重复展开，导航页过重。
- 缺少一个最小 `prompt(text)` 实现，无法直观看出 Pi 在最小输入管线之上增加了哪些工程能力。
- `AgentMessage → Message → Provider Payload` 的核心设计思想没有成为主线，目前更多表现为若干转换函数的罗列。

### 1.3 第 03 章特有问题

- 一开始进入“三层循环、六个出口”，缺少从最小 `while` 循环逐步演进到生产循环的过程。
- “六个出口”混合了真正终止、条件变化、续跑和循环外异常兜底，不属于同一抽象层。
- “读同一个文件 47 次”的场景只负责引题，没有继续用于诊断、停止和验证。
- 缺少无人值守场景下 turn / time / token / cost 预算的具体实现。
- Abort、上下文窗口和成本被描述得过于接近硬终止机制；实际 Pi 没有不可绕过的默认 hard limit。
- `agent_end`、自动重试、压缩续跑、队列续跑与 `agent_settled` 的关系虽然讲到了，但没有放进统一生命周期中呈现。

## 2. 目标读者与写作起点

目标读者已经知道：

- Agent 的基本结构是“模型决策 → 工具执行 → 结果回填 → 再次决策”。
- `messages`、tool call、tool result、stream、context window 的基本概念。
- 最小 Agent 可以用一个 `while (true)` 跑起来。

因此正文不重新教授 Agent 入门概念，而是回答：

1. 最小实现进入真实产品后会遇到什么问题？
2. Pi 在最小实现上增加了哪些结构？
3. 每个结构为什么放在当前位置？
4. 这些结构仍有哪些边界？
5. 自己基于 Pi 开发时应该怎么实现和验证？

## 3. 两章共用的贯穿场景

统一使用一个任务：

```text
修复 src/api.ts 的类型错误，并运行测试确认修复结果。
```

第 02 章追踪：

```text
用户输入
→ 命令或普通文本判断
→ Skill / 模板 / 扩展处理
→ 运行前校验与压缩
→ AgentMessage
→ LLM Message
→ Provider Payload
```

第 03 章继续追踪：

```text
模型读取文件
→ 修改代码
→ 运行测试
→ 根据测试结果继续或结束
→ 用户中途修正方向
→ 工具或 Provider 出错
→ Abort / Retry / Compaction
→ agent_settled
```

同一个场景还要覆盖四种异常：

- 模型反复读取同一文件。
- 测试命令长时间不返回。
- Provider 返回可重试错误。
- `agent_end` 后因重试、压缩或队列消息再次运行。

## 4. 章首“上帝视角”要求

每章开头必须先给读者一个前瞻性的全局说明，再进入代码和源码细节。

章首应回答：

- 最小版本是什么？
- Pi 在最小版本上依次增加了什么？
- 每次增加解决了什么问题？
- 本章最终会得到什么完整结构？
- 哪些问题 Pi 仍没有解决？

优先使用 TXT 图；节点不超过 10 个、层级不超过 3 时可以使用 Mermaid。

章首图不是源码调用图，而是“设计演进图”。图中同时表现：

```text
最小实现
  │
  ├─ 遇到问题 A → Pi 增加机制 A
  ├─ 遇到问题 B → Pi 增加机制 B
  └─ 最终形成生产结构
```

图后增加一段不超过 150 字的导读，明确本章阅读路线。读者看完图和导读，即使暂时不读源码，也应能复述 Pi 的总体处理方式。

## 5. 第 02 章重构方案

### 5.1 章首上帝视角

建议使用以下演进关系：

```text
最小输入管线
  prompt(text) → messages.push(user) → agent.prompt()
       │
       ├─ 输入不一定是普通问题
       │    → 命令 / shell / 普通文本分类
       │
       ├─ 用户输入不一定是最终文本
       │    → extension input / Skill / Prompt Template
       │
       ├─ Agent 可能正在运行或上下文将满
       │    → Steering / Follow-up / Compaction / Auth 校验
       │
       └─ 内部消息不能直接发给所有 Provider
            → AgentMessage → Message → Provider Payload
```

章首先把 Pi 的处理归纳为四个阶段：

1. 输入分类。
2. 文本变换。
3. 运行前保护。
4. 上下文与 Provider 装配。

“十四道闸”是这四个阶段的源码展开，不作为第一心智模型。

### 5.2 最小示例

先给一个不超过 25 行的教学版 `prompt(text)`：

```typescript
async function prompt(text: string) {
  if (isCommand(text)) return executeCommand(text);

  const expanded = expandPrompt(text);
  if (agent.isRunning) return agent.steer(expanded);

  assertModelAndAuth();
  await compactIfNeeded();

  const message = createUserMessage(expanded);
  await agent.prompt(message);
}
```

这段代码只负责建立骨架。后文每增加一个 Pi 机制，都要明确它对应骨架中的哪一步。

### 5.3 页面结构

#### `index.md`：输入如何进入 Agent

只保留：

- 目标读者已有认知。
- 贯穿场景。
- 章首设计演进图。
- 四阶段输入管线。
- 最小 `prompt(text)` 示例。
- Pi 最终结构速查。
- 章节导航、边界、未验证项和小结。

总览不再逐项解释十四道闸，目标控制在约 100–140 行。

#### `gates.md`：从最小输入管线到四阶段处理

按四组组织，不再按十四个编号逐节组织：

1. 输入分类：空输入、内置命令、shell、普通文本。
2. 文本变换：扩展命令、`input`、Skill、模板。
3. 运行状态：压缩互斥、Steering、Follow-up。
4. 运行前保护：模型、认证、压缩检查、`before_agent_start`。

每组采用统一结构：

```text
最小实现怎么写
→ 会遇到什么问题
→ Pi 怎么处理
→ 关键源码
→ 取舍与失败表现
→ 实际排查入口
```

完整十四道闸表移到页末折叠区，作为源码索引。

以下内容降级到附录或删除：

- 23 条声明、26 条实际处理等命令数量统计。
- 每个低价值分支的逐项代码摘录。
- 总览页已经说过的重复结论。

#### `assembly.md`：从领域消息到 Provider Payload

以三种数据结构的边界为主线：

```text
AgentMessage       Pi 的领域模型
     ↓ convert
Message            模型层统一协议
     ↓ buildParams
Provider Payload   厂商专属请求体
```

重点回答：

- 为什么内部消息模型要比 Provider 协议丰富？
- 为什么自定义消息最终会有损降级？
- 为什么 Provider 差异要推迟到最后一层？
- 为什么 system prompt、API Key 和 payload hook 位于不同阶段？

浅拷贝、OAuth token 刷新、header hook、`onPayload` 作为边界设计的证据，不作为并列知识点展开。

### 5.4 第 02 章真实问题闭环

至少完整处理以下问题：

- `/review` 同时被扩展命令和模板注册时，为什么模板不生效，如何定位优先级。
- 压缩期间直接调用 `AgentSession.prompt()` 为什么报错，TUI 为什么选择排队。
- 认证失败为什么不应先把 user message 写入会话。
- `AGENTS.md` 修改后为什么当前 system prompt 没变化，何时需要 reload。
- 跨 Provider 修改 payload 时为什么会出现抽象泄漏。

## 6. 第 03 章重构方案

### 6.1 章首上帝视角

章首从最小循环开始，提前展示生产循环如何逐层形成：

```text
最小 Agent Loop
  while (true): 模型回复 → 执行工具 → 回填结果
       │
       ├─ 模型正常完成
       │    → 没有 tool call，结束当前 Agent Loop
       │
       ├─ Provider / 回调出错
       │    → error / retry / 异常事件兜底
       │
       ├─ 用户要求停止
       │    → AbortSignal，阻止后续请求与工具启动
       │
       ├─ 用户中途补充任务
       │    → Steering / Follow-up，形成内外双层循环
       │
       ├─ Agent Loop 结束后仍需继续
       │    → Session 层处理 retry / compaction / queued continuation
       │
       └─ 无人值守运行需要硬预算
            → turn / time / token / cost + 进程级 watchdog
```

紧接着给最终生命周期图：

```text
prompt
  ↓
Agent Loop ── turn 1 ── turn 2 ── ... ── agent_end
  ↑                                      │
  └──── Session retry / compaction ──────┘
                                         │
                                         ▼
                                  agent_settled
```

章首先告诉读者：

- `agent_end` 只表示一次底层 Agent Loop 结束。
- `agent_settled` 才表示产品层不会自动继续。
- Pi 默认没有 turn、time、token、cost 的不可绕过硬上限。

### 6.2 最小示例

先复用并压缩 Learn 中的最小循环：

```typescript
while (true) {
  const response = await callModel(messages);
  if (!response.toolCalls.length) break;

  const results = await executeTools(response.toolCalls);
  messages.push(response, ...results);
}
```

后文每一节只增加一个生产需求，并展示循环结构如何变化：

1. 加 Steering。
2. 加 Follow-up 和外层循环。
3. 加错误与终止分支。
4. 加 Session 续跑。
5. 加无人值守预算。

### 6.3 页面结构

#### `index.md`：Agent 如何持续工作并最终停止

只保留：

- 贯穿场景。
- 最小循环。
- 章首设计演进图。
- 最终生命周期图。
- 正常结束、错误、中止、续跑、预算五类问题的导航。
- Pi 已解决和未解决的边界。

“三层循环”和控制流结果表可以保留，但放在演进图之后，不作为开篇第一结论。总览目标控制在约 110–150 行。

#### `loop.md`：从最小循环到交互式生产循环

推荐顺序：

1. 最小 `while` 为什么能工作。
2. 一轮的定义：模型回复 + 本批工具执行。
3. 没有 tool call 时如何自然结束。
4. 用户中途纠正方向：增加 Steering。
5. 用户排后续任务：增加 Follow-up 与外层循环。
6. 队列多处轮询带来的重复消费问题。

不再使用“六个出口”统领正文，改为“控制流结果”：

- 真正终止：自然结束、error / aborted、`shouldStopAfterTurn`。
- 改变下一轮条件：`terminate`。
- 继续运行：Steering、Follow-up。
- 循环外异常兜底：callback throw 后由 `Agent` 补事件。

callback throw 的完整代码移到页末异常附录。

#### `termination.md`：停止、续跑与无人值守预算

推荐顺序：

1. Abort 信号如何传播。
2. 为什么 Abort 是协作式中止，不是立即硬终止。
3. `agent_end` 后为什么会 retry、compaction 或 queued continuation。
4. 为什么最终状态应观察 `agent_settled`。
5. 无人值守运行如何补 turn / time / token / cost 预算。
6. 进程或容器 watchdog 为什么仍然必要。
7. 排障决策树与测试矩阵。

三层重试放到 Session 续跑之后解释，不再与“防死循环”并列开场。

`stopReason === "length"` 下残缺参数整批作废的完整案例移动到第 04 章；本章只说明它如何影响循环是否继续。

### 6.4 无人值守最小实现

必须增加一段可运行方向明确的示例，同时体现 turn 与 time 两层预算：

```typescript
let turns = 0;

const agent = new Agent({
  shouldStopAfterTurn: () => ++turns >= 20,
  // model、tools、streamFn 等配置省略
});

const timeout = setTimeout(() => agent.abort(), 10 * 60_000);

try {
  await agent.prompt("修复 src/api.ts 的类型错误，并运行测试");
  await agent.waitForIdle();
} finally {
  clearTimeout(timeout);
}
```

示例后必须明确：

- turn 预算只能在当前模型回复和工具批次完成后检查。
- time 预算通过 Abort 请求协作式中止。
- token 预算从 assistant usage 累计，不等于单次 `maxTokens`。
- cost 预算需要按模型价格计算，Pi 默认没有硬成本上限。
- 工具忽略 signal 时，`agent.abort()` 仍可能无法及时返回。
- 真正硬停止需要宿主进程、worker、容器或 CI timeout。

### 6.5 第 03 章排障决策树

使用 TXT 图呈现：

```text
Agent 看起来没有停
  │
  ├─ 仍持续出现 turn_end？
  │    ├─ 是：模型仍在请求工具 → 查重复调用与 turn 预算
  │    └─ 否：继续往下
  │
  ├─ 卡在 tool_execution_start？
  │    └─ 工具未返回 → 查 signal、子进程和第三方工具超时
  │
  ├─ 已出现 agent_end，随后又有 agent_start？
  │    └─ 查 retry、compaction、agent_end handler 排队
  │
  └─ 后台已经结束但 UI 仍未恢复？
       └─ 查是否等待 agent_settled / idle
```

### 6.6 第 03 章验证矩阵

至少覆盖：

- 模型不调用工具，自然结束。
- 一次工具调用后自然结束。
- Steering 在下一次模型请求前注入。
- Follow-up 在当前任务结束后注入。
- 达到 turn 上限后停止。
- Provider 请求期间触发 timeout。
- 内置 bash 工具执行期间触发 Abort。
- 第三方工具忽略 signal，验证仅靠 Abort 不构成 hard limit。
- 自动重试后只在最终状态发出 `agent_settled`。
- `agent_end` handler 持续排队导致 Session 层续跑。

## 7. 写作与排版规则

### 7.1 正文与证据的层级

正文优先级：

```text
问题 → 最小实现 → Pi 的设计 → 关键源码 → 取舍 → 排障与验证
```

以下内容放入折叠区：

- 完整 file:line 索引。
- 低频异常分支。
- 数量统计。
- 不影响核心心智模型的逐项源码证据。

### 7.2 图的职责

每章至少包含两类图：

- 章首设计演进图：说明最小实现如何逐步长成 Pi 的生产结构。
- 完整运行图：说明消息或控制流最终如何经过各层。

图必须表达因果关系，不能只是把文件名和函数名排列出来。

### 7.3 示例规则

- 示例用于解释 Pi 的核心思想，不用于复刻全部源码。
- 每段最小示例不超过 25 行。
- 示例中的每个结构都必须能在后文找到 Pi 源码对应点。
- 两章尽量复用同一个任务和同一组变量名，避免读者反复切换上下文。
- 示例后必须说明“Pi 比这个最小版本多做了什么”。

### 7.4 语气规则

减少：

- “这张表最值得记”。
- “这样回答不及格”。
- “官方明确表态”等无直接出处的判断。
- “唯一”“全部”“一定”等容易超过证据范围的绝对词。

改为：

- 直接说明设计解决的问题。
- 区分源码事实、设计归纳和未验证推断。
- 面试表达集中放在章末，不打断正文教程主线。

## 8. 验收标准

重构完成后，读者应能在不查看源码索引的情况下回答：

### 第 02 章

- 一个普通字符串为什么不能直接进入 Agent Loop？
- Pi 的输入管线为什么分成输入分类、文本变换、运行前保护和上下文装配？
- `AgentMessage`、`Message`、Provider Payload 为什么需要分层？
- 命令冲突、压缩竞争、认证失败和 Provider 抽象泄漏分别在哪一层处理？

### 第 03 章

- 最小 Agent Loop 如何逐步演进成 Pi 的内外双层循环？
- 正常结束、错误、中止、Follow-up 和 Session 续跑分别处于哪一层？
- 为什么 `agent_end` 不等于真正结束？
- 为什么 Abort 不是 hard limit？
- 如何实现 turn / time / token / cost 预算？
- Agent 不停时如何区分模型循环、工具挂起和 Session 自动续跑？

最终判断标准：两章必须形成以下连续学习路径，而不是停留在会使用或能定位源码。

```text
知道最小 Agent 怎么写
→ 看懂最小实现进入产品后暴露的问题
→ 理解 Pi 为什么增加这些层和回调
→ 能写出关键保护机制
→ 能定位真实运行中的异常
→ 能说明 Pi 已解决和仍未解决的边界
```
