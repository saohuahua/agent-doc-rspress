---
title: 设置
description: settings.json 的全部字段、默认值、优先级与项目级覆盖
---

# 设置

Pi 用 JSON 配置文件，**项目设置覆盖全局设置**。

| 位置 | 作用范围 |
|---|---|
| `~/.pi/agent/settings.json` | 全局（所有项目） |
| `.pi/settings.json` | 项目（当前目录） |

可以直接编辑文件，也可以用 `/settings` 改常用项。

这一页是**字段速查表**。按需检索，不必通读。

## 1. 覆盖规则

项目设置覆盖全局设置，**嵌套对象是合并而不是整体替换**：

```json title="~/.pi/agent/settings.json（全局）"
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 16384 }
}
```

```json title=".pi/settings.json（项目）"
{
  "compaction": { "reserveTokens": 8192 }
}
```

```json title="最终生效" {3}
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 8192 }
}
```

:::warning 数组是替换不是合并

`defaultTools` 这类数组字段，项目值会**整体替换**全局值。

:::

有几个字段标注了"仅全局"，写在项目设置里不生效：`defaultProjectTrust`、`httpProxy`。

## 2. 模型与思考

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultProvider` | string | - | 默认 Provider，如 `"anthropic"`、`"openai"` |
| `defaultModel` | string | - | 默认模型 ID |
| `defaultThinkingLevel` | string | - | `"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` |
| `hideThinkingBlock` | boolean | `false` | 隐藏输出中的 thinking block |
| `showCacheMissNotices` | boolean | `false` | 显示 prompt 缓存大量未命中、以及压缩/分支摘要用量的提示 |
| `thinkingBudgets` | object | - | 每个 thinking level 的自定义 token 预算 |
| `enabledModels` | string[] | - | Ctrl+P 循环用的模型 pattern，格式同 `--models` |

```json title="thinkingBudgets"
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

Anthropic、Google、Bedrock 原生使用这些预算。OpenAI 兼容模型只在设置了 `compat.thinkingTokenBudgetField`（或 `supportsThinkingTokenBudget`）时才使用。

```json title="enabledModels"
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

## 3. 界面与显示

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `theme` | string | `"dark"` | 主题名（`"dark"`、`"light"` 或自定义） |
| `externalEditor` | string | `$VISUAL` → `$EDITOR` → Windows 上 Notepad / 其他 nano | Ctrl+G 打开的编辑器，优先级高于环境变量 |
| `quietStartup` | boolean | `false` | 隐藏启动头部 |
| `defaultProjectTrust` | string | `"ask"` | 项目信任回退行为：`"ask"`、`"always"`、`"never"`。**仅全局** |
| `collapseChangelog` | boolean | `false` | 更新后显示精简版 changelog |
| `enableInstallTelemetry` | boolean | `true` | 首次安装/检测到更新后发送匿名版本 ping |
| `enableAnalytics` | boolean | `false` | 选择加入的分析数据共享 |
| `trackingId` | string | - | 分析标识，开启 `enableAnalytics` 时生成 |
| `doubleEscapeAction` | string | `"tree"` | 双击 Esc 的行为：`"tree"`、`"fork"`、`"none"` |
| `treeFilterMode` | string | `"default"` | `/tree` 默认过滤：`"default"`、`"no-tools"`、`"user-only"`、`"labeled-only"`、`"all"` |
| `editorPaddingX` | number | `0` | 输入编辑器水平内边距（0-3） |
| `outputPad` | number | `1` | 消息与 thinking 的水平内边距（0 或 1） |
| `autocompleteMaxVisible` | number | `5` | 补全下拉可见条数（3-20） |
| `showHardwareCursor` | boolean | `false` | 显示终端硬件光标以支持输入法 |
| `tuiMode` | string | `"regular"` | `"regular"` 或实验性的 `"fullscreen"`；`--tui-mode` 在启动时覆盖它 |
| `fullscreenExitOutput` | string | `"transcript"` | 退出全屏时：`"transcript"` 打印完整对话，`"resume-hint"` 只打印恢复提示 |
| `fullscreenScrollbar` | string | `"auto"` | 全屏滚动条：`"auto"`、`"always"`、`"hidden"` |

```json title="VS Code 作为外部编辑器" {2}
{
  "externalEditor": "code --wait"
}
```

:::warning 一定要加 `--wait`

否则 `code` 立刻返回，Pi 会以为你编辑完了。

:::

### 遥测与更新检查

| 想关掉什么 | 怎么做 |
|---|---|
| 匿名安装/更新 ping | `enableInstallTelemetry: false` |
| Pi 版本更新检查 | `PI_SKIP_VERSION_CHECK=1` |
| **全部启动期网络操作** | `--offline` 或 `PI_OFFLINE=1` |

:::info 关遥测 ≠ 关更新检查

`enableInstallTelemetry` 只控制发往 `pi.dev/api/report-install` 的 ping。关掉它之后，Pi 仍可能请求 `pi.dev/api/latest-version` 检查新版本。要全断网只能用 `--offline`。

:::

## 4. 网络

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `httpProxy` | string | - | 代理 URL，会同时作为 `HTTP_PROXY` 和 `HTTPS_PROXY` 应用。**仅全局** |

```json
{ "httpProxy": "http://127.0.0.1:7890" }
```

## 5. 上下文压缩

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `compaction.enabled` | boolean | `true` | 启用自动压缩 |
| `compaction.reserveTokens` | number | `16384` | 为 LLM 回复预留的 token |
| `compaction.keepRecentTokens` | number | `20000` | 保留不被摘要的最近 token 数 |

机制详解见 [上下文压缩](./compaction)。

## 6. 分支摘要

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `branchSummary.reserveTokens` | number | `16384` | 为分支摘要预留的 token |
| `branchSummary.skipPrompt` | boolean | `false` | `/tree` 导航时跳过"是否总结分支"的提问（跳过即不生成摘要） |

## 7. 重试

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `retry.enabled` | boolean | `true` | 瞬时错误时启用 Agent 级自动重试 |
| `retry.maxRetries` | number | `3` | Agent 级最大重试次数 |
| `retry.baseDelayMs` | number | `2000` | Agent 级指数退避基数（2s、4s、8s） |
| `retry.provider.timeoutMs` | number | SDK 默认 | Provider/SDK 请求超时（毫秒） |
| `retry.provider.maxRetries` | number | `0` | Provider/SDK 重试次数 |
| `retry.provider.maxRetryDelayMs` | number | `60000` | 服务端要求的最大等待时间，超过则直接失败 |

```json title="完整示例"
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "provider": {
      "timeoutMs": 3600000,
      "maxRetries": 0,
      "maxRetryDelayMs": 60000
    }
  }
}
```

:::danger 不要随便调高 `retry.provider.maxRetries`

官方建议保持 `0`。设成大于 0 时，SDK/Provider 层的重试会在 Pi 看到错误**之前**先处理掉"超出用量限制"类错误——结果是 Agent 一直卡住，直到 Provider 配额重置。

另外，当 Provider 要求的重试延迟超过 `maxRetryDelayMs` 时，请求会立刻带着明确错误失败，而不是默默等待。设为 `0` 可以取消这个上限。

:::

:::tip 这条对面试有用

"你的 AI Coding 过程为什么跑这么久？" —— Agent 级重试 3 次指数退避（2s/4s/8s）、Provider 侧要求的长延迟、以及压缩带来的额外 LLM 调用，都是可查证的耗时来源。

:::

## 8. 消息投递

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `steeringMode` | string | `"one-at-a-time"` | Steering 消息投递方式：`"all"` 或 `"one-at-a-time"` |
| `followUpMode` | string | `"one-at-a-time"` | Follow-up 消息投递方式：`"all"` 或 `"one-at-a-time"` |
| `transport` | string | `"auto"` | 支持多传输的 Provider 用哪种：`"sse"`、`"websocket"`、`"websocket-cached"`、`"auto"` |
| `httpIdleTimeoutMs` | number | `300000` | HTTP 头/体空闲超时（毫秒），`0` 表示禁用 |
| `websocketConnectTimeoutMs` | number | `15000` | WebSocket 握手超时（毫秒），`0` 表示禁用 |

## 9. 终端与图片

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `terminal.showImages` | boolean | `true` | 终端支持时显示图片 |
| `terminal.imageWidthCells` | number | `60` | 内联图片的首选宽度（终端字符格） |
| `terminal.clearOnShrink` | boolean | `false` | 内容变短时清除空行（可能闪烁） |
| `images.autoResize` | boolean | `true` | 图片缩放到最大 2000×2000，作用于 `@file`、`read` 和工具返回的图片 |
| `images.blockImages` | boolean | `false` | 禁止所有图片发给 LLM |

## 10. Shell

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `shellPath` | string | - | 自定义 shell 路径（如 Windows 上的 Cygwin），支持以 `~` 开头 |
| `shellCommandPrefix` | string | - | 每条 bash 命令的前缀，如 `"shopt -s expand_aliases"` |
| `npmCommand` | string[] | - | npm 查询/安装操作使用的命令 argv |

```json title="Windows：JSON 里的路径必须用正斜杠或转义反斜杠"
{ "shellPath": "C:/Program Files/Git/bin/bash.exe" }
```

```json title="用 mise 管理的 node 跑 npm"
{ "npmCommand": ["mise", "exec", "node@20", "--", "npm"] }
```

`npmCommand` 用于所有 npm 包管理操作，包括安装、卸载，以及 git 包内部的依赖安装。包的安装位置：用户级在 `~/.pi/agent/npm/`，项目级在 `.pi/npm/`。配置了 `npmCommand` 后，git 包的依赖安装会用最朴素的 `install`，以避免包装器或其他包管理器不认识 npm 专有参数。

## 11. 工具

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultTools` | string[] | - | 启动时启用的内置工具；省略时用 Pi 的标准默认值 |

可选内置工具：`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`。

```json title="macOS / Linux"
{ "defaultTools": ["bash", "edit", "write"] }
```

```json title="Windows：用 powershell 代替 bash"
{ "defaultTools": ["read", "powershell", "edit", "write"] }
```

`defaultTools` 只影响内置工具，扩展和 SDK 自定义工具照常启用。空数组表示不启用任何内置工具，但保留扩展/SDK 工具。

与 CLI 参数的关系：

| 手段 | 效果 |
|---|---|
| `defaultTools` | 选择启动时启用哪些内置工具 |
| `--tools` | **严格白名单**，覆盖上面的行为，作用于所有工具 |
| `--no-tools` | 禁用所有工具 |
| `--no-builtin-tools` | 禁用内置默认工具 |
| `--exclude-tools` | 在最终结果上做过滤 |

## 12. 会话

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `sessionDir` | string | - | 会话文件存储目录，支持绝对路径、相对路径和 `~` |

```json
{ "sessionDir": ".pi/sessions" }
```

多个来源同时指定时，优先级为：`--session-dir` > `PI_CODING_AGENT_SESSION_DIR` > `settings.json` 的 `sessionDir`。

## 13. Markdown

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `markdown.codeBlockIndent` | string | `"  "` | 代码块缩进 |
| `markdown.mermaid` | string | `"streaming"` | Mermaid 渲染模式：`"off"`、`"final"`、`"streaming"` |

## 14. 资源加载

这组设置决定从哪里加载扩展、Skill、Prompt 模板和主题。

:::info 相对路径的基准不同

`~/.pi/agent/settings.json` 里的路径相对于 `~/.pi/agent`；
`.pi/settings.json` 里的路径相对于 `.pi`。
绝对路径和 `~` 都支持。

:::

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `packages` | array | `[]` | 要加载资源的 npm/git 包 |
| `extensions` | string[] | `[]` | 本地扩展文件或目录 |
| `skills` | string[] | `[]` | 本地 Skill 文件或目录 |
| `prompts` | string[] | `[]` | 本地 Prompt 模板文件或目录 |
| `themes` | string[] | `[]` | 本地主题文件或目录 |
| `enableSkillCommands` | boolean | `true` | 把 Skill 注册成 `/skill:name` 命令 |

数组支持 glob 和排除：

| 前缀 | 含义 |
|---|---|
| `!pattern` | 排除匹配项 |
| `+path` | 强制包含某个精确路径 |
| `-path` | 强制排除某个精确路径 |

### packages 的两种写法

```json title="字符串形式：加载包内全部资源"
{ "packages": ["pi-skills", "@org/my-extension"] }
```

```json title="对象形式：只加载指定资源" {5-6}
{
  "packages": [
    {
      "source": "pi-skills",
      "skills": ["brave-search", "transcribe"],
      "extensions": []
    }
  ]
}
```

对象形式在审查第三方包时很有用——**只放行你看过的那部分资源**，把 `extensions` 显式设成 `[]` 可以拒绝执行包内扩展代码。

## 15. 完整示例

```json title="~/.pi/agent/settings.json"
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "warnings": {
    "anthropicExtraUsage": true
  },
  "packages": ["pi-skills"]
}
```

其中 `warnings.anthropicExtraUsage`（boolean，默认 `true`）控制：使用 Anthropic 订阅认证、可能产生付费 extra usage 时是否给出警告。

## 16. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 优先级 | 项目 > 全局；对象合并，数组替换 |
| 仅全局字段 | `defaultProjectTrust`、`httpProxy` |
| 别乱调 | `retry.provider.maxRetries` 保持 `0` |
| 断网 | 只有 `--offline` / `PI_OFFLINE=1` 是彻底的 |
| 收工具 | `defaultTools` 是默认值，`--tools` 是硬白名单 |

## 下一步

→ [快捷键](./keybindings) — 默认按键、冲突处理与自定义
