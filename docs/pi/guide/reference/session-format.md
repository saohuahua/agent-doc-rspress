---
title: 会话文件格式
description: 会话 JSONL 的条目类型、树结构、上下文重建规则与 SessionManager API
---

# 会话文件格式

会话以 **JSONL** 存储：每行一个 JSON 对象，带 `type` 字段。条目通过 `id` / `parentId` 组成**树**，因此可以原地分叉而不产生新文件。

这一页是给两类人看的：想**自己解析会话文件**的，和想**写扩展往会话里写东西**的。

## 1. 文件位置

```text
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

`<path>` 是工作目录，`/` 被替换成 `-`。

删除会话就是删掉对应的 `.jsonl`。交互模式下可以在 `/resume` 里选中并 Ctrl+D 删除（需确认）——系统上有 `trash` CLI 时会走回收站而不是永久删除。

## 2. 版本

| 版本 | 内容 |
|---|---|
| v1 | 线性条目序列（遗留格式，加载时自动迁移） |
| v2 | 树结构，`id` / `parentId` 关联 |
| v3 | 把 `hookMessage` 角色改名为 `custom`（扩展体系统一） |

旧会话加载时自动迁移到当前版本（v3）。

## 3. 消息类型

会话条目里装的是 `AgentMessage`。要解析会话，先认识这些类型。

### 内容块

```typescript title="Content Blocks"
interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image";
  data: string;      // base64
  mimeType: string;  // "image/jpeg" | "image/png" ...
}

interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

### 基础消息类型（来自 pi-ai）

```typescript title="packages/ai/src/types.ts"
interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;  // Unix ms
}

interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: "stop" | "length" | "toolUse" | "error" | "aborted";
  errorMessage?: string;
  timestamp: number;
}

interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: any;      // 工具专属元数据
  usage?: Usage;      // 工具内部嵌套的 LLM 工作
  isError: boolean;
  timestamp: number;
}
```

`Usage` 同时带 token 数和成本：

```typescript
interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
}
```

:::warning `stopReason: "pending"` 不该出现在文件里

pi-ai 导出的 `StopReason` 类型里有 `"pending"`，但它只用于**流式事件中的半成品消息**。终态的 `done`/`error` 消息会在持久化前把它替换成真正的结束原因。

如果你在 JSONL 里读到 `"pending"`，那是个 bug 信号。

:::

### 扩展消息类型（来自 pi-coding-agent）

```typescript title="packages/coding-agent/src/core/messages.ts"
interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;  // !! 前缀命令为 true
  timestamp: number;
}

interface CustomMessage {
  role: "custom";
  customType: string;            // 扩展标识
  content: string | (TextContent | ImageContent)[];
  display: boolean;              // 是否在 TUI 显示
  details?: any;
  timestamp: number;
}

interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
  timestamp: number;
}

interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

联合类型：

```typescript
type AgentMessage =
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

## 4. 条目类型

除 `SessionHeader` 外，所有条目都继承：

```typescript
interface SessionEntryBase {
  type: string;
  id: string;               // 8 位十六进制
  parentId: string | null;  // 首条为 null
  timestamp: string;        // ISO 时间戳
}
```

条目类型一览：

| `type` | 作用 | 参与 LLM 上下文 |
|---|---|---|
| `session` | 文件头，元数据（无 id/parentId，不在树里） | — |
| `message` | 一条对话消息 | ✅ |
| `model_change` | 会话中途切换模型 | 影响设置 |
| `thinking_level_change` | 切换推理级别 | 影响设置 |
| `compaction` | 压缩摘要 | ✅ |
| `branch_summary` | 分支摘要 | ✅ |
| `custom` | **扩展状态持久化** | ❌ |
| `custom_message` | 扩展注入的消息 | ✅ |
| `label` | 用户书签/标记 | ❌ |
| `session_info` | 会话显示名 | ❌ |

### SessionHeader

文件第一行：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project"}
```

由 `/fork`、`/clone` 或 `newSession({ parentSession })` 创建的会话会多一个 `parentSession` 字段指向原文件。

### SessionMessageEntry

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"...","message":{"role":"user","content":"Hello"}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"...","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"provider":"anthropic","model":"claude-sonnet-4-5","usage":{},"stopReason":"stop"}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"...","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false}}
```

### CompactionEntry

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"...","summary":"User discussed X, Y, Z...","firstKeptEntryId":"c3d4e5f6","tokensBefore":50000}
```

新版（harness 生成的）压缩条目**把压缩后保留的上下文直接内嵌**，而不是用 `firstKeptEntryId` 指过去：

```json {2}
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"...","summary":"...","tokensBefore":50000,
 "retainedTail":[{"role":"user","content":"latest request"},{"role":"assistant","content":[{"type":"text","text":"latest reply"}],"provider":"anthropic","model":"claude-sonnet-4-5","usage":{},"stopReason":"stop"}]}
```

| 可选字段 | 含义 |
|---|---|
| `usage` | 生成摘要消耗的 LLM 用量，计入会话总量 |
| `retainedTail` | 压缩后保留的 `AgentMessage[]`，让压缩条目成为**自包含 checkpoint** |
| `details` | 实现相关数据，默认是 `{ readFiles, modifiedFiles }` |
| `fromHook` | 由扩展生成时为 `true`（字段名是历史遗留） |
| `firstKeptEntryId` | 兼容旧格式 |

:::tip `retainedTail` 是个值得注意的设计

有了它，重建上下文时**不需要再往压缩条目之前的历史里走**——压缩点变成一个自包含的检查点。

它之所以是"可选"，纯粹是为了让只存了 `firstKeptEntryId` 的老会话仍能加载。

:::

### BranchSummaryEntry

```json
{"type":"branch_summary","id":"g7h8i9j0","parentId":"a1b2c3d4","timestamp":"...","fromId":"f6g7h8i9","summary":"Branch explored approach A..."}
```

### CustomEntry vs CustomMessageEntry

这两个最容易混：

```json title="custom：扩展状态，不进 LLM 上下文"
{"type":"custom","id":"h8i9j0k1","parentId":"g7h8i9j0","timestamp":"...","customType":"my-extension","data":{"count":42}}
```

```json title="custom_message：扩展注入的消息，进 LLM 上下文"
{"type":"custom_message","id":"i9j0k1l2","parentId":"h8i9j0k1","timestamp":"...","customType":"my-extension","content":"Injected context...","display":true}
```

| | `custom` | `custom_message` |
|---|---|---|
| 进 LLM 上下文 | ❌ | ✅ |
| 典型用途 | 扩展重载后恢复自己的状态 | 往对话里塞额外上下文 |
| 关键字段 | `data` | `content`、`display`、`details` |

`custom` 条目可以用 `pi.registerEntryRenderer(customType, renderer)` 在交互模式里渲染，但**渲染不等于进上下文**，它仍然不参与 LLM 上下文。

### LabelEntry / SessionInfoEntry

```json
{"type":"label","id":"j0k1l2m3","parentId":"i9j0k1l2","timestamp":"...","targetId":"a1b2c3d4","label":"checkpoint-1"}
{"type":"session_info","id":"k1l2m3n4","parentId":"j0k1l2m3","timestamp":"...","name":"Refactor auth module"}
```

`label` 设为 `undefined` 表示清除标签。`session_info` 由 `/name`、`--name` 或扩展的 `pi.setSessionName()` 写入，设置后在 `/resume` 里代替首条消息显示。

## 5. 树结构

```text
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← 当前叶子
                                                           │
                                                           └─ [branch_summary] ─── [user msg] ← 另一条分支
```

规则很简单：首条 `parentId: null`，每条指向父节点，分叉就是从旧条目长出新子节点，**叶子 = 当前位置**。

## 6. 上下文是怎么重建的

这是解析会话时最容易写错的部分。两个函数分工：

### `buildContextEntries()`

从当前叶子走到根，产出"活动条目列表"，同时处理压缩：

1. 收集路径上的所有条目
2. 如果路径上有 `CompactionEntry`：
   - 先放入压缩条目本身
   - 有 `retainedTail` → 它就是自包含检查点，直接接上压缩之后的条目
   - 没有 → 放入从 `firstKeptEntryId` 到压缩条目之间的条目，再接上压缩之后的条目
3. 保留选中区间里的非消息条目，供交互模式渲染

### `buildSessionContext()`

在上面的条目列表之上，产出给 LLM 的消息列表：

1. 从**完整路径**中提取当前模型和推理级别设置
2. 按类型转换条目：

| 条目类型 | 转成什么 |
|---|---|
| `message` | 存储的 `AgentMessage` |
| `compaction` | `compactionSummary` + 有的话再加 `retainedTail` |
| `branch_summary` | `branchSummary` |
| `custom_message` | `CustomMessage` |
| `custom` | **不产生任何上下文消息** |

:::warning 自己写解析器时的三个坑

1. 别忘了压缩：直接把路径上所有 `message` 拼起来，会得到一个远超实际发送内容的列表。
2. 模型/推理级别要从**完整路径**取，不是从压缩后的区间取。
3. `custom` 和 `custom_message` 必须区别对待。

:::

## 7. 解析示例

```typescript title="最小解析器"
import { readFileSync } from "fs";

const lines = readFileSync("session.jsonl", "utf8").trim().split("\n");

for (const line of lines) {
  const entry = JSON.parse(line);

  switch (entry.type) {
    case "session":
      console.log(`Session v${entry.version ?? 1}: ${entry.id}`);
      break;
    case "message":
      console.log(`[${entry.id}] ${entry.message.role}: ${JSON.stringify(entry.message.content)}`);
      break;
    case "compaction":
      console.log(`[${entry.id}] Compaction: ${entry.tokensBefore} tokens summarized`);
      break;
    case "branch_summary":
      console.log(`[${entry.id}] Branch from ${entry.fromId}`);
      break;
    case "custom":
      console.log(`[${entry.id}] Custom (${entry.customType}): ${JSON.stringify(entry.data)}`);
      break;
    case "custom_message":
      console.log(`[${entry.id}] Extension message (${entry.customType}): ${entry.content}`);
      break;
    case "label":
      console.log(`[${entry.id}] Label "${entry.label}" on ${entry.targetId}`);
      break;
    case "model_change":
      console.log(`[${entry.id}] Model: ${entry.provider}/${entry.modelId}`);
      break;
    case "thinking_level_change":
      console.log(`[${entry.id}] Thinking: ${entry.thinkingLevel}`);
      break;
  }
}
```

## 8. SessionManager API

### 静态方法：创建

| 方法 | 作用 |
|---|---|
| `SessionManager.create(cwd, sessionDir?)` | 新建会话 |
| `SessionManager.open(path, sessionDir?)` | 打开已有会话文件 |
| `SessionManager.continueRecent(cwd, sessionDir?)` | 继续最近一次，没有就新建 |
| `SessionManager.inMemory(cwd?)` | 不落盘 |
| `SessionManager.forkFrom(sourcePath, targetCwd, sessionDir?)` | 从另一个项目 fork |

### 静态方法：列举

| 方法 | 作用 |
|---|---|
| `SessionManager.list(cwd, sessionDir?, onProgress?)` | 列出某目录的会话 |
| `SessionManager.listAll(onProgress?)` | 列出所有项目的会话 |

### 实例方法：会话管理

| 方法 | 作用 |
|---|---|
| `newSession(options?)` | 开新会话，`{ parentSession?: string }` |
| `setSessionFile(path)` | 切换到另一个会话文件 |
| `createBranchedSession(leafId)` | 把某分支抽成新会话文件 |

### 实例方法：追加（都返回条目 ID）

| 方法 | 作用 |
|---|---|
| `appendMessage(message)` | 追加消息 |
| `appendThinkingLevelChange(level)` | 记录推理级别变更 |
| `appendModelChange(provider, modelId)` | 记录模型变更 |
| `appendCompaction(summary, firstKeptEntryId, tokensBefore, details?, fromHook?)` | 追加压缩 |
| `appendCustomEntry(customType, data?)` | 扩展状态（不进上下文） |
| `appendCustomMessageEntry(customType, content, display, details?)` | 扩展消息（进上下文） |
| `appendSessionInfo(name)` | 设置会话显示名 |
| `appendLabelChange(targetId, label)` | 设置/清除标签 |

### 实例方法：树导航

| 方法 | 作用 |
|---|---|
| `getLeafId()` / `getLeafEntry()` | 当前位置 |
| `getEntry(id)` | 按 ID 取条目 |
| `getBranch(fromId?)` | 从某条目走到根 |
| `getTree()` / `getChildren(parentId)` | 完整树 / 直接子节点 |
| `getLabel(id)` | 取标签 |
| `branch(entryId)` | 把叶子移到更早的条目 |
| `resetLeaf()` | 叶子重置为 null |
| `branchWithSummary(entryId, summary, details?, fromHook?)` | 带摘要地分叉 |

### 实例方法：上下文与信息

| 方法 | 作用 |
|---|---|
| `buildContextEntries()` | 应用压缩后的活动分支条目 |
| `buildSessionContext()` | 给 LLM 的消息 + thinkingLevel + model |
| `getEntries()` / `getHeader()` | 全部条目（不含头） / 头元数据 |
| `getSessionName()` | 最新 `session_info` 里的显示名 |
| `getCwd()` / `getSessionDir()` / `getSessionId()` / `getSessionFile()` | 路径与 ID |
| `isPersisted()` | 是否落盘 |

## 9. 相关源码

| 内容 | 文件 |
|---|---|
| 条目类型与 SessionManager | `packages/coding-agent/src/core/session-manager.ts` |
| 扩展消息类型 | `packages/coding-agent/src/core/messages.ts` |
| 基础消息类型 | `packages/ai/src/types.ts` |
| `AgentMessage` 联合类型 | `packages/agent/src/types.ts` |

项目里要看 TypeScript 定义，直接翻 `node_modules/@earendil-works/pi-coding-agent/dist/` 和 `node_modules/@earendil-works/pi-ai/dist/`。

## 10. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 结构 | JSONL + `id`/`parentId` 树，append-only |
| 当前版本 | v3，旧版本加载时自动迁移 |
| 两个 custom | `custom` 不进上下文，`custom_message` 进 |
| 压缩 | 新版内嵌 `retainedTail`，成为自包含 checkpoint |
| 重建上下文 | `buildContextEntries()` 处理压缩，`buildSessionContext()` 产出消息 |

## 下一步

→ [SDK](../programmatic/sdk) — 在自己的 Node 程序里创建 AgentSession
