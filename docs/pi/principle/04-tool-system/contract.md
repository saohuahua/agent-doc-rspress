---
title: 04.1 参数怎么进来
description: 工具契约、结构 shim、四步 schema 校验，以及副作用前唯一的阻断点
---

# 04.1 参数怎么进来

[← 回到 04 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

这一页讲三段式里的第一段：`prepareToolCall`（`packages/agent/src/agent-loop.ts:600`）。它做四件事，任何一件失败都**不执行工具，但仍然产出一条结果**。

```text
  toolCall { name, arguments }
       │
       ├─ ① 按名字找工具 ────────────► 找不到：产出错误结果
       │
       ├─ ② prepareArguments 结构 shim
       │
       ├─ ③ validateToolArguments ──► 不通过：把校验信息产出成错误结果
       │
       └─ ④ beforeToolCall ─────────► 被 block：产出被拒结果（可带 terminate）
              │
              ▼
        kind: "prepared" → 交给执行阶段
```

## 一、工具契约

先看 Pi 要求一个工具长什么样：

```typescript title="packages/agent/src/types.ts:386" {3,7,12,18}
export interface AgentTool<TParameters extends TSchema = TSchema, TDetails = any> extends Tool<TParameters> {
  /** Human-readable label for UI display. */
  label: string;                                     // 只给界面看，不进 prompt
  /**
   * Optional compatibility shim for raw tool-call arguments before schema validation.
   */
  prepareArguments?: (args: unknown) => Static<TParameters>;   // 结构层容错，见 §二
  /** Execute the tool call. Throw on failure instead of encoding errors in `content`. */
  execute: (
    toolCallId: string,
    params: Static<TParameters>,
    signal?: AbortSignal,                            // 中止，见 04.2
    onUpdate?: AgentToolUpdateCallback<TDetails>,    // 流式进度，见 04.2
  ) => Promise<AgentToolResult<TDetails>>;
  /**
   * Per-tool execution mode override.
   */
  executionMode?: ToolExecutionMode;                 // 覆盖全局并行/串行，见 04.2
}
```

它继承自 `ai` 包的 `Tool`，后者提供 `name`、`description`、`parameters`（JSON Schema）。有三处值得注意：

- **`execute` 的契约是"失败就抛"**，不是"把错误编码进 `content`"。这跟很多框架的做法相反，理由见 §五
- **`label` 不进 prompt**，模型看到的只有 `name` 和 `description`
- **`prepareArguments` 明确定位为"兼容 shim"**，注释里写的是 "before schema validation"——它跑在校验之前

### 工具描述是提示词的一部分

除了 `description`，`coding-agent` 还给工具定义加了两个字段，它们最终会被拼进 system prompt：

```typescript title="packages/coding-agent/src/core/tools/edit.ts:56" {2,4,6}
export const editToolSystemPromptContribution = {
  snippet: "Make precise file edits with exact text replacement, including multiple disjoint edits in one call",
  guidelines: [
    "Use edit for precise changes (edits[].oldText must match exactly)",
    "When changing multiple separate locations in one file, use one edit call with multiple entries in edits[] instead of multiple edit calls",
    "Each edits[].oldText is matched against the original file, not after earlier edits are applied. Do not emit overlapping or nested edits. Merge nearby changes into one edit.",
    // …
  ],
} as const;
```

- `snippet` 进"Available tools"清单，一行一个工具
- `guidelines` 进"Guidelines"段落，是**跨工具去重后**的一份全局列表

这些句子的作用是**减少后面几层容错的触发频率**。"`oldText` 必须唯一"和"不要提交重叠的编辑"，都是在提前劝阻模型犯那些 `edit` 内部要专门处理的错误。system prompt 的完整拼装在第 05 章。

## 二、结构 shim：`prepareArguments`

### 最小实现怎么写

不写。直接把 `call.arguments` 丢给 schema 校验。

### 会遇到什么问题

不同模型对同一个 schema 的理解不一样。`edit` 工具的 `edits` 字段是个数组，实际收到的可能是：

- 一个 JSON **字符串**，内容是数组的序列化结果
- 一个**单独的编辑对象**，而不是只有一个元素的数组
- 旧版本的 `oldText` / `newText` **平铺字段**，压根没有 `edits`

三种都过不了 schema，但它们的意图都是清楚的。直接判错，等于让模型多花一轮去猜"到底哪里不对"。

### Pi 怎么处理

在校验之前插一层纯结构的修正：

```typescript title="packages/coding-agent/src/core/tools/edit.ts:116" {5,7-9,12}
function prepareEditArguments(input: unknown): EditToolInput {
  if (!input || typeof input !== "object") return input as EditToolInput;
  const args = input as Record<string, unknown>;

  // Some models (Opus 4.6, GLM-5.1) send edits as a JSON string instead of an array.
  // Others send a single edit object instead of a one-element edits array.
  if (typeof args.edits === "string") {
    try {
      const parsed = JSON.parse(args.edits);                       // 字符串 → 尝试解析
      if (Array.isArray(parsed)) args.edits = parsed;
      else if (isSingleEditInput(parsed)) args.edits = [parsed];   // 单对象 → 包成数组
    } catch {}
  } else if (isSingleEditInput(args.edits)) {
    args.edits = [args.edits];
  }
  // …下面还处理 legacy 的 oldText / newText 平铺字段
```

源码注释直接点名了两个模型，这说明这层 shim 是**被具体线上问题倒逼出来的**，不是预设的抽象。

循环层的调用点很克制：

```typescript title="packages/agent/src/agent-loop.ts:586" {2,4}
function prepareToolCallArguments(tool: AgentTool<any>, toolCall: AgentToolCall): AgentToolCall {
  if (!tool.prepareArguments) return toolCall;              // 没定义就原样返回
  const preparedArguments = tool.prepareArguments(toolCall.arguments);
  if (preparedArguments === toolCall.arguments) return toolCall;   // 引用没变也原样返回
  return { ...toolCall, arguments: preparedArguments as Record<string, any> };
}
```

两次提前返回都是为了**不产生无谓的对象拷贝**，同时保证 `toolCall` 在没有 shim 时保持同一个引用。

### 取舍与失败表现

- 换来的是：模型的常见结构性错误不消耗一轮往返
- 代价一：shim 是**每个工具自己写的**，没有通用机制。新工具遇到同类问题要重写一遍
- 代价二：`JSON.parse` 用 `catch {}` 静默吞掉。解析失败就退回原值，最终由 schema 报错——错误信息会指向"类型不对"而不是"你的 JSON 串坏了"
- 代价三：shim 修正的是**结构**，不修正**语义**。模型把两个不相邻的编辑写成重叠区间，这层不会发现

## 三、类型校验：`validateToolArguments`

### 最小实现怎么写

`ajv.validate(schema, args)`，不通过就抛。

### 会遇到什么问题

模型产出的 JSON 有一批稳定出现的类型偏差：

- 数字写成字符串：`{"limit": "10"}`
- 布尔写成字符串：`{"recursive": "true"}`
- 可选字段显式填 `null`，而 schema 里没写 `nullable`
- 整数字段给了浮点

严格校验会把这些全判失败。但它们的意图同样清楚，而且**转换是无歧义的**。

### Pi 怎么处理

四步，顺序固定：

```typescript title="packages/ai/src/utils/validation.ts:317" {2-4,7,11}
export function validateToolArguments(tool: Tool, toolCall: ToolCall): any {
  const args = structuredClone(toolCall.arguments);              // ① 深拷贝，不改原始 tool call
  normalizeOptionalNulls(args, tool.parameters as JsonSchemaObject);  // ② 删掉非必填的 null
  Value.Convert(tool.parameters, args);                         // ③ TypeBox 内建转换

  const validator = getValidator(tool.parameters);
  if (!Object.getOwnPropertySymbols(tool.parameters).includes(TYPEBOX_KIND)) {
    const coerced = coerceWithJsonSchema(args, tool.parameters as JsonSchemaObject);   // ④ 手写强转
    // …把 coerced 的结果合并回 args
  }

  if (validator.Check(args)) return args;                        // 通过：返回**转换后**的参数
  // 不通过：拼一条给模型看的错误信息并抛出
```

逐步说明：

- **① `structuredClone`**：后面三步都在原地改，深拷贝保证 `toolCall.arguments` 保持模型的原始输出。错误信息里回显的就是这份原始值
- **② `normalizeOptionalNulls`**（`packages/ai/src/utils/validation.ts:240`）：只删**非必填**、且**子 schema 明确拒绝 null** 的字段。必填字段的 `null` 会保留下来让校验报错，这是对的——那是真错误
- **③ `Value.Convert`**：TypeBox 自带的转换，处理 schema 是 TypeBox 类型时的常规情况
- **④ `coerceWithJsonSchema`**（`packages/ai/src/utils/validation.ts:194`）：只在 schema **不是** TypeBox 类型时才走（扩展注册的工具可能直接给原始 JSON Schema）。它手写了 `"10" → 10`、`"true" → true`、`null → 0/""/false` 这些转换规则

校验器用 `WeakMap` 缓存，key 是 schema 对象本身——同一个工具反复调用不会重复编译。

### 校验失败不是异常，是给模型的一条消息

这是本章最需要记住的一处设计：

```typescript title="packages/ai/src/utils/validation.ts:341" {3,6}
const errors =
  validator.Errors(args)
    .map((error) => `  - ${formatValidationPath(error)}: ${error.message}`)   // 逐字段列出
    .join("\n") || "Unknown validation error";

const errorMessage = `Validation failed for tool "${toolCall.name}":\n${errors}\n\nReceived arguments:\n${JSON.stringify(toolCall.arguments, null, 2)}`;
```

这条信息包含三部分：**哪个工具、哪些字段错在哪、你实际发的是什么**。

它被抛出后，在 `prepareToolCall` 的 `catch` 里被转成一条 `toolResult`：

```typescript title="packages/agent/src/agent-loop.ts:661" {3-4}
} catch (error) {
  return {
    kind: "immediate",
    result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
    isError: true,
  };
}
```

于是模型下一轮就能看到自己错在哪，直接重发。**校验错误被当成可恢复错误处理，而不是流程异常**——这是"每条路径都产出结果"原则的直接体现。

### 取舍与失败表现

- 换来的是：类型偏差不打断流程，模型自己就能修
- 代价一：宽松转换会**掩盖真实错误**。模型本来想传 `offset: 10` 却写成 `"10"`，你在日志里看到的是成功执行，不会意识到模型对 schema 的理解有问题
- 代价二：错误信息里回显了完整的原始参数。`write` 工具的 `content` 可能是几千行，这条错误结果会**原样进上下文**，一次失败就吃掉大量 token
- 代价三：`coerceWithJsonSchema` 那套规则是手写的，覆盖的是当前观察到的偏差。没覆盖到的形式仍然会判错

## 四、副作用前唯一的阻断点：`beforeToolCall`

### 位置

它在校验**之后**、执行**之前**：

```typescript title="packages/agent/src/agent-loop.ts:618" {1,3,10-12}
const validatedArgs = validateToolArguments(tool, preparedToolCall);   // 先校验
if (config.beforeToolCall) {
  const beforeResult = await config.beforeToolCall(
    { assistantMessage, toolCall, args: validatedArgs, context: currentContext },
    signal,
  );
  if (signal?.aborted) { /* …产出 aborted 结果… */ }
  if (beforeResult?.block) {
    const result = createErrorToolResult(beforeResult.reason || "Tool execution was blocked");
    if (beforeResult.terminate === true) result.terminate = true;   // 可选：让整批终止
    return { kind: "immediate", result, isError: true };
  }
}
```

顺序是刻意的：

- **校验在前**，所以钩子拿到的 `args` 是**已转换、已校验**的值。写权限判断时不用自己处理 `"10"` 和 `10` 的差别
- **执行在后**，所以 `block` 能真正阻止副作用，而不是事后补偿

### 三条容易踩的性质

- **它是同步串行的，即使在并行模式下。** 并行调度的预检循环是顺序跑的（[04.2 §二](./execution)），所以五个工具调用的权限确认会一个一个弹出来，不会同时弹五个框
- **它前后各查一次 `signal`。** 因为钩子本身可能等用户输入，等待期间用户可能按了 Esc
- **被 block 的结果也是一条正常的 `toolResult`。** 模型会看到 `reason` 文本，所以 `reason` 应该写成给模型看的话（"这个目录受保护，请改用 xxx"），而不是给人看的日志

`coding-agent` 把这个钩子接到了扩展的 `tool_call` 事件上，扩展侧的语义、fail-safe 行为和能力边界在[第 09 章](../09-extension-system)。

## 五、为什么 `execute` 的契约是"失败就抛"

`AgentTool.execute` 的 JSDoc 写着：

> Throw on failure instead of encoding errors in `content`.

反过来的做法——让工具返回 `{ ok: false, error }`——在这里行不通，原因有三条：

- **工具是第三方写的。** 扩展工具可能是任意 JS，它一定会抛（下标越界、`fetch` 失败）。既然异常路径无论如何都要处理，就没必要再维护第二套错误表达
- **调用方需要统一的 `isError` 标记。** 无论是抛出、被 block 还是校验失败，最终都要标成 `isError: true` 让界面能区分显示。集中在 `catch` 里打这个标记，比要求每个工具自己维护更可靠
- **抛出的信息可以直接给模型。** `error.message` 本身就是一句自然语言，正好是模型能读懂的格式

代价是工具作者容易误以为"抛异常会让整个 agent 崩掉"，从而在自己内部 catch 掉一切、返回一段看起来正常的文本。这种写法会让 `isError` 永远是 `false`，界面无法把失败标红，模型也更容易忽略失败。

## 六、排查：模型一直在同一个工具上失败

按下面的顺序缩小范围：

- **看 `toolResult` 的文本以 `Validation failed for tool` 开头吗**
  - 是 → 停在了第 ③ 步。文本里已经列出了具体字段，对照工具的 `parameters` 看是 schema 描述不清楚，还是模型确实不会用
  - 常见修法是改 `description` 或加一条 `guidelines`，让模型在犯错之前就知道规则
- **文本是 `Tool xxx not found` 吗**
  - 是 → 停在了第 ① 步。检查工具是否被 `setActiveToolsByName` 排除、或者是不是动态工具还没被激活（[04.2 §四](./execution)）
- **文本是你自己写的 `reason` 吗**
  - 是 → 停在了第 ④ 步，扩展拦下来了。检查 `reason` 是不是写成了给人看的日志，模型可能读不懂该怎么改
- **以上都不是，是工具自己的报错**
  - 那是执行阶段的问题，转 [04.3](./builtins) 看具体工具的错误消息设计

## 七、小结

- `prepareToolCall` 做四件事：查找、结构 shim、schema 校验、阻断钩子；任何一步失败都产出结果而不是抛出
- `prepareArguments` 是被具体模型的具体错法倒逼出来的结构层 shim，每个工具自己写
- schema 校验有四步，核心是**宽松转换 + 深拷贝保留原始值**
- 校验失败的信息包含"哪个工具 / 哪些字段 / 你发了什么"，被当成可恢复错误回填给模型
- `beforeToolCall` 在校验之后执行之前，即使并行模式也是串行调用
- `execute` 的契约是"失败就抛"，因为异常路径无论如何都要处理，维护第二套错误表达没有收益

:::details 本页源码索引

| 符号 | 位置 |
|---|---|
| `AgentTool` | `packages/agent/src/types.ts:386` |
| `AgentToolResult` | `packages/agent/src/types.ts:361` |
| `prepareToolCallArguments` | `packages/agent/src/agent-loop.ts:586` |
| `prepareToolCall` | `packages/agent/src/agent-loop.ts:600` |
| `beforeToolCall` 调用点 | `packages/agent/src/agent-loop.ts:619` |
| 校验失败转结果 | `packages/agent/src/agent-loop.ts:661` |
| `createErrorToolResult` | `packages/agent/src/agent-loop.ts:760` |
| `validateToolArguments` | `packages/ai/src/utils/validation.ts:317` |
| 校验错误信息拼装 | `packages/ai/src/utils/validation.ts:341` |
| `normalizeOptionalNulls` | `packages/ai/src/utils/validation.ts:240` |
| `coerceWithJsonSchema` | `packages/ai/src/utils/validation.ts:194` |
| `prepareEditArguments` | `packages/coding-agent/src/core/tools/edit.ts:116` |
| `editToolSystemPromptContribution` | `packages/coding-agent/src/core/tools/edit.ts:56` |

:::

## 下一步

→ [04.2 结果怎么回去](./execution) — 执行阶段的异常与中止、并行调度为什么不会写坏文件、以及事件顺序那条隐式契约。
