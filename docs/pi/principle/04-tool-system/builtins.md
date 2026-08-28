---
title: 04.3 内置工具的容错与截断
description: 内容层与路径层的模糊匹配、三种截断策略，以及错误消息为什么要写给模型看
---

# 04.3 内置工具的容错与截断

[← 回到 04 总览](./)｜以 **Pi v0.84.3 (+20, `8fa7eebd`)** 源码为基准，代码块里的中文注释为本文补充。

前两页讲的是框架给所有工具的通用保护。这一页讲工具自己要处理的两件事：

- **模型给的字符串不完全对**——`oldText` 里的引号是弯的、文件名的编码不一样
- **工具的输出太大**——一次 `bash npm test` 可能吐几十兆

## 一、八个内置工具

`createAllToolDefinitions`（`packages/coding-agent/src/core/tools/index.ts:182`）注册了八个：

- **只读类**：`read`、`grep`、`find`、`ls`
- **写入类**：`edit`、`write`
- **执行类**：`bash`、`powershell`

默认激活的只有四个：`read`、`bash`、`edit`、`write`（[第 02 章](../02-message-journey/)提到的 `_buildRuntime`）。其余四个要么靠配置打开，要么靠模型自己用 `bash` 里的 `rg`、`fd` 顶替。

这个默认集合本身是个取舍：

- 少给工具 → schema 占的 prompt token 少，模型的选择负担轻
- 但 `grep` / `find` 走 `bash` 的话，输出格式不稳定、跨平台行为不一致

## 二、内容层容错：`edit` 的模糊匹配

### 会遇到什么问题

`edit` 要求 `oldText` 与文件内容**精确匹配**。模型从上一次 `read` 的结果里抄这段文本时，会出现几类稳定的偏差：

- 行尾的空白被吃掉
- 直引号 `'` `"` 变成弯引号 `'` `"`
- 半角连字符 `-` 变成 en-dash `–` 或 em-dash `—`
- 普通空格变成不间断空格 `\u00A0` 或全角空格

这些字符在渲染出来的终端里看起来几乎一样，模型分辨不了。

### Pi 怎么处理

先精确匹配，失败了再在归一化空间里匹配：

```typescript title="packages/coding-agent/src/core/tools/edit-diff.ts:207" {3,8-10,13}
export function fuzzyFindText(content: string, oldText: string): FuzzyMatchResult {
  // Try exact match first
  const exactIndex = content.indexOf(oldText);
  if (exactIndex !== -1) {
    return { found: true, index: exactIndex, matchLength: oldText.length, usedFuzzyMatch: false, contentForReplacement: content };
  }

  // Try fuzzy match - work entirely in normalized space
  const fuzzyContent = normalizeForFuzzyMatch(content);      // 文件内容也归一化
  const fuzzyOldText = normalizeForFuzzyMatch(oldText);      // 模型给的文本也归一化
  const fuzzyIndex = fuzzyContent.indexOf(fuzzyOldText);
  // …找到就返回归一化空间里的下标，调用方在归一化内容上做替换
```

归一化做五件事（`packages/coding-agent/src/core/tools/edit-diff.ts:34`）：

- `NFKC` 规范化
- 逐行 `trimEnd()`，去掉行尾空白
- 四种弯单引号统一成 `'`
- 四种弯双引号统一成 `"`
- 七种破折号统一成 `-`，八种特殊空格统一成普通空格

### 取舍与失败表现

- 换来的是：模型不必逐字节精确复述，`edit` 的一次成功率明显提高
- 代价一：**替换发生在归一化后的内容上**。如果原文件里本来就有弯引号，改完之后那些弯引号会变成直引号——文件被顺手"修正"了，而模型和用户都不知道
- 代价二：`countOccurrences`（`packages/coding-agent/src/core/tools/edit-diff.ts:246`）也在归一化空间里数。原文里两段只有引号形态不同的文本，会被算成"重复两次"从而报错
- 代价三：调试"改出来的代码有奇怪字符"时，这层容错会掩盖模型的真实输出

## 三、路径层容错：`read` 的四级回退

### 会遇到什么问题

用户或模型给的文件名和磁盘上的不完全一致，最典型的是 macOS：

- 文件系统用 NFD（分解）形式存中文和带重音的字母，用户复制出来的是 NFC
- 截图文件名里的 `AM` / `PM` 前面是窄不间断空格 `U+202F`，不是普通空格
- 法语 macOS 的截图名用弯撇号 `U+2019`（`Capture d'écran`），用户敲的是直撇号

### Pi 怎么处理

`resolveReadPath`（`packages/coding-agent/src/core/tools/path-utils.ts:52`）按顺序试四种变体，命中即返回：

- 原样解析的路径
- 把 `空格AM.` / `空格PM.` 换成窄空格版本
- 转成 NFD 形式
- 把直撇号换成 `U+2019`
- 再加一个组合：NFD + 弯撇号（法语截图的常见组合）

都不命中就返回原始解析结果，让后续的 `access()` 去报"文件不存在"。

### 这不是路径安全

名字容易让人误会。`path-utils.ts` 全文 118 行，做的全是**匹配**，没有一行做**边界检查**：

```typescript title="packages/coding-agent/src/core/tools/path-utils.ts:48" {2}
export function resolveToCwd(filePath: string, cwd: string): string {
  return resolvePath(filePath, cwd, { normalizeUnicodeSpaces: true, stripAtPrefix: true });
}
```

它只是"相对路径按 cwd 解析、`~` 展开"。这意味着：

- `read /etc/passwd` 会被正常读出来
- `edit ../../other-project/src/index.ts` 会正常改掉隔壁项目的文件
- `write /usr/local/bin/xxx` 只受操作系统权限限制

**工具层不构成安全边界。** 想限制范围只有两条路：扩展在 `beforeToolCall` 里检查路径（[第 09 章](../09-extension-system)），或者靠容器 / 用户权限（第 10 章）。

## 四、截断：不是丢弃，是留下续读的入口

### 会遇到什么问题

工具输出直接进上下文。一次 `bash npm test` 的输出可能有几万行，一次 `read` 一个 minified 文件可能是一行几 MB。不截断就会：

- 一次调用吃掉整个上下文窗口
- 触发压缩，把真正有用的历史挤掉
- 甚至直接 `stopReason: "length"`（[第 03 章](../03-agent-loop/loop)）

### 阈值

三个全局常量（`packages/coding-agent/src/core/tools/truncate.ts:11`）：

- `DEFAULT_MAX_LINES` = 2000 行
- `DEFAULT_MAX_BYTES` = 50 KB
- `GREP_MAX_LINE_LENGTH` = 500 字符/行

行数和字节数**谁先到算谁**。

### 三种策略

不同工具截掉的位置不一样，取决于"有用的信息在哪一头"：

| 工具 | 策略 | 实现 | 为什么 |
|---|---|---|---|
| `read` / `grep` / `find` / `ls` | 保留**开头** | `truncateHead`（`packages/coding-agent/src/core/tools/truncate.ts:78`） | 文件和列表从头读才有意义 |
| `bash` | 保留**结尾** | `truncateTail`（`packages/coding-agent/src/core/tools/truncate.ts:168`） | 报错信息、测试结果都在最后 |
| `grep` 的单行 | 保留**行首** | `truncateLine`（`packages/coding-agent/src/core/tools/truncate.ts:268`） | 匹配上下文在行首附近 |

### 关键设计：每种截断都附带下一步动作

这是本节最值得学的一点。截断之后，工具不是简单说"内容太长已省略"，而是告诉模型**接下来该怎么拿到剩下的**：

**`read` 给出下一个 offset**

```typescript title="packages/coding-agent/src/core/tools/read.ts:308" {2}
outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines}. Use offset=${nextOffset} to continue.]`;
```

**`read` 遇到超长单行时给出 bash 命令**

```typescript title="packages/coding-agent/src/core/tools/read.ts:300" {2}
outputText = `[Line ${startLineDisplay} is ${firstLineSize}, exceeds ${formatSize(DEFAULT_MAX_BYTES)} limit. Use bash: sed -n '${startLineDisplay}p' ${path} | head -c ${DEFAULT_MAX_BYTES}]`;
```

一行大到 `read` 处理不了时，它直接把可执行的替代命令写给模型。

**`bash` 给出全量输出的临时文件路径**

```typescript title="packages/coding-agent/src/core/tools/bash.ts:426" {6,8}
const formatOutput = (snapshot, emptyText = "(no output)") => {
  const truncation = snapshot.truncation;
  let text = snapshot.content || emptyText;
  if (truncation.truncated) {
    details = { truncation, fullOutputPath: snapshot.fullOutputPath };
    const startLine = truncation.totalLines - truncation.outputLines + 1;
    // …
    text += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines}. Full output: ${snapshot.fullOutputPath}]`;
  }
```

输出超阈值时，`OutputAccumulator` 会把全量内容落到 `tmpdir()` 下的一个 `.log` 文件，路径写进给模型的文本里。模型想看完整日志，就 `read` 那个文件。

**`grep` 指路到 `read`**

```typescript title="packages/coding-agent/src/core/tools/grep.ts:357" {2}
`Some lines truncated to ${GREP_MAX_LINE_LENGTH} chars. Use read tool to see full lines`,
```

### 还有一层：把规则写进工具描述

`bash` 的 `description` 本身就包含截断规则：

> Output is truncated to last 2000 lines or 50KB (whichever is hit first). If truncated, full output is saved to a temp file.

于是模型在**调用之前**就知道会发生什么，而不是等看到截断标记才反应过来。四个只读工具的 description 里也都写了各自的上限。

### 取舍与失败表现

- 换来的是：上下文可控，同时模型总有下一步可走，不会卡在"我看不到剩下的"
- 代价一：阈值是**全局常量**，不能按工具、按模型上下文大小调整。跑 200k 上下文的模型时 50KB 显得保守，跑 32k 的模型时又可能偏大
- 代价二：续读要**多花一轮往返**。一个 6000 行的文件要读三次
- 代价三：`bash` 的临时文件写在 `tmpdir()` 下且不自动清理，长时间运行会积累

## 五、错误消息即提示词

内置工具的报错文本不是写给人看的日志，是写给模型看的**修复指引**。`edit` 的四条最典型：

| 情况 | 消息 | 隐含的指令 |
|---|---|---|
| 找不到 | `Could not find the exact text in {path}. The old text must match exactly including all whitespace and newlines.` | 去重新 `read` 一遍，注意空白 |
| 匹配到多处 | `Found {n} occurrences of the text in {path}. The text must be unique. Please provide more context to make it unique.` | 把 `oldText` 加长 |
| `oldText` 为空 | `oldText must not be empty in {path}.` | 参数写漏了 |
| 替换后无变化 | `No changes made to {path}. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.` | 可能是特殊字符问题 |

三个共同点：

- **都指出了下一步该做什么**，而不只是陈述失败
- **多个 edit 时带上索引**（`edits[2]`），模型能定位到具体是哪一条错了（`packages/coding-agent/src/core/tools/edit-diff.ts:253`）
- **不暴露内部实现**。不会说"fuzzyFindText 返回 -1"，只说"文本必须完全匹配"

这跟 [04.1](./contract) 的校验错误信息是同一套思路：**工具层的每一条错误，最终都是模型下一轮的输入**。写得含糊，模型就会重复犯错。

## 六、排查

- **改出来的文件里出现了不该有的引号变化**
  - 归一化替换的副作用（§二）。确认原文件是不是本来就含弯引号
  - 想避免，只能让模型的 `oldText` 精确到能走 exact match 分支
- **`edit` 报"找到 N 处"，但你肉眼看只有一处**
  - `countOccurrences` 在归一化空间里数（§二）。检查是不是有几段文本只在引号或空白形态上不同
- **`read` 一个文件总是读不全**
  - 看输出末尾的 `Use offset=N to continue`，这是设计行为
  - 如果是"单行超限"提示，说明文件可能是 minified 或单行 JSON
- **模型读不到 `bash` 的完整输出**
  - 看输出里的 `Full output: /tmp/pi-output-xxx.log`，让它 `read` 那个路径
  - 如果这条提示不在，说明输出没超阈值，是命令本身没产出
- **模型能读到不该读的文件**
  - 这是预期行为，工具层没有 jail（§三）。需要在扩展或 OS 层面加限制

## 七、小结

- 四层容错的后两层由工具自己实现：`edit` 管内容差异，`read` 管路径差异
- 模糊匹配换来的是成功率，代价是会顺手改写原文件里的字符，且会掩盖模型的真实输出
- `path-utils.ts` 做的是路径**匹配**不是路径**安全**，Pi 没有路径 jail
- 截断分三种策略（砍头 / 砍尾 / 砍行），选哪种取决于有用信息在哪一头
- 每种截断都附带下一步动作：下一个 offset、bash 替代命令、临时文件路径、改用哪个工具
- 截断规则同时写进 `description`，让模型在调用之前就知道
- 错误消息是模型下一轮的输入，所以要指出"下一步做什么"而不是陈述失败

:::details 八个内置工具速查

| 工具 | 关键参数 | 截断 | 特殊处理 |
|---|---|---|---|
| `read` | `path` `offset` `limit` | 砍头 + `offset` 续读提示 | 图片走 base64 附件；四级路径回退 |
| `edit` | `path` `edits[]` | —— | `prepareArguments` shim；模糊匹配；文件互斥队列 |
| `write` | `path` `content` | —— | 文件互斥队列 |
| `bash` | `command` `timeout` | 砍尾 + 临时文件 | 中止时 `killProcessTree`；无默认超时 |
| `powershell` | 同 `bash` | 同 `bash` | Windows 专用 |
| `grep` | `pattern` `glob` `context` `limit` | 砍头 + 单行 500 字符 | 走 ripgrep；尊重 `.gitignore` |
| `find` | `pattern` `path` `limit` | 砍头 | 走 fd；尊重 `.gitignore` |
| `ls` | `path` `limit` | 砍头 | 含 dotfile；目录带 `/` 后缀 |

默认激活四个：`read`、`bash`、`edit`、`write`。

:::

:::details 本页源码索引

| 符号 | 位置 |
|---|---|
| `createAllToolDefinitions` | `packages/coding-agent/src/core/tools/index.ts:182` |
| `normalizeForFuzzyMatch` | `packages/coding-agent/src/core/tools/edit-diff.ts:34` |
| `fuzzyFindText` | `packages/coding-agent/src/core/tools/edit-diff.ts:207` |
| `countOccurrences` | `packages/coding-agent/src/core/tools/edit-diff.ts:246` |
| `getNotFoundError` | `packages/coding-agent/src/core/tools/edit-diff.ts:253` |
| `getDuplicateError` | `packages/coding-agent/src/core/tools/edit-diff.ts:264` |
| `resolveToCwd` | `packages/coding-agent/src/core/tools/path-utils.ts:48` |
| `resolveReadPath` | `packages/coding-agent/src/core/tools/path-utils.ts:52` |
| `DEFAULT_MAX_LINES` | `packages/coding-agent/src/core/tools/truncate.ts:11` |
| `truncateHead` | `packages/coding-agent/src/core/tools/truncate.ts:78` |
| `truncateTail` | `packages/coding-agent/src/core/tools/truncate.ts:168` |
| `truncateLine` | `packages/coding-agent/src/core/tools/truncate.ts:268` |
| `read` 超长单行提示 | `packages/coding-agent/src/core/tools/read.ts:300` |
| `read` 续读提示 | `packages/coding-agent/src/core/tools/read.ts:308` |
| `bash` 的 `formatOutput` | `packages/coding-agent/src/core/tools/bash.ts:426` |
| `grep` 的截断提示 | `packages/coding-agent/src/core/tools/grep.ts:357` |

:::

## 下一步

→ **05 Context Engineering** — 工具描述、`guidelines`、`AGENTS.md`、skills 索引最终会被拼成一整段 system prompt。这一段怎么分层、怎么不被污染。
