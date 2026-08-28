---
title: 04 工具怎么被安全地执行
description: 从最小 executeTools 到 Pi 的三段式，以及模型输出不精确时的四层容错
---

# 04 工具怎么被安全地执行

以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准。本章所有 `file:line` 经 `pnpm check:refs` 校验，代码块里的中文注释为本文补充。

## 本章的起点

这里假设你已经知道：工具就是"一段 JSON Schema + 一个 `execute` 函数"，模型输出的 tool call 里带着 `name` 和 `arguments`，执行完把结果作为 `toolResult` 消息塞回上下文（[Learn 03](/learn/03-tool-basics)、[Learn 07](/learn/07-side-effects-and-safety)）。

本章回答的是下一组问题：

- 模型写错了参数怎么办——它**经常**写错
- 副作用发生之前，谁有机会拦一下
- 一条消息里有五个工具调用，并行跑会不会互相踩
- 工具输出几十兆，怎么不把上下文撑爆

## 贯穿场景

继续[第 03 章](../03-agent-loop/)的任务：

```text
修复 src/api.ts 的类型错误，并运行测试确认修复结果。
```

模型会依次调用 `read`、`edit`、`bash`。本章处理的是这三次调用各自可能出的岔子。

## 一、最小工具执行是怎么长成 Pi 的

最小版本大概是这样：

```typescript title="教学示例，非 Pi 源码" {3,5}
async function executeTools(toolCalls) {
  const results = [];
  for (const call of toolCalls) {
    const tool = tools.find((t) => t.name === call.name);
    const result = await tool.execute(call.arguments);   // 直接执行，直接相信
    results.push(toolResult(call.id, result));
  }
  return results;
}
```

它有两个隐含假设：**模型给的参数是对的**，**工具一定会正常返回**。两个假设在真实使用中都不成立。

```text
  最小工具执行
  find tool → tool.execute(args) → push result
       │
       ├─ 问题 A：模型写的参数不一定合法
       │     少字段、类型写错、结构写错、名字拼错
       │     → 准备阶段：查找 → 结构 shim → schema 校验 → 校验失败也回填成结果
       │
       ├─ 问题 B：副作用发生前需要有人能拦
       │     权限、审计、路径保护都必须在这一刻表达
       │     → 准备阶段末尾：beforeToolCall，可 block
       │
       ├─ 问题 C：工具会抛、会卡、会长时间不返回
       │     异常不能中断整个循环，中止要能传进去，进度要能显示
       │     → 执行阶段：try/catch 转结果、signal、onUpdate 流式
       │
       ├─ 问题 D：一条消息里可能有多个调用
       │     全串行慢，全并行会写坏同一个文件
       │     → 调度：默认并行 + 预检串行 + 按文件互斥队列
       │
       └─ 问题 E：结果不能原样回给模型
             几十兆的输出、图片、扩展想改写
             → 收尾阶段：afterToolCall → 归一化 → 截断 → 回填 toolResult

  ────────────────────────────────────────────────────────────
  最终结构：准备 → 执行 → 收尾 三段式，在 agent-loop.ts 里就是三个函数
```

**阅读路线**：先记住"三段式"和"四层容错"这两个骨架。准备阶段的全部内容在 [04.1](./contract)；执行与调度、以及事件顺序在 [04.2](./execution)；内置工具怎么容错、怎么截断在 [04.3](./builtins)。

## 二、三段式

Pi 把最小版本的那一行 `tool.execute(args)` 拆成了三个函数，`agent-loop.ts` 里一一对应：

- **准备**：`prepareToolCall`（`packages/agent/src/agent-loop.ts:600`）
  - 按名字找工具，找不到就直接产出一条错误结果
  - 调 `prepareArguments` 做结构兼容
  - 调 `validateToolArguments` 做 schema 校验
  - 调 `beforeToolCall` 给扩展一次阻断机会
  - 中间任何一步失败，都返回 `kind: "immediate"` —— **不执行，但仍然产出一条结果**
- **执行**：`executePreparedToolCall`（`packages/agent/src/agent-loop.ts:670`）
  - 只在准备成功时才进来
  - `try/catch` 包住，工具抛出的异常被转成错误结果
  - 把 `signal` 和 `onUpdate` 交给工具
- **收尾**：`finalizeExecutedToolCall`（`packages/agent/src/agent-loop.ts:713`）
  - 调 `afterToolCall`，扩展可以逐字段覆盖结果
  - 扩展自己抛异常时，结果被替换成错误结果
  - 产出最终的 `toolResult` 消息

三段式最重要的性质是：**每一条路径都产出一条结果**。工具不存在、参数不合法、被扩展阻断、执行抛异常——模型都会收到一条 `toolResult`，而不是遇到一个空洞。

这一点直接决定了循环的形状（[第 03 章](../03-agent-loop/loop)）：`toolCalls.length > 0` 就必然有等量的 `toolResult`，provider 不会因为 tool call 缺少配对结果而拒绝下一次请求。

## 三、四层容错

模型的输出不精确，是本章所有设计的共同前提。Pi 在四个不同层面做了容错，每层管一类偏差：

| 层 | 管什么偏差 | 实现 | 典型案例 |
|---|---|---|---|
| 结构 | 参数的**形状**不对 | `prepareArguments` | 把 `edits` 数组写成 JSON 字符串 |
| 类型 | 字段的**类型**不对 | `validateToolArguments` | 把数字写成 `"10"`、可选字段填 `null` |
| 内容 | 文本**不完全一致** | `fuzzyFindText` | 弯引号、行尾空白、全角空格 |
| 路径 | 文件名**不完全一致** | `resolveReadPath` | macOS NFD 分解、截图名里的窄空格 |

四层的顺序是从外到内的：先把结构掰正，再把类型转对，最后在工具内部处理内容和路径的差异。

- 前两层是**通用的**，对所有工具生效
- 后两层是**工具自己的事**，只有 `edit` 和 `read` 这类需要精确匹配的才做

容错不是无条件的好事。它们都在放宽"模型必须精确"的要求，代价见 §五。

## 四、Pi 比骨架多做了什么

| 骨架里的一行 | Pi 实际做的 | 展开位置 |
|---|---|---|
| `tools.find(...)` | 找不到也产出结果，而不是抛异常打断整批 | [04.1 §一](./contract) |
| —— | `prepareArguments` 结构 shim，源码里点名了两个真实模型的错法 | [04.1 §二](./contract) |
| —— | 四步 schema 校验，失败信息**原样回填给模型**当可恢复错误 | [04.1 §三](./contract) |
| —— | `beforeToolCall` 阻断点，并行模式下也是串行执行的 | [04.1 §四](./contract) |
| `await tool.execute(args)` | try/catch 转结果、传 `signal`、`onUpdate` 流式进度 | [04.2 §一](./execution) |
| `for (…)` 串行 | 默认并行，但预检串行；`edit`/`write` 再按文件互斥 | [04.2 §二](./execution) |
| `push(result)` | `afterToolCall` → 图片归一化 → 产出 `toolResult` | [04.2 §三](./execution) |
| —— | 输出截断三种策略，并把"被截断了、去哪看全量"写给模型 | [04.3 §二](./builtins) |

## 五、Pi 没有解决的

- **没有路径 jail。** `resolveToCwd` 只做解析不做围栏，`read /etc/passwd`、`edit ../../other-project/x.ts` 都会被放行。工具层不构成安全边界，隔离只能来自扩展拦截（[第 09 章](../09-extension-system)）或操作系统（第 10 章）
- **没有 read-before-edit 强制。** 模型可以直接 `edit` 一个从没读过的文件，靠的是"找不到 `oldText` 就报错"而不是流程约束
- **容错会掩盖模型的真实错误。** 弯引号被自动归一化之后，你不会知道模型其实抄错了字符；这在调试"为什么改出来的代码有奇怪字符"时会增加难度
- **并行的事件顺序是隐式契约。** `tool_execution_end` 按完成顺序发，工具结果消息按模型给出的顺序发。这件事只写在 `toolExecution` 字段的 JSDoc 里（`packages/agent/src/types.ts:268`），类型系统约束不了
- **`terminate` 要求整批一致**，且没有内置工具会设置它（[第 03 章](../03-agent-loop/termination)）
- **截断阈值是全局常量**，`DEFAULT_MAX_LINES`（`packages/coding-agent/src/core/tools/truncate.ts:11`）写死 2000 行 / 50KB，不能按工具或按模型上下文大小调整

## 六、本章导航

- [04.1 参数怎么进来](./contract) —— 工具契约、结构 shim、schema 校验、阻断点
- [04.2 结果怎么回去](./execution) —— 执行的异常与中止、并行与互斥、事件顺序、动态工具
- [04.3 内置工具的容错与截断](./builtins) —— 八个工具、三种截断策略、四层路径回退、错误消息即提示词

## 七、未验证与推断

- ✅ 三段式的划分、四层容错的位置、并行调度的顺序，均读源码得出并经 `check:refs` 校验
- ✅ "没有路径 jail"经全仓 grep 确认，`core/tools/` 下没有任何 cwd 边界检查
- ⚠️ "四层容错"是本文对源码的归纳，Pi 源码里没有这个分层命名
- ⚠️ `prepareArguments` 注释点名的两个模型（Opus 4.6、GLM-5.1）来自源码注释，未自行复现
- ❌ 未实测并行工具在真实任务里的加速比
- ❌ 未实测截断阈值对长任务成功率的影响

## 八、小结

- 最小工具执行的两个隐含假设（参数是对的、工具会正常返回）在真实使用里都不成立
- Pi 把 `tool.execute()` 拆成准备 / 执行 / 收尾三段，**每条路径都产出一条结果**，保证 tool call 与 toolResult 一一配对
- 模型输出不精确是共同前提，容错分四层：结构、类型、内容、路径；前两层通用，后两层是工具自己的事
- 校验失败不是异常，是回填给模型的一条可恢复错误
- 工具层不是安全边界：没有路径 jail，没有 read-before-edit 强制

:::details 面试对应（§12 编号）

- **#2 怎么保证执行过程中的准确性和可靠性** —— 三段式保证结果配对、四层容错处理模型输出偏差、校验失败回填成可恢复错误
- **#10 工程上做了哪些东西控制输出风险** —— `beforeToolCall` 是副作用前唯一的阻断点、输出截断的三种策略、以及工具层为什么不构成安全边界

:::

## 下一步

→ [04.1 参数怎么进来](./contract)
