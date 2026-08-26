---
title: 终端设置
description: 各终端的 Kitty 键盘协议支持、Shift+Enter 与 Alt+Enter 配置
---

# 终端设置

Pi 使用 [Kitty 键盘协议](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) 来可靠地识别修饰键。多数现代终端支持它，但有些需要手动配置。

**如果你遇到的是这两个问题之一，直接跳到对应终端**：`Shift+Enter` 不能换行、`Alt+Enter` 被终端全屏吃掉。

## 1. 支持度速查

| 终端 | 开箱可用 | 需要配置的部分 |
|---|---|---|
| Kitty | ✅ 全部 | — |
| iTerm2 | ✅ 常规模式 | 全屏模式的滚动速度 |
| Apple Terminal | ✅ 有本地回退 | SSH 下回退失效 |
| Ghostty | 部分 | `alt+backspace` 映射 |
| WezTerm | 部分 | macOS 上的 `Option+Enter` |
| Alacritty | 部分 | macOS 上的 `Option+Enter` |
| VS Code 集成终端 | ✅ 1.109.5+ | 更老版本需绑定 `Shift+Enter` |
| Windows Terminal | 部分 | `Shift+Enter` 与 `Alt+Enter` |
| xfce4-terminal / terminator | ❌ | 无解，建议换终端 |
| IntelliJ 集成终端 | ❌ | 无解，建议换终端 |

## 2. Kitty

开箱即用，不用配。

## 3. iTerm2

常规 TUI 模式开箱可用。

### 全屏模式滚动太慢

全屏模式下 Pi 接管视口，iTerm2 发送的是鼠标滚轮报告而不是滚动原生 scrollback。在 iTerm2 默认的"快速触控板"行为下，这些报告会丢掉加速滚轮的大部分位移。

现象是：**快速滑动只滚一行左右**。

修法：

1. **iTerm2 → Settings → Advanced**
2. 搜索 **Trackpad scrolls fast?**，设为 **No**

:::warning 这是全局设置

它会影响 iTerm2 里所有程序的触控板滚动。上游问题追踪在 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619)。

:::

## 4. Apple Terminal

Pi 会在可用时启用增强键上报。如果 Terminal.app 对 `Shift+Enter` 仍然只发普通 Return，Pi 会用 **macOS 本地修饰键回退**把它当作 `Shift+Enter`。

:::warning SSH 下这个回退失效

回退只在 Pi 与 Terminal.app **跑在同一台 Mac** 上时有效。远程 SSH 时检测不到本地键盘。

:::

## 5. Ghostty

配置文件位置：macOS `~/Library/Application Support/com.mitchellh.ghostty/config`，Linux `~/.config/ghostty/config`。

```text title="Ghostty config"
keybind = alt+backspace=text:\x1b\x7f
```

### 一个来自 Claude Code 的历史遗留映射

老版本 Claude Code 可能让你加过这行：

```text
keybind = shift+enter=text:\n
```

:::danger 这行会破坏 Pi 的 Shift+Enter

它发的是**裸 linefeed 字节**。在 Pi 里这和 `Ctrl+J` 无法区分，于是 tmux 和 Pi 都再也看不到真正的 `shift+enter` 按键事件。

如果你加它只是为了 Claude Code 2.x，现在可以删掉——除非你还要在 tmux 里用 Claude Code。

Pi 默认把 `Ctrl+J` 绑成换行别名，所以即使保留这个映射，`Shift+Enter` 在 tmux 里也照常工作，不需要额外配置。

:::

### 全屏模式的链接

全屏模式下链接仍可点击，但 Pi 捕获鼠标输入期间 Ghostty 不显示 hover 下划线和左下角 URL 预览。

按住 **Shift+Command**（macOS）或 **Shift+Ctrl**（Linux）可以使用 Ghostty 的原生链接处理。

## 6. WezTerm

通常靠 xterm modifyOtherKeys 就能支持 `Shift+Enter`。想显式启用 Kitty 协议：

```lua title="~/.wezterm.lua"
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

macOS 上 `Option+Enter` 默认绑给全屏。要让它用于 Pi 的 follow-up 排队：

```lua title="~/.wezterm.lua"
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

已有 `config.keys` 就把这一项加进去。

:::info WSL 上的中文输入法

WezTerm 在 WSL 下可能需要**可见的硬件光标**才能正确定位候选框。

如果 CJK 候选框不跟随光标，设 `PI_HARDWARE_CURSOR=1`，或把设置里的 `showHardwareCursor` 设为 `true`。

:::

## 7. Alacritty

通常开箱支持 `Shift+Enter`。macOS 上 `Option+Enter` 可能被当成普通 `Enter`：

```toml title="~/.config/alacritty/alacritty.toml"
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

改完**重启 Alacritty**。

## 8. VS Code 集成终端

VS Code **1.109.5 及以上**默认在集成终端启用 Kitty 键盘协议，`Shift+Enter` 开箱可用。

更老的版本需要显式绑定：

```json title="keybindings.json"
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

文件位置：

| 系统 | 路径 |
|---|---|
| macOS | `~/Library/Application Support/Code/User/keybindings.json` |
| Linux | `~/.config/Code/User/keybindings.json` |
| Windows | `%APPDATA%\Code\User\keybindings.json` |

## 9. Windows Terminal

Pi 在原生 Windows 和 WSL 下使用 Windows 风格键位，详见 [Windows](./windows#3-快捷键差异)。

```json title="Windows Terminal settings.json — 转发 Shift+Enter"
{
  "actions": [
    {
      "command": { "action": "sendInput", "input": "\u001b[13;2u" },
      "keys": "shift+enter"
    }
  ]
}
```

已有 `actions` 数组就把对象加进去。**改完必须完全关闭并重开 Windows Terminal。**

`Alt+Enter` 默认绑全屏。想用它代替 Pi 默认的 `Ctrl+Q` 做 follow-up 排队，需要：配置 Windows Terminal 发出该键 + 在 Pi 里把 `app.message.followUp` 绑到 `alt+enter`。

## 10. 不推荐的终端

### xfce4-terminal、terminator

转义序列支持有限，**`Ctrl+Enter`、`Shift+Enter` 与普通 `Enter` 无法区分**，所以 `submit: ["ctrl+enter"]` 这类自定义绑定不可能工作。

### IntelliJ IDEA 集成终端

同样问题：`Shift+Enter` 和 `Enter` 无法区分。想显示硬件光标可设 `PI_HARDWARE_CURSOR=1`（默认关闭以兼容）。

:::tip 建议换用支持 Kitty 协议的终端

[Kitty](https://sw.kovidgoyal.net/kitty/) ｜ [Ghostty](https://ghostty.org/) ｜ [WezTerm](https://wezfurlong.org/wezterm/) ｜ [iTerm2](https://iterm2.com/) ｜ [Alacritty](https://github.com/alacritty/alacritty)（需编译时带 Kitty 协议支持）

:::

## 11. 本篇小结

| 症状 | 去看 |
|---|---|
| `Shift+Enter` 不换行 | 第 5/6/7/8/9 节对应终端 |
| `Alt+Enter` 被全屏吃掉 | WezTerm(6) / Windows Terminal(9) |
| 全屏滚动很慢 | iTerm2(3) |
| 中文候选框不跟随 | `PI_HARDWARE_CURSOR=1` |
| 怎么配都不行 | 第 10 节，换终端 |

## 下一步

→ [Shell 别名](./shell-aliases) — 让 Agent 的 bash 也能用你的别名
