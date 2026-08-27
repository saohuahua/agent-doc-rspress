---
title: Shell 别名
description: 让 Agent 执行的 bash 命令也能用上你的别名
---

# Shell 别名

## 1. 问题

Pi 以**非交互模式**运行 bash（`bash -c`），而非交互 bash **默认不展开别名**。

所以你在 `~/.zshrc` 里定义的 `gs`、`ll`、`k` 之类，模型执行时会直接报 `command not found`。

## 2. 解法

给每条 bash 命令加一个前缀：

```json title="~/.pi/agent/settings.json"
{
  "shellCommandPrefix": "shopt -s expand_aliases\neval \"$(grep '^alias ' ~/.zshrc)\""
}
```

两句话分别做的事：

| 语句 | 作用 |
|---|---|
| `shopt -s expand_aliases` | 在非交互 bash 中打开别名展开 |
| `eval "$(grep '^alias ' ~/.zshrc)"` | 从配置文件里抓出所有 `alias` 行并执行 |

把 `~/.zshrc` 换成你实际的 shell 配置文件（`~/.bashrc`、`~/.bash_profile` 等）。

## 3. 注意

:::warning 这个前缀会加在**每一条** bash 命令上

`shellCommandPrefix` 的开销会乘以命令数量。用 `grep '^alias '` 而不是直接 `source ~/.zshrc`，就是为了避免把整个配置文件（可能包含 nvm 初始化、补全脚本等）每次都跑一遍。

:::

:::tip 别在别名里藏危险操作

模型看到的是它自己写的命令（比如 `gp`），看不到别名展开后的真实内容。如果 `gp` 是 `git push --force`，模型无法判断风险，你也很难在事后从会话记录里看出发生了什么。

风险高的操作建议保持全写。

:::

## 4. 相关设置

| 设置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `shellCommandPrefix` | string | - | 每条 bash 命令的前缀 |
| `shellPath` | string | - | 自定义 shell 路径，支持以 `~` 开头 |

## 5. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 原因 | `bash -c` 不展开别名 |
| 解法 | `shellCommandPrefix` + `shopt -s expand_aliases` |
| 性能 | 只 grep alias 行，不要 source 整个配置 |
| 安全 | 危险命令别做成别名 |

## 下一步

→ 回到 [Pi 使用指南](../) 总览，或前往 [Pi 原理](/pi/principle/)
