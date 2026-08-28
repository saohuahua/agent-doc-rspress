---
title: 02 输入如何进入 Agent
description: 从最小 prompt(text) 到 Pi 的四阶段输入管线，以及消息为什么要分三层
---

# 02 输入如何进入 Agent

以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准。本章所有 `file:line` 经 `pnpm check:refs` 校验，代码块里的中文注释为本文补充。

## 本章的起点

这里假设你已经知道：Agent 的基本结构是"模型决策 → 工具执行 → 结果回填 → 再次决策"，`messages`、tool call、tool result、流式、上下文窗口这些概念不需要再解释，最小 Agent 用一个 `while (true)` 就能跑起来（[Learn 02](/learn/02-minimal-loop)、[Learn 04](/learn/04-message-and-context)）。

本章不重复这些，它回答的是下一组问题：**把最小实现做成真实产品之后，用户在输入框里敲下的那行字，到变成 provider 的 HTTP body 之前，还需要经过什么，以及每一步为什么放在那个位置。**

## 贯穿场景

02、03 两章用同一个任务：

```text
修复 src/api.ts 的类型错误，并运行测试确认修复结果。
```

本章追踪它从字符串变成请求体的过程，[第 03 章](../03-agent-loop/)接着追踪模型拿到它之后的循环。

## 一、最小输入管线是怎么长成 Pi 的

最小实现只有三步：把文本包成 user 消息、推进 `messages`、调用 Agent。之所以不够用，是因为真实产品里这三步各自都被现实撞出了缺口。

```text
  最小输入管线
  prompt(text) → messages.push(user) → agent.prompt()
       │
       ├─ 问题 A：输入不一定是给模型的问题
       │     用户可能想打开设置、跑一条 shell、切模型
       │     → 阶段 1  输入分类
       │
       ├─ 问题 B：用户敲的字不一定是最终要发的文本
       │     /review 可能是命令、模板或 skill；扩展可能要改写
       │     → 阶段 2  文本变换
       │
       ├─ 问题 C：这一刻不一定能发
       │     agent 正在跑、压缩正在跑、没模型、没凭据、上下文快满
       │     → 阶段 3  运行前保护
       │
       └─ 问题 D：内部消息发不出去
             Pi 有 bashExecution / 摘要 / custom，provider 只认三种角色
             → 阶段 4  上下文与 Provider 装配

  ────────────────────────────────────────────────────────────
  最终结构：四个阶段串成一条管线，前三段在 Pi 自己的进程里，
            第四段负责把领域模型降级成某一家厂商的请求体。
```

**阅读路线**：先记住四个阶段和它们各自要解决的问题，再去看 Pi 把哪些具体机制放进了哪个阶段。前三个阶段的实现集中在 `AgentSession` 和 TUI 里，见 [02.1](./gates)；第四个阶段横跨循环层与模型层，见 [02.2](./assembly)。源码里那份十四项的完整清单是这四个阶段的展开，不必当成入门的心智模型。

## 二、四个阶段

| 阶段 | 解决的问题 | 典型动作 | 失败时的表现 |
|---|---|---|---|
| 1 输入分类 | 这行字是不是给模型的 | 内置命令、`!` shell、扩展命令 | 命令被当成普通消息发给模型 |
| 2 文本变换 | 要发的最终文本是什么 | 扩展 `input`、skill 展开、模板展开 | 模型收到一条像命令但不是命令的字符串 |
| 3 运行前保护 | 现在能不能发 | 压缩互斥、排队、模型与认证校验、压缩检查 | 会话里留下半条消息，或直接撞上上下文溢出 |
| 4 上下文与装配 | 发出去应该长什么样 | `transformContext` → `convertToLlm` → payload | 自定义消息类型被 provider 拒绝 |

## 三、最小 `prompt(text)`

把四个阶段压成一段可读的骨架，大致是这样：

```typescript title="教学示例，非 Pi 源码" {2,4-5,7-8}
async function prompt(text: string) {
  if (isCommand(text)) return executeCommand(text);      // 阶段 1 输入分类

  const expanded = expandPrompt(text);                   // 阶段 2 文本变换
  if (agent.isRunning) return agent.steer(expanded);     // 阶段 3 运行状态

  assertModelAndAuth();                                  // 阶段 3 运行前校验
  await compactIfNeeded();

  const message = createUserMessage(expanded);           // 阶段 4 交给下游装配
  await agent.prompt(message);
}
```

后面每讲一个 Pi 的机制，都会说明它落在这个骨架的哪一步。

## 四、Pi 比这个骨架多做了什么

| 阶段 | 骨架里的一行 | Pi 实际做的 | 展开位置 |
|---|---|---|---|
| 1 | `isCommand(text)` | TUI 先处理 26 条内置命令与 `!` shell；`AgentSession` 再查扩展命令注册表 | [02.1 §一](./gates) |
| 2 | `expandPrompt(text)` | 扩展 `input` 事件（可改写、可吃掉）→ skill 展开 → 模板展开，三者顺序固定 | [02.1 §二](./gates) |
| 3 | `agent.isRunning` | 分成 steering 与 follow-up 两个队列，排的是展开后的快照 | [02.1 §三](./gates) |
| 3 | `assertModelAndAuth()` | 区分 OAuth 过期与 API Key 缺失，两条不同的修复路径 | [02.1 §四](./gates) |
| 3 | `compactIfNeeded()` | 依据是上一条 assistant 回执带回来的 usage，不是本地估算 | [02.1 §四](./gates) |
| 4 | `agent.prompt(message)` | `AgentMessage → Message → Provider Payload` 三层降级，外加三个扩展挂点 | [02.2](./assembly) |

## 五、本章导航

- [02.1 输入管线：从骨架到四阶段处理](./gates) —— 前三个阶段的实现、取舍与排查入口
- [02.2 从领域消息到 Provider Payload](./assembly) —— 第四个阶段，三层数据结构的边界设计

## 六、Pi 没有解决的

**命令命名冲突没有仲裁。** 内置命令、扩展命令、skill、模板共用 `/` 前缀，按固定顺序先到先得，冲突时不告警。

**展开失败是静默的。** 名字写错会退回原文继续发，模型收到一条像命令的普通文本。

**输入层不构成安全边界。** `input` 事件只能改文本。模型能不能读 `.env`，取决于工具层的实现（[第 04 章](../04-tool-system/)）和扩展层的拦截（[第 09 章](../09-extension-system)）。

**压缩判断依赖上一条回执。** 会话刚 resume、还没有 assistant 消息时这一轮不检查，靠的是发出去之后的溢出恢复兜底。

**最后一个 payload 钩子会泄漏 provider 细节。** `compat` 收敛了协议差异（第 08 章），但那个钩子的位置在收敛之后。

## 七、未验证与推断

- ✅ 四个阶段的划分与顺序、每处判断条件、三层消息降级，均读源码得出并经 `check:refs` 校验
- ⚠️ 四阶段是本文对源码的归纳，Pi 源码里没有对应的显式分层命名
- ⚠️ "内置命令 → 扩展命令 → skill → 模板"的冲突优先级从代码顺序推出，未构造同名冲突实测
- ❌ 未实跑打点验证各阶段的耗时分布

## 八、小结

- 最小输入管线的三步分别被四类现实问题撞出缺口，Pi 的输入链路就是补这四个缺口的结果
- 阶段 1 决定"是不是给模型的"，阶段 2 决定"最终发什么文本"，阶段 3 决定"现在能不能发"，阶段 4 决定"发出去长什么样"
- 前三个阶段发生在 Pi 自己的进程里，第四个阶段才开始迁就 provider
- 三处快速失败（压缩互斥、无模型、无凭据）都排在消息进数组之前，目的是失败后会话里不留残骸
- 压缩检查看的是上一条 assistant 的 usage，因为循环层没有"发之前问额度"的能力

:::details 面试对应（§12 编号）

- **#1 AI Coding 整体的实现思路是什么** —— 用四阶段管线回答"用户输入之后发生了什么"，比逐个罗列函数更容易讲清楚
- **#2 怎么保证执行过程中的准确性和可靠性** —— 快速失败的三个位置、以及为什么校验要排在消息落库之前

:::

## 下一步

→ [02.1 输入管线：从骨架到四阶段处理](./gates)
