---
title: 快捷键
description: 默认快捷键全表、按键格式与自定义方法
---

# 快捷键

Pi 的所有快捷键都能改，配置文件是 `~/.pi/agent/keybindings.json`。每个动作可以绑一个键或多个键。

这一页先讲**怎么改**，再给**全表**。全表用来检索，不用背。

## 1. 三件事先知道

:::tip 改完不用重启

编辑 `keybindings.json` 后，在 Pi 里运行 `/reload` 即可生效，会话不中断。

:::

| 事实 | 说明 |
|---|---|
| id 是带命名空间的 | 如 `tui.editor.cursorUp`，和扩展作者在 `keyHint()` 里用的是同一套 id |
| 旧配置自动迁移 | 老的非命名空间 id（如 `cursorUp`、`expandTools`）启动时自动转换 |
| 用户配置替换默认值 | 不是合并。绑了 `["ctrl+w"]` 就只剩这一个键 |

## 2. 按键格式

格式是 `modifier+key`。修饰键：`ctrl`、`shift`、`alt`、`super`（可组合）。

| 类别 | 可用值 |
|---|---|
| 字母 | `a-z` |
| 数字 | `0-9` |
| 特殊键 | `escape`/`esc`、`enter`/`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right` |
| 功能键 | `f1`-`f12` |
| 符号 | `` ` `` `-` `=` `[` `]` `\` `;` `'` `,` `.` `/` `!` `@` `#` `$` `%` `^` `&` `*` `(` `)` `_` `+` `\|` `~` `{` `}` `:` `<` `>` `?` |

组合示例：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+1`。

:::warning `super` 需要终端支持

`super` 绑定要求终端单独上报该修饰键，通常需要 Kitty 键盘协议。不支持的终端上会失效。

:::

## 3. 自定义

```json title="~/.pi/agent/keybindings.json"
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.deleteWordBackward": ["ctrl+w", "alt+backspace"]
}
```

### Emacs 风格

```json
{
  "tui.editor.historyPrevious": "ctrl+p",
  "tui.editor.historyNext": "ctrl+n",
  "tui.editor.cursorLeft": ["left", "ctrl+b"],
  "tui.editor.cursorRight": ["right", "ctrl+f"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+f"],
  "tui.editor.deleteCharForward": ["delete", "ctrl+d"],
  "tui.editor.deleteCharBackward": ["backspace", "ctrl+h"],
  "tui.input.newLine": ["shift+enter", "ctrl+j"]
}
```

### Vim 风格

```json
{
  "tui.editor.cursorUp": ["up", "alt+k"],
  "tui.editor.cursorDown": ["down", "alt+j"],
  "tui.editor.cursorLeft": ["left", "alt+h"],
  "tui.editor.cursorRight": ["right", "alt+l"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+w"]
}
```

:::info 冲突是怎么解决的

专用的历史动作（`historyPrevious` / `historyNext`）无论光标在多行 prompt 的哪个位置都切换历史。

主编辑器获得焦点时，**显式的历史绑定优先于应用级动作**。所以把 `tui.editor.historyPrevious` 绑到 `ctrl+p`，只会在编辑器里覆盖模型循环，选择器里的 Ctrl+P 不受影响。

:::

## 4. 编辑器：光标移动

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `tui.editor.cursorUp` | `up` | 上移；在首行则浏览更早的历史 |
| `tui.editor.cursorDown` | `down` | 下移；在末行则浏览更新的历史 |
| `tui.editor.historyPrevious` | *(无)* | 选择上一条 prompt 历史 |
| `tui.editor.historyNext` | *(无)* | 选择下一条 prompt 历史 |
| `tui.editor.cursorLeft` | `left`、`ctrl+b` | 左移 |
| `tui.editor.cursorRight` | `right`、`ctrl+f` | 右移 |
| `tui.editor.cursorWordLeft` | `alt+left`、`ctrl+left`、`alt+b` | 左移一个词 |
| `tui.editor.cursorWordRight` | `alt+right`、`ctrl+right`、`alt+f` | 右移一个词 |
| `tui.editor.cursorLineStart` | `home`、`ctrl+home`、`ctrl+a` | 行首 |
| `tui.editor.cursorLineEnd` | `end`、`ctrl+end`、`ctrl+e` | 行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳到某字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳到某字符 |
| `tui.editor.pageUp` | `pageUp`、`ctrl+pageUp` | 上翻页 |
| `tui.editor.pageDown` | `pageDown`、`ctrl+pageDown` | 下翻页 |

## 5. 编辑器：删除与撤销

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `tui.editor.deleteCharBackward` | `backspace` | 向前删除一个字符 |
| `tui.editor.deleteCharForward` | `delete`、`ctrl+d` | 向后删除一个字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`、`alt+backspace` | 向前删除一个词 |
| `tui.editor.deleteWordForward` | `alt+d`、`alt+delete` | 向后删除一个词 |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 删到行首 |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 删到行尾 |
| `tui.editor.yank` | `ctrl+y` | 粘贴最近删除的文本 |
| `tui.editor.yankPop` | `alt+y` | yank 后循环历史删除内容 |
| `tui.editor.undo` | `ctrl+-`（Windows `ctrl+z`；WSL `alt+z`） | 撤销上次编辑 |

## 6. 输入与选择

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `tui.input.newLine` | `shift+enter`、`ctrl+j` | 插入换行 |
| `tui.input.submit` | `enter` | 提交 |
| `tui.input.tab` | `tab` | Tab / 自动补全 |
| `tui.input.copy` | `ctrl+c` | 复制选中内容 |
| `tui.select.up` / `.down` | `up` / `down` | 列表上下移动 |
| `tui.select.pageUp` / `.pageDown` | `pageUp` / `pageDown` | 列表翻页 |
| `tui.select.confirm` | `enter` | 确认选择 |
| `tui.select.cancel` | `escape`、`ctrl+c` | 取消选择 |

## 7. 应用级

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `app.interrupt` | `escape` | 取消 / 中止 |
| `app.clear` | `ctrl+c` | 第一次清空编辑器，第二次退出 |
| `app.exit` | `ctrl+d` | 编辑器为空时退出 |
| `app.suspend` | `ctrl+z`（Windows 无默认） | 挂到后台 |
| `app.editor.external` | `ctrl+g` | 打开外部编辑器 |
| `app.clipboard.pasteImage` | `ctrl+v`（Windows/WSL `alt+v`） | 粘贴剪贴板的图片或文本 |

:::warning 原生 Windows 没有 `app.suspend`

Windows 终端不支持 Unix 作业控制，所以没有默认绑定。手动绑了也只会显示一条状态消息而不会真的挂起。WSL 里 `ctrl+z` / `fg` 正常。

:::

## 8. 模型与思考

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 切到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p`（Windows/WSL `alt+p`） | 切到上一个模型 |
| `app.thinking.cycle` | `shift+tab` | 循环 thinking level |
| `app.thinking.toggle` | `ctrl+t` | 折叠/展开 thinking block |

## 9. 显示与消息队列

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `app.tools.expand` | `ctrl+o` | 折叠/展开工具输出 |
| `app.message.copy` | `ctrl+x` | 复制最后一条助手消息（`/tree` 里是选中的那条） |
| `app.message.followUp` | `alt+enter`（Windows/WSL `ctrl+q`） | 排队 Follow-up 消息 |
| `app.message.dequeue` | `alt+up`（Windows/WSL `alt+q`） | 把排队消息取回编辑器 |

## 10. 会话

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `app.session.new` | *(无)* | 新会话（`/new`） |
| `app.session.tree` | *(无)* | 会话树导航（`/tree`） |
| `app.session.fork` | *(无)* | Fork 当前会话（`/fork`） |
| `app.session.resume` | *(无)* | 会话选择器（`/resume`） |
| `app.session.togglePath` | `ctrl+p` | 切换路径显示 |
| `app.session.toggleSort` | `ctrl+s` | 切换排序方式 |
| `app.session.toggleNamedFilter` | `ctrl+n` | 只看已命名会话 |
| `app.session.rename` | `ctrl+r` | 重命名会话 |
| `app.session.delete` | `ctrl+d` | 删除会话 |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 搜索框为空时删除会话 |

:::tip 前四个默认没有绑定

`/new`、`/tree`、`/fork`、`/resume` 默认只能用斜杠命令。常用的话自己绑一下会快很多。

:::

## 11. 会话树导航

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `app.tree.foldOrUp` | `ctrl+left`、`alt+left` | 折叠当前分支段，或跳到上一段开头 |
| `app.tree.unfoldOrDown` | `ctrl+right`、`alt+right` | 展开当前分支段，或跳到下一段开头/分支末尾 |
| `app.tree.editLabel` | `shift+l` | 编辑选中节点的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换标签时间戳显示 |
| `app.tree.filter.default` | `ctrl+d` | 默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 隐藏工具结果 |
| `app.tree.filter.userOnly` | `ctrl+u` | 只看用户消息 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 只看有标签的条目 |
| `app.tree.filter.all` | `ctrl+a` | 显示全部条目 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环过滤模式 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环过滤模式 |

## 12. Scoped Models 选择器

在 `/scoped-models` 打开的选择器内使用：

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `app.models.save` | `ctrl+s` | 保存当前选择到设置 |
| `app.models.enableAll` | `ctrl+a` | 启用全部（或搜索结果全部） |
| `app.models.clearAll` | `ctrl+x` | 清空全部（或搜索结果全部） |
| `app.models.toggleProvider` | `ctrl+p` | 切换当前 Provider 的所有模型 |
| `app.models.reorderUp` | `alt+up` | 在循环顺序中上移 |
| `app.models.reorderDown` | `alt+down` | 在循环顺序中下移 |

## 13. 全屏模式的滚动区

只在 `--tui-mode fullscreen` 下生效，作用于主对话滚动区。

**全屏对话区绑定优先于编辑器绑定**，所以默认的无修饰导航键在全屏下控制对话区，而它们的 `ctrl` 变体继续控制编辑器：

| 键 | 常规模式 | 全屏模式 |
|---|---|---|
| `home`、`end` | 编辑器 | 对话区 |
| `ctrl+home`、`ctrl+end` | 编辑器 | 编辑器 |
| `pageUp`、`pageDown` | 编辑器 | 对话区 |
| `ctrl+pageUp`、`ctrl+pageDown` | 编辑器 | 编辑器 |

这套路由是可配的。例如：

```json title="让 pageUp 归编辑器、ctrl+pageUp 归对话区"
{ "tui.altScreen.pageUp": "ctrl+pageUp" }
```

```json title="彻底禁用某个对话区快捷键"
{ "tui.altScreen.pageUp": [] }
```

| Keybinding id | 默认键 | 说明 |
|---|---|---|
| `tui.altScreen.pageUp` / `.pageDown` | `pageUp` / `pageDown` | 对话区翻页 |
| `tui.altScreen.halfPageUp` / `.halfPageDown` | *(无)* | 半页滚动 |
| `tui.altScreen.lineUp` / `.lineDown` | *(无)* | 单行滚动 |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up`（Windows/WSL 另有 `ctrl+up`） | 跳到上一条标记消息 |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down`（Windows/WSL 另有 `ctrl+down`） | 跳到下一条标记消息 |
| `tui.altScreen.search` | `ctrl+shift+f`（Windows/WSL `ctrl+f`） | 搜索已渲染的对话 |
| `tui.altScreen.searchNext` | `enter`、`ctrl+g` | 下一个匹配 |
| `tui.altScreen.searchPrevious` | `shift+enter`、`ctrl+shift+g` | 上一个匹配 |
| `tui.altScreen.searchClose` | `escape` | 关闭搜索 |
| `tui.altScreen.top` | `home` | 滚到开头 |
| `tui.altScreen.bottom` | `end` | 滚到末尾并跟随新输出 |

全屏下还支持：双指/滚轮滚动指针所在区域，点击 OSC 8 超链接用默认程序打开，主键拖拽选中并复制，拖到上下边缘自动滚动。终端差异见 [终端设置](../platform/terminal-setup)。

## 14. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 配置文件 | `~/.pi/agent/keybindings.json`，改完 `/reload` |
| 覆盖语义 | 用户绑定**替换**默认，不是追加 |
| 命名空间 | `tui.*` 是编辑器/UI 层，`app.*` 是应用层 |
| 平台差异 | Windows/WSL 上 `alt+v`、`ctrl+q`、`alt+q`、`ctrl+z` 各有不同 |
| 值得自己绑 | `app.session.new/tree/fork/resume` 默认无键 |

## 下一步

→ [会话管理](./sessions) — 会话存在哪、怎么恢复、树结构与分支怎么用
