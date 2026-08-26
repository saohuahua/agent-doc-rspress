---
title: Learn Agent
description: 从零开始理解 Agent 的核心概念
---

# Learn Agent

本系列面向会写代码但不了解 Agent 的读者。每篇只增加一个认知点，用最小例子讲原理。

## 阅读顺序

| 章节 | 核心问题 |
|---|---|
| [01 普通聊天 vs Agent](./01-what-is-agent) | LLM 已经很强了，为什么还需要 Agent？ |
| [02 最小 Agent Loop](./02-minimal-loop) | 循环具体长什么样？ |
| [03 工具的定义与执行](./03-tool-basics) | `tool.execute()` 具体是什么？ |
| [04 消息、角色与上下文窗口](./04-message-and-context) | `messages` 到底是什么结构？ |
| [05 流式输出与事件](./05-streaming-and-events) | LLM 的回答是一次性返回的吗？ |
| [06 多轮交互与用户插队](./06-multi-turn) | Agent 工作时用户能打断吗？ |
| [07 副作用与安全边界](./07-side-effects-and-safety) | Agent 能执行 `rm -rf /` 吗？ |
| [08 会话保存与恢复](./08-session-and-persistence) | 关掉终端，对话就丢了吗？ |

## 读完后

每篇结尾都标注了对应概念在 Pi 中的位置。读完基础后，可以进入 [Pi 源码深入](/pi/source/) 看真实实现。
