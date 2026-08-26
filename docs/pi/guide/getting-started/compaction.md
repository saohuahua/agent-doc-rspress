---
title: 上下文压缩
description: 自动压缩与分支摘要的触发条件、切点规则、摘要格式与扩展钩子
---

# 上下文压缩

LLM 的上下文窗口有限。对话变长后，Pi 用**压缩（Compaction）**把早期内容总结掉、保留最近的工作。

这一篇解决三个问题：什么时候会触发、被总结掉的到底是哪一段、我能不能自己接管这个过程。

## 1. 两套机制

| 机制 | 触发时机 | 目的 |
|---|---|---|
| **压缩** Compaction | 上下文超过阈值，或手动 `/compact` | 总结旧消息腾出上下文 |
| **分支摘要** Branch summarization | `/tree` 切换分支时 | 切分支时保留被放弃分支的上下文 |

两者用**同一套结构化摘要格式**，并且都会**累积追踪文件操作**。

:::info 一个容易忽略的细节

压缩和分支摘要的请求使用**全新的路由会话 ID**，并且在 Provider 支持的情况下**关闭 prompt-cache 写入**——因为这种一次性 prompt 几乎不可能被复用，写缓存只会浪费钱。

:::

## 2. 什么时候触发压缩

```
contextTokens > contextWindow - reserveTokens
```

`reserveTokens` 默认 16384，就是给 LLM 回复留的地方。

也可以手动触发：`/compact [instructions]`，可选的指令用来指定摘要的关注点。

比如：`/compact 重点保留 auth 模块的改动决策，测试细节可以略过`。

## 3. 压缩做了什么

分五步：

| 步骤 | 做什么 |
|---|---|
| 1. 找切点 | 从最新消息往回走，累加 token 估算，直到达到 `keepRecentTokens`（默认 20k） |
| 2. 取消息 | 从上次保留边界（或会话起点）到切点之间的消息 |
| 3. 生成摘要 | 调 LLM 按结构化格式总结；有上一次摘要时作为迭代上下文一并传入 |
| 4. 追加条目 | 写入 `CompactionEntry`，含 `summary` 和 `firstKeptEntryId` |
| 5. 重建上下文 | 下次请求用 摘要 + 从 `firstKeptEntryId` 起的消息 |

```
压缩前：

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               要被总结的消息                   保留的消息
                                   ↑
                          firstKeptEntryId（entry 4）

压缩后（追加一条新条目）：

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                 不再发给 LLM                        发给 LLM

LLM 实际看到的：

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    提示词   来自 cmp        从 firstKeptEntryId 起的消息
```

:::warning 压缩是"追加"不是"删除"

`CompactionEntry` 是**新追加**的条目，原始消息仍在 JSONL 文件里。变的是**下次发给 LLM 的内容**，不是历史本身。

这也是为什么会话文件能一直用来复盘。

:::

### 多次压缩

第二次压缩时，被总结的区间**从上一次压缩的保留边界（`firstKeptEntryId`）开始**，而不是从上一条压缩条目开始。（如果那条保留条目在当前路径上找不到，则回退到上一条压缩条目之后。）

这样做的意义是：上次幸存下来的消息会被纳入这次的总结，不会凭空丢失。

另外，Pi 在写新 `CompactionEntry` 前会**从重建后的上下文重新计算 `tokensBefore`**，所以这个数字反映的是真正被替换掉的上下文大小。

## 4. 切点规则

一个 **turn** 从一条用户消息开始，包含到下一条用户消息之前的所有助手回复和工具调用。正常情况下压缩**切在 turn 边界**。

| 可以切的位置 | 绝对不能切的位置 |
|---|---|
| 用户消息 | **工具结果** |
| 助手消息 | |
| BashExecution 消息 | |
| 自定义消息（`custom_message`、`branch_summary`） | |

:::danger 为什么不能切在工具结果上

工具结果必须和它的工具调用待在一起。切开会产生"有调用没结果"或"有结果没调用"的消息序列，多数 Provider 会直接报错。

:::

### 分裂 turn（Split Turn）

当**单个 turn 就超过了 `keepRecentTokens`**，切点只能落在这个 turn 内部的某条助手消息上：

```
  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘

  isSplitTurn = true
  messagesToSummarize = []      ← 前面没有完整的 turn
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

这时 Pi 生成**两份摘要再合并**：

1. History summary — 之前的上下文（如果有）
2. Turn prefix summary — 这个分裂 turn 的前半部分

:::tip 这是个好面试素材

"为什么一次任务跑着跑着变慢了？"——一个读了几十个大文件的超长 turn 会触发 split turn 压缩，产生**两次额外的 LLM 调用**，而这两次调用还不走 prompt cache。

:::

## 5. 分支摘要

用 `/tree` 切到另一个分支时，Pi 会提议总结你要离开的那条分支，并把摘要注入到新位置。

| 步骤 | 做什么 |
|---|---|
| 1. 找共同祖先 | 新旧位置共享的最深节点 |
| 2. 收集条目 | 从旧叶子回溯到共同祖先 |
| 3. 按预算准备 | 按 token 预算取消息，从新到旧 |
| 4. 生成摘要 | 调 LLM，同一套结构化格式 |
| 5. 追加条目 | 在导航目标位置写入 `BranchSummaryEntry` |

```
导航前：

         ┌─ B ─ C ─ D （旧叶子，即将被放弃）
    A ───┤
         └─ E ─ F （目标）

共同祖先：A
要总结的条目：B、C、D

带摘要导航后：

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [B,C,D 的摘要] （新叶子）
```

### 文件追踪是累积的

压缩和分支摘要都会**累积**追踪文件。生成摘要时，Pi 从两个地方提取文件操作：

- 被总结的消息里的工具调用
- 上一次压缩或分支摘要的 `details`

所以多次压缩、嵌套分支摘要之后，读过和改过的文件列表**不会丢**。

## 6. 摘要长什么样

两套机制共用这个结构化格式：

```markdown
## Goal
[用户想达成什么]

## Constraints & Preferences
- [用户提过的要求]

## Progress
### Done
- [x] [已完成]

### In Progress
- [ ] [进行中]

### Blocked
- [卡住的问题]

## Key Decisions
- **[决定]**: [理由]

## Next Steps
1. [下一步该做什么]

## Critical Context
- [继续工作所需的数据]

<read-files>
path/to/file1.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### 消息是怎么序列化的

总结前，消息先被 `serializeConversation()` 转成纯文本：

```text
[User]: What they said
[Assistant thinking]: Internal reasoning
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

:::info 为什么要转成这种格式

如果直接把消息数组丢给模型，模型会**把它当成一段待续的对话继续说下去**，而不是去总结它。转成带标签的纯文本可以避免这个问题。

另外，工具结果在序列化时被**截断到 2000 字符**，超出部分替换成一个标注了截断字符数的标记——因为 `read` 和 `bash` 的输出通常是上下文里最大的一块。

:::

## 7. 用扩展接管压缩

扩展可以拦截并自定义压缩与分支摘要。

### `session_before_compact`

自动压缩或 `/compact` 之前触发，可以取消、也可以提供自定义摘要：

```typescript title="扩展：接管压缩"
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize  要总结的消息
  // preparation.turnPrefixMessages   分裂 turn 的前缀（isSplitTurn 时）
  // preparation.previousSummary      上一次的摘要
  // preparation.fileOps              提取出的文件操作
  // preparation.tokensBefore         压缩前的上下文 token
  // preparation.firstKeptEntryId     保留消息从哪里开始
  // reason                           "manual" | "threshold" | "overflow"
  // willRetry                        溢出恢复时，被中止的 turn 是否会重试

  // 取消压缩：
  return { cancel: true };

  // 或者提供自定义摘要：
  return {
    compaction: {
      summary: "Your summary...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      details: { /* 自定义数据 */ },
    },
  };
});
```

`reason` 的三个值分别对应：手动 `/compact`、达到阈值、上下文溢出后的恢复。

### 用便宜的模型做总结

```typescript title="扩展：用另一个模型生成摘要" {6-8}
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;

  const conversationText = serializeConversation(
    convertToLlm(preparation.messagesToSummarize),
  );

  const { summary, usage } = await myModel.summarize(conversationText);

  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage, // 传了才会计入会话总用量
    },
  };
});
```

完整示例见 Pi 仓库的 `examples/extensions/custom-compaction.ts`。

### 其他两个事件

| 事件 | 时机 | 用途 |
|---|---|---|
| `session_compact_failed` | 压缩失败或被中止 | 遥测扩展用它把 `session_before_compact` 的尝试和最终结果配对 |
| `session_before_tree` | `/tree` 导航前（**无论用户选不选摘要都会触发**） | 取消导航，或提供自定义分支摘要 |

```typescript title="session_before_tree"
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId            导航目标
  // preparation.oldLeafId           当前位置（将被放弃）
  // preparation.commonAncestorId    共同祖先
  // preparation.entriesToSummarize  会被总结的条目
  // preparation.userWantsSummary    用户是否选择了总结

  if (preparation.userWantsSummary) {
    return { summary: { summary: "Your summary...", details: {} } };
  }
});
```

## 8. 设置

```json title="~/.pi/agent/settings.json 或 .pi/settings.json"
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `compaction.enabled` | boolean | `true` | 启用自动压缩 |
| `compaction.reserveTokens` | number | `16384` | 为 LLM 回复预留的 token |
| `compaction.keepRecentTokens` | number | `20000` | 保留不被总结的最近 token 数 |

设 `"enabled": false` 可关闭自动压缩，但仍能手动 `/compact`。

## 9. 相关源码

本页描述的行为对应生产路径的实现（Pi v0.84.3）：

| 内容 | 文件 |
|---|---|
| 自动压缩逻辑 | `packages/coding-agent/src/core/compaction/compaction.ts` |
| 分支摘要 | `packages/coding-agent/src/core/compaction/branch-summarization.ts` |
| 文件追踪与序列化 | `packages/coding-agent/src/core/compaction/utils.ts` |
| `CompactionEntry` / `BranchSummaryEntry` | `packages/coding-agent/src/core/session-manager.ts` |
| 扩展事件类型 | `packages/coding-agent/src/core/extensions/types.ts` |

:::warning 另有一份同名实现

`packages/agent/src/harness/compaction/` 下也有 `compaction.ts` / `branch-summarization.ts` / `utils.ts`，那是新一代运行时（`packages/agent/src/harness/agent-harness.ts`）的路径。**当前跑生产的是 `coding-agent` 下的这一份。**

两代运行时的对照留到 [Pi 源码深入](/pi/source/) 讲。

:::

## 10. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 触发条件 | `contextTokens > contextWindow - reserveTokens` |
| 压缩语义 | 追加 `CompactionEntry`，原消息不删，改的是下次发送内容 |
| 切点 | 只能切用户/助手/Bash/自定义消息，**绝不能切工具结果** |
| Split turn | 单 turn 超预算时切在 turn 内部，生成两份摘要再合并 |
| 成本 | 压缩本身要花 LLM 调用，且不写 prompt cache |
| 可接管 | `session_before_compact` / `session_before_tree` 可取消或替换 |

## 下一步

→ [自定义速查](../customization) — Extension、Skill、Prompt Template、Theme、Package 分别是什么，什么时候用哪个
