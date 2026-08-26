---
title: Windows
description: Windows 下的 Shell 选择、PowerShell 工具与快捷键差异
---

# Windows

Windows 上用 Pi 有三件事和别的平台不同：**用哪个 shell**、**要不要换成 PowerShell 工具**、**快捷键不一样**。

## 1. Shell 查找顺序

Pi 在 Windows 上默认用 **Git Bash**。查找顺序：

| 顺序 | 位置 |
|---|---|
| 1 | `~/.pi/agent/settings.json` 里的自定义路径 |
| 2 | Git Bash：`C:\Program Files\Git\bin\bash.exe` |
| 3 | PATH 上的 `bash.exe`（Cygwin、MSYS2、WSL） |

大多数人装个 [Git for Windows](https://git-scm.com/download/win) 就够了。

### 自定义 bash 路径

```json title="~/.pi/agent/settings.json"
{ "shellPath": "C:\\cygwin64\\bin\\bash.exe" }
```

:::warning JSON 里的 Windows 路径

必须用**正斜杠**或**转义的反斜杠**：

```json
{ "shellPath": "C:/Program Files/Git/bin/bash.exe" }
```

:::

## 2. PowerShell 工具

可选的 `powershell` 工具优先用 `pwsh.exe`，没有则退回 Windows PowerShell。启动参数固定是：

```text
-NoProfile -NonInteractive -ExecutionPolicy Bypass
```

:::warning 管理员强制的执行策略仍然优先

`-ExecutionPolicy Bypass` 不能绕过组策略层面强制的执行策略。企业环境里可能仍然跑不了脚本。

:::

### 换掉面向模型的 bash 工具

```json title="只给模型 powershell"
{ "defaultTools": ["read", "powershell", "edit", "write"] }
```

```json title="两个都开，对比行为"
{ "defaultTools": ["read", "bash", "powershell", "edit", "write"] }
```

:::info `!` 和 `!!` 仍然走 Bash

`defaultTools` 只影响**模型能调用的工具**。你在编辑器里敲的 `!command` 和 `!!command` 依然用 Bash。

也就是说，把 `bash` 从 `defaultTools` 里去掉之后，你和模型用的是两个不同的 shell。

:::

## 3. 快捷键差异

Windows（含 WSL）上 Pi 使用 Windows 风格的键位：

| 操作 | Windows / WSL | 其他平台 |
|---|---|---|
| 粘贴图片或文本 | `Alt+V` | `Ctrl+V` |
| 排队 Follow-up 消息 | `Ctrl+Q` | `Alt+Enter` |
| 取回排队消息 | `Alt+Q` | `Alt+Up` |
| 上一个模型 | `Alt+P` | `Shift+Ctrl+P` |
| 撤销编辑 | 原生 Windows `Ctrl+Z`；WSL `Alt+Z` | `Ctrl+-` |
| 全屏模式搜索 | `Ctrl+F` | `Ctrl+Shift+F` |
| 跳转标记消息 | `Ctrl+Up` / `Ctrl+Down` | `Ctrl+Shift+Up/Down` |

WSL 上 `Ctrl+Z` 留给挂起（`app.suspend`），所以撤销改成了 `Alt+Z`。

:::warning 原生 Windows 没有挂起

Windows 终端不支持 Unix 作业控制，`app.suspend` 没有默认绑定；手动绑了也只会显示一条状态消息。

:::

## 4. Windows Terminal 的两个必改项

### Shift+Enter 换行

```json title="Windows Terminal settings.json（Ctrl+Shift+, 打开）"
{
  "actions": [
    {
      "command": { "action": "sendInput", "input": "\u001b[13;2u" },
      "keys": "shift+enter"
    }
  ]
}
```

已有 `actions` 数组就把这个对象加进去。**改完要完全关闭并重开 Windows Terminal。**

### Alt+Enter 被全屏占用

Windows Terminal 默认把 `Alt+Enter` 绑成全屏。想用它做 follow-up 排队（而不是 Pi 默认的 `Ctrl+Q`），需要两步：

1. 配置 Windows Terminal 把这个键发出去
2. 在 Pi 的 `keybindings.json` 里把 `app.message.followUp` 绑到 `alt+enter`

## 5. 其他 Windows 相关设置

| 场景 | 做法 |
|---|---|
| 中文输入法候选框位置不对 | `PI_HARDWARE_CURSOR=1` 或设置 `showHardwareCursor: true` |
| 多行输入 | Windows Terminal 上用 `Ctrl+Enter` |
| 外部编辑器 | 未配置 `externalEditor` 时回退到 Notepad |
| npm 走 mise/nvm 等包装器 | 配置 `npmCommand` argv |

## 6. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 默认 shell | Git Bash，可用 `shellPath` 覆盖 |
| PowerShell | 只换模型侧工具，`!` / `!!` 仍走 Bash |
| 路径写法 | JSON 里用 `/` 或 `\\` |
| 键位 | `Alt+V`、`Ctrl+Q`、`Alt+Q`、`Alt+P` 是 Windows 专属 |
| 终端配置 | Windows Terminal 需手动转发 `Shift+Enter` |

## 下一步

→ [容器化](./containerization) — 三种隔离模式的边界与选型
