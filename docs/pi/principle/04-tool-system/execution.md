---
title: 04.2 结果怎么回去
description: 执行阶段的异常与中止、并行调度为什么不会写坏文件、事件顺序的隐式契约
---

# 04.2 结果怎么回去

[← 回到 04 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

[上一页](./contract)结束在 `kind: "prepared"`。参数已经掰正、校验通过、没被扩展拦下。这一页讲剩下两段：执行，以及把结果送回上下文。

## 一、执行：把异常变成结果

### 最小实现怎么写

```typescript title="教学示例，非 Pi 源码"
const result = await tool.execute(call.arguments);
```

### 会遇到什么问题

三件事：

- 工具会抛。第三方扩展工具尤其会抛，而异常一旦冒出去就会打断整批调用
- 工具会跑很久。`bash npm test` 期间界面需要显示进度，用户需要能中止
- 工具在流式回调里可能"越界"。它在自己 resolve 之后还继续调 `onUpdate`，就会往已经结束的调用上发事件

### Pi 怎么处理

```typescript title="packages/agent/src/agent-loop.ts:670" {2-3,9,13,20-21,24}
async function executePreparedToolCall(prepared, signal, emit) {
  const updateEvents: Promise<void>[] = [];
  let acceptingUpdates = true;                       // 越界保护开关

  try {
    const result = await prepared.tool.execute(
      prepared.toolCall.id,
      prepared.args as never,
      signal,                                        // 中止交给工具自己响应
      (partialResult) => {
        if (!acceptingUpdates) return;               // resolve 之后的调用直接丢弃
        updateEvents.push(Promise.resolve(emit({
          type: "tool_execution_update", /* … */ partialResult,
        })));
      },
    );
    acceptingUpdates = false;
    await Promise.all(updateEvents);                 // 等所有进度事件发完再返回
    return { result, isError: false };
  } catch (error) {
    acceptingUpdates = false;
    await Promise.all(updateEvents);
    return {                                         // 异常变成结果，不往外抛
      result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
      isError: true,
    };
  } finally {
    acceptingUpdates = false;
  }
}
```

三处细节值得注意：

- **`acceptingUpdates` 在 try / catch / finally 里各关一次。** 类型定义里写明了这个语义："Calls made after the tool promise settles are ignored"。工具作者在 `execute` 里挂了个定时器忘记清，也不会污染后续调用
- **`updateEvents` 被收集后统一 `await`。** `emit` 是异步的，如果不等，进度事件可能在 `tool_execution_end` 之后才到达订阅者，界面会看到"结束之后又更新了一次"
- **`catch` 不重新抛出。** 异常在这里就地转成 `AgentToolResult`，循环层继续往下走

### 取舍与失败表现

- 换来的是：单个工具失败不影响同批其他工具，也不影响循环继续
- 代价一：**工具自己 catch 掉一切**的写法会绕过这里，`isError` 永远是 `false`，界面无法标红
- 代价二：`signal` 只是传下去，**工具不响应就等于没有中止**（[第 03 章](../03-agent-loop/termination)）

## 二、调度：默认并行，但并行得很小心

### 最小实现怎么写

`for` 循环串行，或者 `Promise.all` 全并行。

### 会遇到什么问题

- 全串行：模型一次发了五个 `read`，串行跑就是五倍延迟
- 全并行：模型对同一个文件发了两个 `edit`，两个都读到旧内容、各自写回，后写的覆盖先写的
- 全并行还有第二个问题：权限确认框会同时弹五个

### Pi 怎么处理

分三层，逐层收窄。

**第一层：模式决策**

```typescript title="packages/agent/src/agent-loop.ts:411" {3-4,6}
async function executeToolCalls(currentContext, assistantMessage, config, signal, emit) {
  const toolCalls = assistantMessage.content.filter((c) => c.type === "toolCall");
  const hasSequentialToolCall = toolCalls.some(
    (tc) => currentContext.tools?.find((t) => t.name === tc.name)?.executionMode === "sequential",
  );
  if (config.toolExecution === "sequential" || hasSequentialToolCall) {
    return executeToolCallsSequential(/* … */);
  }
  return executeToolCallsParallel(/* … */);
}
```

- 全局默认是 `toolExecution` 为 `"parallel"`（`packages/agent/src/agent.ts:237`）
- **任何一个工具声明了 `executionMode: "sequential"`，整批都转串行**。粒度是批次级不是工具级，因为一个必须独占的工具没法跟别人并发

**第二层：并行模式里的预检串行**

```typescript title="packages/agent/src/agent-loop.ts:489" {4,7,15,22}
async function executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit) {
  const finalizedCalls: FinalizedToolCallEntry[] = [];

  for (const toolCall of toolCalls) {                     // 预检：顺序跑
    await emit({ type: "tool_execution_start", /* … */ });
    const preparation = await prepareToolCall(/* … */);   // 含 beforeToolCall
    if (preparation.kind === "immediate") {
      // 校验失败 / 被 block：立刻收尾，不进并发批次
      await emitToolExecutionEnd(finalized, emit);
      finalizedCalls.push(finalized);
      if (signal?.aborted) break;
      continue;
    }
    finalizedCalls.push(async () => {                     // 真正的执行包成闭包，先不跑
      const executed = await executePreparedToolCall(preparation, signal, emit);
      const finalized = await finalizeExecutedToolCall(/* … */);
      await emitToolExecutionEnd(finalized, emit);
      return finalized;
    });
    if (signal?.aborted) break;
  }

  const orderedFinalizedCalls = await Promise.all(        // 到这里才真正并发
    finalizedCalls.map((entry) => (typeof entry === "function" ? entry() : Promise.resolve(entry))),
  );
```

这是本节最关键的一处：**"并行"只并行了 `execute`，准备阶段仍然是串行的**。

- 权限确认框一个一个弹，不会同时弹五个
- 被 block 的调用不进并发批次，不浪费资源
- `signal?.aborted` 的检查放在预检循环里，abort 之后剩下的调用根本不会被启动

**第三层：按文件互斥**

预检串行解决不了"两个 `edit` 改同一个文件"。这一层由工具自己负责：

```typescript title="packages/coding-agent/src/core/tools/file-mutation-queue.ts:32" {5-6,13}
export async function withFileMutationQueue<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const registration = registrationQueue.then(async () => {
    const key = await getMutationQueueKey(filePath);              // realpath 归一化
    const currentQueue = fileMutationQueues.get(key) ?? Promise.resolve();
    // …把自己挂到该文件队列的尾部…
  });
  const { key, currentQueue, chainedQueue, releaseNext } = await registration;
  await currentQueue;                                             // 等前一个操作做完
  try {
    return await fn();
  } finally {
    releaseNext();
    if (fileMutationQueues.get(key) === chainedQueue) fileMutationQueues.delete(key);
  }
}
```

`edit` 和 `write` 各自用 `withFileMutationQueue` 包住了自己的读改写（`packages/coding-agent/src/core/tools/edit.ts:336`、`packages/coding-agent/src/core/tools/write.ts:210`）。

- **粒度是单个文件**，不同文件仍然并行
- **key 用 `realpath` 归一化**，所以软链接指向同一个文件时也会互斥
- 文件不存在时（`ENOENT` / `ENOTDIR`）退回用绝对路径当 key，覆盖"两个 `write` 同时创建同一个新文件"

### 取舍与失败表现

- 换来的是：读操作充分并行，写操作按文件安全串行，权限确认不会打架
- 代价一：`executionMode: "sequential"` 的**粒度是批次级**。一个扩展工具声明了它，整批都会退化成串行，包括本可以并行的 `read`
- 代价二：互斥是**工具自己实现的**，不是框架保证的。第三方扩展工具写同一个文件时不会自动获得这个保护
- 代价三：`bash` **不参与**文件互斥。模型一边 `edit src/api.ts` 一边 `bash "echo x > src/api.ts"`，这两个不会互相等待

## 三、收尾：`afterToolCall` 与结果回填

```typescript title="packages/agent/src/agent-loop.ts:713" {5,15-21,25-27}
async function finalizeExecutedToolCall(currentContext, assistantMessage, prepared, executed, config, signal) {
  let result = executed.result;
  let isError = executed.isError;

  if (config.afterToolCall) {
    try {
      const afterResult = await config.afterToolCall(
        { assistantMessage, toolCall: prepared.toolCall, args: prepared.args, result, isError, context: currentContext },
        signal,
      );
      if (afterResult) {
        result = {
          ...result,
          content: afterResult.content ?? result.content,        // 逐字段覆盖，没给就保留
          details: afterResult.details ?? result.details,
          usage: afterResult.usage ?? result.usage,
          terminate: afterResult.terminate ?? result.terminate,
        };
        isError = afterResult.isError ?? isError;
      }
    } catch (error) {
      result = createErrorToolResult(error instanceof Error ? error.message : String(error));
      isError = true;                                            // 扩展自己抛，也变成结果
    }
  }
  return { toolCall: prepared.toolCall, result, isError };
}
```

两处设计：

- **逐字段覆盖，不深合并。** JSDoc 写明 "No deep merge is performed"。多个扩展各改各的字段互不干扰，但一个扩展想改 `content` 里的某一项就必须整个数组替换
- **扩展抛异常时，结果被整个替换成错误结果。** 这跟 `beforeToolCall` 抛异常的处理不同——那边是往外抛（阻断执行），这边是转成结果（执行已经发生了，不能假装没发生）

`coding-agent` 在这个钩子上接了扩展的 `tool_result` 事件，并在扩展之后再跑一次图片归一化，让扩展注入的图片也走同一套尺寸处理。

最后产出消息：

```typescript title="packages/agent/src/agent-loop.ts:777" {5-6,8}
function createToolResultMessage(finalized: FinalizedToolCallOutcome): ToolResultMessage {
  return {
    role: "toolResult",
    toolCallId: finalized.toolCall.id,
    // Untyped tools (JS extensions) can return results without content; normalize
    content: finalized.result.content ?? [],          // 防御 null，避免脏数据进会话
    details: finalized.result.details,
    ...(finalized.result.addedToolNames?.length ? { addedToolNames: finalized.result.addedToolNames } : {}),
    isError: finalized.isError,
    timestamp: Date.now(),
  };
}
```

`content ?? []` 这行注释解释了原因：JS 写的扩展工具可能返回没有 `content` 的结果，这个 `null` 一旦进了会话历史或 provider payload 就会引发下游报错。

## 四、事件顺序：一条隐式契约

并行模式下事件的发出顺序是这样的：

```text
  预检阶段（串行）
    tool_execution_start (call A)
    tool_execution_start (call B)
    tool_execution_start (call C)

  并发阶段
    tool_execution_end (谁先跑完谁先发)      ← 完成顺序
      例如 B → A → C

  Promise.all 之后（串行）
    message_start/message_end (toolResult A)  ← 模型给出的顺序
    message_start/message_end (toolResult B)
    message_start/message_end (toolResult C)
```

两种顺序不一致，是有意的：

- **`tool_execution_end` 按完成顺序**，界面才能一跑完就更新那一条，而不是等最慢的
- **`toolResult` 消息按模型给出的顺序**，上下文里的顺序才和 assistant 消息里的 tool call 顺序对齐，provider 才不会拒绝

代价是这条契约**只写在 `toolExecution` 字段的 JSDoc 里**（`packages/agent/src/types.ts:268`），类型系统表达不了。订阅者如果假设"`tool_execution_end` 的顺序就是结果消息的顺序"，在并行模式下会错乱，在串行模式下又碰巧是对的——这类 bug 只在并行时复现。

## 五、动态工具：结果可以带来新工具

工具集不一定是固定的。一个工具执行完之后可以宣布"从现在起还有这些工具可用"：

```typescript title="packages/coding-agent/src/core/extensions/wrapper.ts:17" {3,5-6,9}
export function wrapRegisteredTool(registeredTool: RegisteredTool, runner: ExtensionRunner): AgentTool {
  // …
    execute: async (toolCallId, params, signal, onUpdate) => {
      const activeBefore = runner.getActiveTools();
      const result = await execute(toolCallId, params, signal, onUpdate);
      const activeAfter = runner.getActiveTools();                 // 执行前后对比
      if (!activeBefore.every((name) => activeAfter.includes(name))) return result;
      const addedToolNames = activeAfter.filter((name) => !beforeNames.has(name));
      return { ...result, addedToolNames: [...] };                 // 记在结果上
    },
```

`addedToolNames` 会被写进 `toolResult` 消息，然后在装配请求时被 `ai` 包用来做**延迟披露**：

```typescript title="packages/ai/src/utils/deferred-tools.ts:8" {8-10,13}
export function splitDeferredTools(context, enabled, normalizeName = identityToolName) {
  // …
  const deferredNames = new Set<string>();
  const usedNames = new Set<string>();
  for (const message of context.messages) {
    if (message.role === "assistant") {
      for (const block of message.content) {
        if (block.type === "toolCall") usedNames.add(normalizeName(block.name));   // 用过的
      }
    } else if (message.role === "toolResult") {
      for (const name of message.addedToolNames ?? []) {
        if (!usedNames.has(normalizedName)) deferredNames.add(normalizedName);     // 引入但没用过的
      }
    }
  }
  // deferred 里的工具不进本次请求的 tool 列表
```

规则很简单：**一个工具如果是被某条 tool result 引入的，且到目前为止还没被调用过，就不进本次请求的工具列表**。

- 省的是 prompt token。一百个工具的 schema 可能有几万 token，每轮都发是纯浪费
- 模型仍然知道它们存在——因为引入它们的那条 tool result 文本还在上下文里
- 一旦模型真的调用了其中一个，它就转入"用过"集合，之后每轮都会带上

## 六、排查：并行相关的三个现象

- **界面上工具结果的顺序和执行完成的顺序对不上**
  - 这是设计行为，见 §四。界面应该用 `toolCallId` 关联，而不是依赖事件到达顺序
- **两个 `edit` 改同一个文件，后一个报"找不到 oldText"**
  - 说明互斥生效了：第二个 `edit` 读到的是第一个改完之后的内容。这是正确行为，模型应该基于新内容重新给 `oldText`
  - 如果**没有**报错而是内容被覆盖，检查改文件的是不是 `bash` —— 它不参与文件互斥
- **本该并行的 `read` 变成了一个一个跑**
  - 检查同批里有没有工具声明了 `executionMode: "sequential"`，或者全局 `toolExecution` 被设成了 `"sequential"`
  - 也可能是 `beforeToolCall` 里有慢操作：预检是串行的，一个确认框会挡住后面所有调用的启动

## 七、验证矩阵

自己实现类似调度时值得覆盖的用例：

| # | 用例 | 期望 |
|---|---|---|
| 1 | 工具抛异常 | 转成 `isError: true` 的结果，同批其他工具照常完成 |
| 2 | 工具 resolve 之后继续调 `onUpdate` | 更新被丢弃，不产生额外事件 |
| 3 | 一批三个 `read` | 并发执行，`tool_execution_start` 按模型顺序 |
| 4 | 一批两个 `edit` 改同一文件 | 串行执行，第二个看到第一个的结果 |
| 5 | 一批两个 `edit` 改不同文件 | 并发执行 |
| 6 | 同批含一个 `sequential` 工具 | 整批退化为串行 |
| 7 | 预检期间 abort | 后续调用不启动，已启动的仍会 await |
| 8 | `afterToolCall` 只返回 `content` | `details` / `usage` 保持原值 |
| 9 | `afterToolCall` 抛异常 | 结果被替换成错误结果，`isError` 为 true |
| 10 | 工具返回 `addedToolNames` 且未被调用 | 下一轮请求的工具列表里不包含它 |

## 八、小结

- 执行阶段做三件事：把异常转成结果、把 `signal` 交给工具、收集并等待流式进度事件
- `acceptingUpdates` 保证工具 resolve 之后的越界回调被丢弃
- 调度分三层：批次级模式决策 → 并行模式下预检仍然串行 → `edit`/`write` 按文件互斥
- "并行"只并行 `execute`，`beforeToolCall` 始终是串行的，所以确认框不会打架
- `afterToolCall` 逐字段覆盖不深合并；它抛异常时结果被替换（因为副作用已经发生了）
- `tool_execution_end` 按完成顺序、结果消息按模型顺序——这条契约只在 JSDoc 里
- 动态工具靠 `addedToolNames` + `splitDeferredTools` 做延迟披露，省的是每轮的 schema token

:::details 本页源码索引

| 符号 | 位置 |
|---|---|
| `executeToolCalls` | `packages/agent/src/agent-loop.ts:411` |
| `executeToolCallsSequential` | `packages/agent/src/agent-loop.ts:433` |
| `executeToolCallsParallel` | `packages/agent/src/agent-loop.ts:489` |
| 并发批次 `Promise.all` | `packages/agent/src/agent-loop.ts:540` |
| `executePreparedToolCall` | `packages/agent/src/agent-loop.ts:670` |
| `finalizeExecutedToolCall` | `packages/agent/src/agent-loop.ts:713` |
| `emitToolExecutionEnd` | `packages/agent/src/agent-loop.ts:767` |
| `createToolResultMessage` | `packages/agent/src/agent-loop.ts:777` |
| `toolExecution` 字段与事件顺序契约 | `packages/agent/src/types.ts:268` |
| `toolExecution` 默认值 | `packages/agent/src/agent.ts:237` |
| `withFileMutationQueue` | `packages/coding-agent/src/core/tools/file-mutation-queue.ts:32` |
| `edit` 里的互斥调用 | `packages/coding-agent/src/core/tools/edit.ts:336` |
| `write` 里的互斥调用 | `packages/coding-agent/src/core/tools/write.ts:210` |
| `wrapRegisteredTool` | `packages/coding-agent/src/core/extensions/wrapper.ts:17` |
| `splitDeferredTools` | `packages/ai/src/utils/deferred-tools.ts:8` |

:::

## 下一步

→ [04.3 内置工具的容错与截断](./builtins) — 八个工具各自怎么处理模型的不精确，以及输出太长时给模型留了什么线索。
