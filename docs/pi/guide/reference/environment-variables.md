---
title: 环境变量
description: Pi 进程配置、进程标记与 Shell 工具会话环境
---

# 环境变量

Pi 用环境变量做三件事：

```
┌─────────────────────────────────────────────────────────┐
│ 1. 配置 Pi 进程自己                                       │
│    PI_OFFLINE、PI_CODING_AGENT_DIR ...                   │
├─────────────────────────────────────────────────────────┤
│ 2. 设置进程标记，让子进程知道自己跑在 Pi 里                  │
│    AI_AGENT=pi、PI_CODING_AGENT=true                     │
├─────────────────────────────────────────────────────────┤
│ 3. 给 LLM 可调用的 shell 工具注入当前会话状态                │
│    PI_SESSION_ID、PI_MODEL、PI_REASONING_LEVEL ...        │
└─────────────────────────────────────────────────────────┘
```

Provider 的 API Key 变量单独记在 [Providers](../getting-started/providers) 里，本页不重复。

## 1. 进程标记

CLI 和 RPC 入口会设置两个标记：

| 变量 | 值 | 用途 |
|---|---|---|
| `AI_AGENT` | `pi` | 通用标记，让工具链识别出是 Pi 启动了这个进程 |
| `PI_CODING_AGENT` | `true` | Pi 专用，让子进程检测自己跑在 Pi 内部 |

子进程会继承这两个标记。

:::warning 两个边界

1. 它们**不是会话相关**的，只表明"跑在 Pi 里"。
2. 通过 **SDK 嵌入** Pi 时**不会**自动设置。

:::

用途举例：在 `AGENTS.md` 或构建脚本里根据 `PI_CODING_AGENT` 走不同分支，比如禁掉交互式确认。

## 2. Shell 工具的会话环境

`bash` 和 `powershell` 工具执行的命令，会拿到当前会话状态：

| 变量 | 说明 |
|---|---|
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 当前会话 JSONL 的绝对路径；**临时会话下不设置** |
| `PI_PROVIDER` | 当前选中的模型 Provider |
| `PI_MODEL` | 当前选中的模型 ID |
| `PI_REASONING_LEVEL` | 当前生效的推理级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |

这些值在**每条命令启动时**解析。所以切模型或改推理级别之后，下一条 shell 命令立刻能看到新值，不用重启 Pi。

:::tip 让模型自己回答"你现在是什么模型"

系统提示词里的模型名可能过时。正确做法是让它读环境变量：

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

:::

会话持久化时可以直接查看会话文件：

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

:::warning 只注入给 LLM 可调用的工具

这些变量注入的是 `bash` / `powershell` **工具**。你自己在编辑器里敲的 `!` 和 `!!` 命令**不会**拿到它们。

另外 `PI_PROVIDER` / `PI_MODEL` 标识的是你在 Pi 里选的模型，**不是**路由器内部可能实际选用的上游模型。

:::

### 自定义 Shell 工具

用 `createBashTool()` / `createPowerShellTool()` 创建并注册到 Pi 的工具，默认也会暴露会话环境。注入发生在 `spawnHook` **之前**，所以 hook 能在 `ctx.env` 里看到它们：

```typescript title="在会话环境基础上追加变量" {4}
const bashTool = createBashTool(cwd, {
  spawnHook: (ctx) => ({
    ...ctx,
    env: { ...ctx.env, CI: "1" },
  }),
});
```

也可以单独关掉会话元数据，不影响 spawnHook：

```typescript title="关闭会话环境注入" {2}
const powershellTool = createPowerShellTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx,
});
```

关闭时 Pi 会**移除继承来的同名变量**，避免嵌套的 Pi 进程暴露上级会话的陈旧元数据。

## 3. Pi 进程配置

这些变量由 Pi 自己读取：

| 变量 | 说明 |
|---|---|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录，默认 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储目录；被 `--session-dir` 覆盖 |
| `PI_PACKAGE_DIR` | 覆盖包目录，对 Nix/Guix store 路径有用 |
| `PI_OFFLINE` | 禁用启动期全部网络操作：更新检查、包更新、安装/更新遥测 |
| `PI_SKIP_VERSION_CHECK` | 禁用向 `pi.dev` 请求最新版本 |
| `PI_TELEMETRY` | 覆盖安装/更新遥测与 Provider 归因头：`1`/`true`/`yes` 或 `0`/`false`/`no` |
| `PI_CACHE_RETENTION` | 设为 `long` 可在支持的 Provider 上启用更长的 prompt 缓存 |
| `PI_SHARE_VIEWER_URL` | 覆盖 `/share` 使用的基础 URL |
| `PI_HARDWARE_CURSOR` | 设为 `1` 显示硬件光标（输入法场景） |
| `PI_TUI_ESC_TIMEOUT` | 收到单独 ESC 后等多久才当作 Escape（毫秒）；SSH 下默认 `100`，其他默认 `10` |
| `VISUAL`、`EDITOR` | 未设置 `externalEditor` 时的外部编辑器回退 |
| `HTTP_PROXY`、`HTTPS_PROXY` | HTTP 出站代理 |

:::tip 中文输入法或 Alt 键被误判成 Escape

调大 `PI_TUI_ESC_TIMEOUT`。SSH 下延迟高，默认值已经是 10 倍，本地终端如果也有问题可以手动加大。

:::

## 4. 优先级速查

| 配置项 | 优先级（高 → 低） |
|---|---|
| 会话目录 | `--session-dir` → `PI_CODING_AGENT_SESSION_DIR` → `settings.json` 的 `sessionDir` |
| API Key | `--api-key` → `auth.json` → 环境变量 → `models.json` 自定义 provider key |
| 外部编辑器 | `externalEditor` 设置 → `$VISUAL` → `$EDITOR` → Notepad(Win) / nano |
| 断网 | `--offline` = `PI_OFFLINE=1`（覆盖面最广，含 `PI_SKIP_VERSION_CHECK` 的作用） |

## 5. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 三种用途 | 配置进程 / 进程标记 / 注入会话状态 |
| 会话变量 | 每条命令启动时解析，切模型立即生效 |
| 注入范围 | 只给 `bash`/`powershell` **工具**，不给 `!` 和 `!!` |
| SDK 场景 | 进程标记不会自动设置 |
| 断网 | 只有 `PI_OFFLINE` / `--offline` 是彻底的 |

## 下一步

→ [会话文件格式](./session-format) — JSONL 里每一行是什么，怎么自己写解析器
