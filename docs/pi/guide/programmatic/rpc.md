---
title: RPC 模式
description: 用子进程 + JSONL 协议驱动 Pi，命令与事件全表，以及分帧陷阱
---

# RPC 模式

RPC 模式让 Pi 以**无头方式**运行：JSON 协议走 stdin/stdout。适合把 Agent 嵌进其他应用、IDE 或自建 UI。

```bash
pi --mode rpc [options]
```

:::warning Node/TS 应用不该用这个

如果你写的是 Node 应用，官方建议**直接用 [SDK](./sdk) 的 `AgentSession`**，不要 spawn 子进程。

RPC 适合的是：非 Node 语言（Python、Go、Rust……）、IDE 插件、以及确实需要进程隔离的场景。

需要 TypeScript 的子进程客户端时，参考仓库里的 `src/modes/rpc/rpc-client.ts`。

:::

## 1. 全景图

```
        你的程序                            pi --mode rpc
           │                                     │
           │  stdin: 命令 JSON 行                  │
           ├────────────────────────────────────→ │
           │  {"id":"req-1","type":"prompt",...}  │
           │                                      │
           │  stdout: 响应（成败） + 事件流          │
           │ ←────────────────────────────────────┤
           │  {"type":"response","success":true}  │
           │  {"type":"agent_start"}              │
           │  {"type":"message_update",...}       │
           │  {"type":"agent_settled"}            │
```

三类消息：

| 方向 | 类型 | 说明 |
|---|---|---|
| stdin | 命令 | JSON 对象，每行一个 |
| stdout | `type: "response"` | 表示命令**是否被接受**，可用 `id` 关联 |
| stdout | 事件 | Agent 事件流，JSON 行 |

所有命令都支持可选的 `id` 字段做请求/响应关联。响应会带回同一个 `id`。

## 2. 分帧：最容易踩的坑

:::danger Node 的 `readline` 不符合协议

RPC 模式使用**严格 JSONL 语义，唯一的记录分隔符是 LF（`\n`）**。

客户端必须：

- **只**按 `\n` 切分记录
- 接受可选的 `\r\n`，做法是去掉末尾的 `\r`
- **不要**用把 Unicode 分隔符当换行的通用行读取器

Node 的 `readline` 会同时在 `U+2028` 和 `U+2029` 处切分，而这两个字符在 JSON 字符串里是合法的——用它会随机切碎消息。

:::

这是个非常好的面试素材：一个"看起来能跑"的实现，会在模型输出里恰好出现 U+2028 时炸掉，而且难以复现。

## 3. 启动参数

| 参数 | 说明 |
|---|---|
| `--provider <name>` | LLM Provider |
| `--model <pattern>` | 模型 pattern 或 ID，支持 `provider/id` 和 `:<thinking>` |
| `--name <name>` / `-n` | 启动时设置会话显示名 |
| `--no-session` | 关闭会话持久化 |
| `--session-dir <path>` | 自定义会话存储目录 |

## 4. 命令全表

按用途分组（`####` 级别的命令名与官方文档一致）：

**提问与队列**

| 命令 | 作用 |
|---|---|
| `prompt` | 发送用户 prompt |
| `steer` | 排队 steering 消息（当前助手回合的工具调用结束后投递） |
| `follow_up` | 排队 follow-up 消息（Agent 全部结束后投递） |
| `abort` | 中止当前操作 |
| `clear_queue` | 清空待投递队列 |
| `set_steering_mode` / `set_follow_up_mode` | 控制队列投递方式 |

**状态**

| 命令 | 作用 |
|---|---|
| `get_state` | 当前会话状态 |
| `get_messages` | 全部消息 |
| `get_session_stats` | 会话统计 |
| `get_last_assistant_text` | 最后一条助手文本 |
| `get_commands` | 可用命令列表 |

**模型与思考**

| 命令 | 作用 |
|---|---|
| `set_model` / `cycle_model` / `get_available_models` | 模型 |
| `set_thinking_level` / `cycle_thinking_level` / `get_available_thinking_levels` | 推理级别 |

**压缩与重试**

| 命令 | 作用 |
|---|---|
| `compact` / `set_auto_compaction` | 压缩 |
| `set_auto_retry` / `abort_retry` | 重试 |

**Bash**

| 命令 | 作用 |
|---|---|
| `bash` | 直接执行 bash（对应交互模式的 `!`） |
| `abort_bash` | 中止 |

**会话**

| 命令 | 作用 |
|---|---|
| `new_session` / `switch_session` | 新建 / 切换 |
| `fork` / `clone` / `get_fork_messages` | 分叉 |
| `get_entries` / `get_tree` | 读条目 / 读树 |
| `set_session_name` | 设置显示名 |
| `export_html` | 导出 HTML |

### prompt 的三种情况

```json title="普通提问"
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

```json title="带图片"
{"type": "prompt", "message": "What's in this image?", "images": [{"type": "image", "data": "base64...", "mimeType": "image/png"}]}
```

```json title="流式中必须指定排队方式"
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
```

响应：

```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true}
```

:::warning `success: true` 只表示"被接受"

它的含义是：prompt 被接受、已排队、或已立即处理。

**接受之后的失败通过正常事件与消息流上报**，不会对同一个请求 id 再发第二条 `response`。做 UI 时不要等第二条响应。

:::

### `get_state` 返回什么

```json
{
  "type": "response",
  "command": "get_state",
  "success": true,
  "data": {
    "model": {},
    "thinkingLevel": "medium",
    "isStreaming": false,
    "isCompacting": false,
    "steeringMode": "all",
    "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "sessionName": "my-feature-work",
    "autoCompactionEnabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

## 5. 事件全表

| 事件 | 说明 |
|---|---|
| `agent_start` | 开始处理 |
| `agent_end` | **一次底层 Agent 运行**结束（后面还可能跟重试、压缩、队列续跑） |
| `agent_settled` | **完全结束**：没有自动重试、压缩重试、排队续跑了 |
| `turn_start` / `turn_end` | 一轮开始 / 结束（含助手消息与工具结果） |
| `message_start` / `message_update` / `message_end` | 消息生命周期 |
| `bash_execution_update` | 直接 RPC `bash` 命令的输出块 |
| `tool_execution_start` / `_update` / `_end` | 工具执行 |
| `queue_update` | 待投递队列变化 |
| `compaction_start` / `compaction_end` | 压缩 |
| `auto_retry_start` / `auto_retry_end` | 瞬时错误后的自动重试 |
| `summarization_retry_scheduled` / `_attempt_start` / `_finished` | 摘要（压缩/分支摘要）的重试 |
| `extension_error` | 扩展抛错 |

:::danger `agent_end` ≠ 结束

想知道"Agent 真的干完了吗"，要监听 **`agent_settled`**，不是 `agent_end`。

`agent_end` 之后仍可能跟着自动重试、压缩后重跑、或队列里的续跑。UI 上如果用 `agent_end` 关掉 loading，会出现"转圈停了但字还在往外冒"。

:::

事件一般**不带 `id`**，例外是 `bash_execution_update`——它带发起它的 `bash` 命令的 `id`。

## 6. 扩展 UI 子协议

扩展可以通过 `ctx.ui.select()`、`ctx.ui.confirm()` 等请求用户交互。在 RPC 模式下，这些被翻译成基础命令/事件流之上的一套请求-响应子协议。

分两类：

| 类别 | 方法 | 行为 |
|---|---|---|
| **对话框** | `select`、`confirm`、`input`、`editor` | stdout 发 `extension_ui_request`，**阻塞**直到客户端用同 `id` 回 `extension_ui_response` |
| **发完不管** | `notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text` | stdout 发请求，不等响应；客户端可显示也可忽略 |

对话框方法若带 `timeout` 字段，超时后 agent 侧会用默认值自动 resolve——**客户端不需要自己跟踪超时**。

### RPC 模式下降级的方法

有些 `ExtensionUIContext` 方法需要真实 TUI，在 RPC 下不支持或降级：

| 方法 | RPC 下的行为 |
|---|---|
| `custom()` | 返回 `undefined` |
| `setWorkingMessage()`、`setWorkingIndicator()`、`setFooter()`、`setHeader()`、`setEditorComponent()`、`setToolsExpanded()` | no-op |
| `getEditorText()` | 返回 `""` |
| `getToolsExpanded()` | 返回 `false` |
| `pasteToEditor()` | 退化为 `setEditorText()`（无粘贴/折叠处理） |
| `getAllThemes()` / `getTheme()` | 返回 `[]` / `undefined` |
| `setTheme()` | 返回 `{ success: false, error: "..." }` |

:::warning `hasUI` 在 RPC 下是 `true`

因为对话框和发完不管这两类方法**确实可用**（走子协议）。

所以写扩展时，**判断"能不能用真终端能力"要用 `ctx.mode === "tui"`**，不能用 `ctx.hasUI`。RPC 下 `ctx.mode` 是 `"rpc"`。

:::

## 7. 错误处理

命令失败返回 `success: false`：

```json
{"type": "response", "command": "set_model", "success": false, "error": "Model not found: invalid/model"}
```

解析失败：

```json
{"type": "response", "command": "parse", "success": false, "error": "Failed to parse command: Unexpected token..."}
```

## 8. 最小 Python 客户端

```python title="rpc_client.py"
import subprocess
import json

proc = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True,
)

def send(cmd):
    proc.stdin.write(json.dumps(cmd) + "\n")
    proc.stdin.flush()

def read_events():
    for line in proc.stdout:
        yield json.loads(line)

send({"type": "prompt", "message": "Hello!"})

for event in read_events():
    if event.get("type") == "message_update":
        delta = event.get("assistantMessageEvent", {})
        if delta.get("type") == "text_delta":
            print(delta["delta"], end="", flush=True)

    if event.get("type") == "agent_end":
        print()
        break
```

:::info 这个官方示例可以改进

它用 `agent_end` 结束循环。按第 5 节的说明，**生产代码应该等 `agent_settled`**，否则会在自动重试或压缩续跑时提前退出。

:::

## 9. 两代传输路径

| 路径 | 传输 | 状态 |
|---|---|---|
| **RPC 模式**（本页） | stdin/stdout JSONL，严格 LF 分帧 | 现役 |
| `packages/protocol` + `client` + `server` | CBOR + 4 字节大端长度前缀 | **experimental**，改动频繁 |

新栈仍在实验中且改动很快，不建议现在依赖。要接 Pi，用本页的 RPC 或 [SDK](./sdk)。

## 10. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 选型 | Node 用 SDK，其他语言用 RPC |
| 分帧 | 只按 `\n` 切，**别用 Node `readline`** |
| 响应语义 | `success: true` = 被接受，不代表成功完成 |
| 结束判定 | 等 `agent_settled`，不是 `agent_end` |
| 扩展 UI | `hasUI` 为 `true`；判断真终端能力用 `ctx.mode === "tui"` |

:::info 官方文档

RPC 协议完整定义（每条命令的字段、每个事件的 payload、扩展 UI 请求/响应格式、Node 交互式客户端示例）见仓库 `packages/coding-agent/docs/rpc.md`，共 1618 行。

:::

## 下一步

→ [JSON 模式](./json) — 只要事件流不要交互时，更简单的那个选项
