---
title: Pi 使用指南
description: Pi Coding Agent 的安装、配置与日常使用
---

# Pi 使用指南

这一板块讲**怎么用 Pi**：装上、登录、跑起来、配置成自己顺手的样子。

它不讲 Pi 的源码实现——那是 [Pi 源码深入](/pi/source/) 的事；也不讲 Agent 的原理——那是 [Learn Agent](/learn/) 的事。

:::info 版本基准

本板块以 **Pi v0.84.3** 为基准（本机源码 `packages/coding-agent/docs/`）。

Pi 上游约每天 20+ 次提交，指南类内容最容易过期。凡是与官方文档不一致的地方，**以官方文档为准**：[官方文档站](https://pi-doc.com/docs/latest/) ｜ [GitHub docs 目录](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs)

:::

## 1. 三条阅读路线

不同目的读不同的部分，不需要按顺序全读：

```
我想先跑起来
  └→ 快速开始 → 使用 Pi → Providers

我想调成顺手的样子
  └→ 设置 → 快捷键 → 自定义扩展点 → 会话管理 / 上下文压缩

我想把 Pi 接进自己的程序
  └→ SDK → RPC 模式 → JSON 模式 → 会话文件格式
```

## 2. 目录

### 从这里开始

| 页面 | 解决什么问题 |
|---|---|
| [快速开始](./getting-started/quickstart) | 装上、登录、跑通第一个会话 |
| [使用 Pi](./getting-started/usage) | 交互模式、斜杠命令、消息队列、CLI 全参数 |
| [Providers](./getting-started/providers) | 订阅登录、API Key、云厂商、凭据解析顺序 |
| [安全模型](./getting-started/security) | Pi 默认能做什么，边界在哪，怎么加固 |
| [设置](./getting-started/settings) | `settings.json` 全部字段与优先级 |
| [快捷键](./getting-started/keybindings) | 默认快捷键与自定义 |
| [会话管理](./getting-started/sessions) | 保存、恢复、分支、导出 |
| [上下文压缩](./getting-started/compaction) | 上下文满了会发生什么，怎么控制 |

### 自定义

| 页面 | 解决什么问题 |
|---|---|
| [自定义速查](./customization) | Extension / Skill / Prompt Template / Theme / Package 分别是什么、什么时候用 |

### 参考

| 页面 | 解决什么问题 |
|---|---|
| [会话文件格式](./reference/session-format) | JSONL 里每一行是什么 |
| [环境变量](./reference/environment-variables) | 所有 `PI_*` 与凭据变量 |

### 编程式使用

| 页面 | 解决什么问题 |
|---|---|
| [SDK](./programmatic/sdk) | 在自己的 Node 程序里嵌入 Pi |
| [RPC 模式](./programmatic/rpc) | 用子进程 + JSONL 协议驱动 Pi |
| [JSON 模式](./programmatic/json) | 一次性任务的结构化输出 |
| [TUI](./programmatic/tui) | 复用 Pi 的终端 UI 组件 |

### 平台

| 页面 | 解决什么问题 |
|---|---|
| [Windows](./platform/windows) | Windows 下的差异与坑 |
| [容器化](./platform/containerization) | 三种隔离模式的边界 |
| [终端设置](./platform/terminal-setup) | 各终端的按键与图片支持 |
| [Shell 别名](./platform/shell-aliases) | 常用别名 |

## 3. 一句话认识 Pi

:::tip 设计取向

Pi 把核心做小，把工作流推到扩展里。它**故意不内置** MCP、sub-agents、权限弹窗、plan mode、to-dos、后台 bash 这六项——需要就自己写扩展或装包。

出处：`packages/coding-agent/docs/usage.md:304` Design Principles 小节，六项清单在 `usage.md:308`

:::

这条原则解释了后面很多"为什么没有 XX 功能"的疑问，也是本项目 [实验室](/pi/lab/) 选题的直接依据。

## 下一步

→ [快速开始](./getting-started/quickstart) — 从 npm 安装到第一个可用会话
