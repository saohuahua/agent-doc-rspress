---
title: JSON 模式
description: 把会话事件以 JSON 行输出，适合一次性任务与流水线集成
---

# JSON 模式

```bash
pi --mode json "Your prompt"
```

把所有会话事件以 **JSON 行**输出到 stdout。适合把 Pi 接进其他工具或自建 UI。

## 1. 三种编程式接入怎么选

| | JSON 模式 | [RPC 模式](./rpc) | [SDK](./sdk) |
|---|---|---|---|
| 方向 | **只出不进** | 双向 | 同进程 API |
| 交互 | 不能中途干预 | 能 steer / abort / 换模型 | 全部 |
| 适合 | 一次性任务、CI、日志采集 | IDE 插件、自建 UI | Node 应用 |
| 成本 | 最低 | 中 | 中 |

一句话：**只需要"跑一次并把过程记下来"就用 JSON 模式。**

## 2. 输出格式

第一行是会话头：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"...","cwd":"/path"}
```

之后是按发生顺序的事件：

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"assistant","content":[]}}
{"type":"message_update","usage":{},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{}}
{"type":"turn_end","message":{},"toolResults":[]}
{"type":"agent_end","messages":[]}
```

## 3. `message_update` 是纯增量

这是 JSON 模式与 SDK 事件最重要的差别。

:::warning 没有累积快照

JSON 模式的 `message_update` **同时省略**了：

- 顶层的累积 `message` 字段
- `assistantMessageEvent.partial`

目的是让流的体积**随输出线性增长**，而不是平方级增长。

想要实时文本，自己用 `contentIndex` + `delta` 拼；想要最终结果，直接读 `message_end`——**它带的是权威的完整消息**。

:::

类型上的表达是这样的：

```typescript title="JsonAgentSessionEvent"
type WithoutPartial<T> = T extends { partial: unknown } ? Omit<T, "partial"> : T;

type JsonAssistantMessageEvent<T> = T extends { type: "toolcall_start"; partial: unknown }
  ? WithoutPartial<T> & { id: string; toolName: string }
  : WithoutPartial<T>;

type JsonAgentSessionEvent =
  | Exclude<AgentSessionEvent, { type: "message_update" }>
  | {
      type: "message_update";
      usage: Usage;
      assistantMessageEvent: JsonAssistantMessageEvent<AssistantMessageEvent>;
    };
```

两个细节：

| 细节 | 说明 |
|---|---|
| `toolcall_start` | 额外带**定长**的 `id` 和 `toolName`，所以不用靠 partial 也能知道调了什么工具 |
| 顶层 `usage` | 最新的**累积** provider 上报用量；有些 Provider 只在结束时报，中途可能一直是 0 |

## 4. 基础事件

除会话相关事件外，其余来自 `AgentEvent`：

```typescript title="packages/agent/src/types.ts"
type AgentEvent =
  // Agent 生命周期
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  // Turn 生命周期
  | { type: "turn_start" }
  | { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
  // 消息生命周期
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }
  // 工具执行
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean };
```

另外两个值得注意：

| 事件 | 说明 |
|---|---|
| `queue_update` | 队列变化时输出**完整**的 steering 与 follow-up 队列 |
| `compaction_start` / `compaction_end` | **手动和自动压缩都会触发** |

消息类型定义见 [会话文件格式](../reference/session-format#3-消息类型)。

## 5. 实用配方

```bash title="只看最终消息"
pi --mode json "List files" 2>/dev/null | jq -c 'select(.type == "message_end")'
```

```bash title="只看工具调用"
pi --mode json "Refactor utils.ts" 2>/dev/null \
  | jq -c 'select(.type == "tool_execution_start") | {tool: .toolName, args: .args}'
```

```bash title="统计这次跑了多少 token"
pi --mode json "Audit this repo" 2>/dev/null \
  | jq -c 'select(.type == "message_end") | .message.usage.totalTokens'
```

```bash title="把事件流存下来事后复盘"
pi --mode json "Fix the failing test" > run.jsonl 2>run.err
```

:::tip 为什么都带 `2>/dev/null`

事件流走 stdout，诊断信息走 stderr。做管道处理时要么丢弃 stderr，要么单独存文件——**混在一起会让 `jq` 解析失败**。

:::

## 6. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 定位 | 单向事件流，跑一次并记录 |
| 首行 | 会话头，不是事件 |
| `message_update` | 纯增量，无累积快照，无 `partial` |
| 权威结果 | 读 `message_end` |
| 管道 | 记得处理 stderr |

## 下一步

→ [TUI 组件](./tui) — 复用 Pi 的终端 UI 组件写自己的界面
