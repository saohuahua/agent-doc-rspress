---
title: 记录模板
description: 单次使用记录的固定结构
---

# 记录模板

复制下面整块到 `docs/practice/YYYY-MM-DD-任务名.md`，填完即可。

**填写原则**：宁可写「未测量」，不要写模糊形容词。

## 模板

````markdown
---
title: YYYY-MM-DD 任务名
description: 一句话结论
---

# YYYY-MM-DD 任务名

## 1. 任务

具体做了什么。要能让半年后的自己看懂，也要能在面试时直接念出来。

反例：让它改代码
正例：给 rspress 站点的 20 个页面批量补 frontmatter，并修掉 4 处失效的相对链接

## 2. 环境

| 项 | 值 |
|---|---|
| Pi 版本 | v0.84.3 |
| 模型 | provider / model-id |
| thinking level | off / minimal / low / medium / high / xhigh / max |
| 启用工具 | read, bash, edit, write（或 `--tools` 的实际值） |
| 上下文文件 | 有 / 无 AGENTS.md |
| 会话文件 | `~/.pi/agent/sessions/.../xxx.jsonl` |

## 3. 过程

| 指标 | 值 | 来源 |
|---|---|---|
| 墙钟时长 | — | 秒表 / 事件时间戳 |
| turn 数 | — | `jq 'select(.type=="turn_start")' \| wc -l` |
| 工具调用次数 | — | `tool_execution_start` 计数 |
| 总 token | — | 底栏 / `/session` |
| 成本 | — | 底栏 / `/session` |
| 触发压缩 | 是 / 否，几次 | `compaction_start` |
| 触发重试 | 是 / 否，几次 | `auto_retry_start` |
| 中止过 | 是 / 否 | 自己是否按了 Esc |

时间线（只记转折点，不流水账）：

```text
00:00  发出任务
00:0X  读了 N 个文件后开始改
0X:XX  卡在 XXX，我用 steering 纠正
XX:XX  完成
```

## 4. 结果

- 可用 / 部分可用 / 不可用
- 返工次数：
- 我手动改了什么：

## 5. 出问题的地方

| 现象 | 我当时的判断 | 实际原因 | 怎么确认的 |
|---|---|---|---|
| | | | |

## 6. 结论

- 下次要改的一件事：
- 是否值得写成扩展 / Skill / Prompt 模板：
- **未验证 / 未测量的项**：

````

## 关于第 3 节指标的采集

一次性任务最省事的做法是直接导出事件流：

```bash
pi --mode json "任务描述" > run.jsonl 2>run.err
```

```bash title="一把梭统计"
echo "turns:  $(jq -c 'select(.type=="turn_start")' run.jsonl | wc -l)"
echo "tools:  $(jq -c 'select(.type=="tool_execution_start")' run.jsonl | wc -l)"
echo "compact:$(jq -c 'select(.type=="compaction_start")' run.jsonl | wc -l)"
echo "retry:  $(jq -c 'select(.type=="auto_retry_start")' run.jsonl | wc -l)"
```

交互模式下没有事件流，就用 `/session` 读数，并在结束时截一张底栏。

:::warning 单次数据不等于结论

一次跑得快可能只是任务简单或缓存命中。想写进简历的效率数字，**至少要有同一任务的对照组**（比如自己手写 vs Pi 完成），并且明确标注样本量。

:::

## 下一步

→ 回到 [使用记录](./) 索引
