---
title: 快速开始
description: 从安装到第一个可用的 Pi 会话
---

# 快速开始

这一篇的目标很具体：**在你自己的项目里跑通第一个 Pi 会话**，并且知道它能碰你哪些文件。

全程约 5 分钟，分四步：装 → 登录 → 提问 → 告诉它项目规矩。

## 1. 全景图

```
┌─────────────────────────────────────────────────────────┐
│ 1. 安装                                                  │
│    npm install -g --ignore-scripts @earendil-works/...   │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. 认证（二选一）                                          │
│    订阅登录 /login        ← Claude Pro / ChatGPT / Copilot│
│    API Key   export ...   ← ANTHROPIC_API_KEY 等          │
│    凭据落到 ~/.pi/agent/auth.json（0600）                  │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. 在项目目录启动                                          │
│    cd /path/to/project && pi                             │
│    默认工具: read / write / edit / bash                   │
│    工作目录 = 当前目录，文件会被真的改掉                     │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 4. 给它项目规矩                                            │
│    AGENTS.md → 启动时自动加载进 system prompt              │
└─────────────────────────────────────────────────────────┘
```

## 2. 安装

Pi 以 npm 包形式发布：

```bash title="安装"
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 会禁用依赖的生命周期脚本。普通 npm 安装下 Pi 不需要任何 install script，所以加上它更安全。

:::warning 环境要求

Pi 要求 **Node.js >= 22.19.0**（`package.json` 的 `engines.node`）。低版本会直接启动失败。

:::

卸载时用当初安装它的包管理器。curl 安装脚本走的也是全局 npm，所以两者都用 npm 卸载：

```bash title="卸载"
# curl 安装脚本 或 npm install -g
npm uninstall -g @earendil-works/pi-coding-agent

# pnpm
pnpm remove -g @earendil-works/pi-coding-agent

# Yarn
yarn global remove @earendil-works/pi-coding-agent

# Bun
bun uninstall -g @earendil-works/pi-coding-agent
```

卸载**不会**删除 `~/.pi/agent/` 下的设置、凭据、会话和已安装的 pi 包。想彻底清理需要手动删这个目录。

## 3. 认证

Pi 支持两类认证：订阅制走 OAuth，API Key 走环境变量或凭据文件。

### 方式一：订阅登录

先启动 Pi，然后在编辑器里输入：

```text
/login
```

再选择 Provider。内置的订阅登录包括 Claude Pro/Max、ChatGPT Plus/Pro (Codex)、GitHub Copilot 等。

### 方式二：API Key

启动前设置环境变量即可：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

也可以运行 `/login` 选一个 API Key 类型的 Provider，把 Key 存进 `~/.pi/agent/auth.json`。

:::tip 完整的 Provider 列表

30+ 个 Provider 的环境变量名、`auth.json` 键名、云厂商配置见 [Providers](./providers)。

:::

## 4. 第一个会话

进入项目目录启动：

```bash
cd /path/to/project
pi
```

输入一个请求然后回车：

```text
Summarize this repository and tell me how to run its checks.
```

默认情况下，Pi 给模型**四个工具**：

| 工具 | 作用 | 风险 |
|---|---|---|
| `read` | 读文件 | 低 |
| `write` | 创建或覆盖文件 | **高** |
| `edit` | 修改文件的一部分 | **高** |
| `bash` | 执行 shell 命令 | **高** |

另外三个只读工具 `grep`、`find`、`ls` 需要通过工具选项显式启用（见 [使用 Pi § 工具选项](./usage#7-cli-参考)）。

:::warning 它会真的改你的文件

Pi 运行在当前工作目录，`write` / `edit` / `bash` 都是真实副作用，**没有内置的撤销**。

官方建议：用 git 或其他 checkpoint 手段兜底。想先只读地试，用
`pi --tools read,grep,find,ls -p "Review the code"`。

:::

## 5. 给项目定规矩

Pi 启动时会加载上下文文件。在项目里放一个 `AGENTS.md` 告诉它怎么干活：

```markdown title="AGENTS.md"
# Project Instructions

- Run `npm run check` after code changes.
- Do not run production migrations locally.
- Keep responses concise.
```

Pi 会按下面的顺序层叠加载：

| 来源 | 作用范围 |
|---|---|
| `~/.pi/agent/AGENTS.md` | 全局指令 |
| 上层目录的 `AGENTS.md` / `CLAUDE.md` | 从当前目录逐级向上 |
| 当前目录的 `AGENTS.md` / `CLAUDE.md` | 项目级 |
| 某目录下的 `AGENTS.override.md` | **替代**该目录的 `AGENTS.md` / `CLAUDE.md` |

改完上下文文件后需要重启 Pi，或者运行 `/reload`。

## 6. 立刻能用上的几件事

### 引用文件

在编辑器里输入 `@` 可以模糊搜索项目文件，也可以在命令行直接传：

```bash
pi @README.md "Summarize this"
pi @src/app.ts @src/app.test.ts "Review these together"
```

图片和文本可以用 Ctrl+V 粘贴（Windows 上是 Alt+V），支持的终端里也可以直接拖进去。

### 执行 shell 命令

交互模式下：

```text
!npm run lint
```

命令输出会被送进模型上下文。用 `!!command` 则**只执行不入上下文**——想跑个 `git status` 自己看看的时候用这个，省 token。

### 切换模型

| 操作 | 快捷键 |
|---|---|
| 选择模型 | `/model` 或 Ctrl+L |
| 切换思考级别 | Shift+Tab |
| 在预设模型间循环 | Ctrl+P / Shift+Ctrl+P |

### 稍后继续

会话是自动保存的：

```bash
pi -c                  # 继续最近一次会话
pi -r                  # 浏览历史会话并选择
pi --name "my task"    # 启动时指定会话显示名
pi --session <path|id> # 打开指定会话
```

进入 Pi 之后，用 `/resume`、`/new`、`/tree`、`/fork`、`/clone` 管理会话。

### 一次性任务

```bash
pi -p "Summarize this codebase"
cat README.md | pi -p "Summarize this text"
pi -p @screenshot.png "What's in this image?"
```

`--mode json` 输出 JSON 事件流，`--mode rpc` 用于进程集成。

## 7. 本篇小结

| 你现在应该知道 | 关键点 |
|---|---|
| 怎么装 | `npm i -g --ignore-scripts`，Node >= 22.19 |
| 凭据在哪 | `~/.pi/agent/auth.json`，权限 0600 |
| 它能碰什么 | 当前工作目录，默认四个工具含 write/edit/bash |
| 怎么约束它 | `AGENTS.md` + `--tools` 白名单 |
| 会话在哪 | `~/.pi/agent/sessions/`，按工作目录分组 |

## 下一步

→ [使用 Pi](./usage) — 交互模式的四个区域、全部斜杠命令、消息队列，以及 CLI 的完整参数表
