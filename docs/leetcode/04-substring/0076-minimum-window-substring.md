# 0076 最小覆盖子串

阅读前提：[本章基础](/leetcode/04-substring/)。[官方题目](https://leetcode.cn/problems/minimum-window-substring/)。

## 题目

:::info 题面

**难度**：困难

在 s 中找最短连续片段，使它包含 t 的全部字符，重复字符也要有足够份数。s 为 ADOBECODEBANC，t 为 ABC，答案 BANC。字符大小写有区别，题目保证有最优解时其答案唯一，没有覆盖则返回空串。

阅读[滑动窗口基础](/leetcode/03-sliding-window/)与[哈希基础](/leetcode/01-hash/)。这里覆盖允许额外字符，不要求窗口长度等于 t，也不要求顺序一致。

:::

### 官方示例

> **示例 1**
>
> 输入：s = "ADOBECODEBANC", t = "ABC"
> 输出："BANC"

> **示例 2**
>
> 输入：s = "a", t = "a"
> 输出："a"

> **示例 3**
>
> 输入: s = "a", t = "aa"
> 输出: ""

### 约束

- m == s.length
- n == t.length
- 1 <= m, n <= 10^5
- s 和 t 由英文字母组成

### 进阶要求

尝试达到 O(m + n) 时间 其中 m 与 n 分别为两个字符串的长度。

## 前期思路

### 朴素方法与复杂度

枚举左端，从它开始向右加入字符并统计，直到包含 t 的全部份数，记录这个左端能得到的最短覆盖，再换下一个左端。用计数增量判断也需要 O(n²) 次扩张；若每次再完整比较字符表，还需计入比较成本。

重复计算来自更换左端后重新从头扫描右侧。上一个窗口多数内容仍在，新左端只移走一个字符，这些内容的计数已经得到，没必要清空重新统计。

### 覆盖条件与缺额定义

t 为 AABC 时，看到 A、B、C 三种字母并不合法，因为还少一份 A。需要记录每种字符“还缺几份”，初值就是 t 的次数。加入字符会让缺额减一，缺额为零表示刚好够，小于零表示有多余份数。

另存 missing 表示总共还缺多少份。只有加入前缺额大于零，加入这一份才真正补上缺口，missing 才减一。额外加入第三个 A 不能继续减少它，否则会伪造已经完整覆盖的结论。

维护总缺额可避免每次扫描所有字符判断是否覆盖。它不是不同字母的种类数，两个定义都可以设计，但不能混用。

### 收缩操作的合法性

右端不断加入字符，直到 missing 为零，此时窗口已经合法。想更短就尝试删左边：无关字符可以删，多余份数可以删，只有删掉必需的一份时才会失去覆盖。每次删之前先记录当前合法窗口长度。

失去覆盖后停止收缩，继续向右寻找缺失部分。左端不会回退，因为更早的左端已经在某次合法时被记录并尝试缩短；以后右端更远，只会使同一个旧起点的长度更长，不可能改善最短答案。

对每个右端，收缩过程枚举了仍有机会改进的合法左端，最后停在刚失效的位置。任何最短覆盖都有一个右端，到达这个右端时它会被记录，或此前已得到不更长的覆盖，因此不会漏掉最优值。

### 变式分析与错误反例

- 用 Set 判断覆盖会错误接受 s 为 AB、t 为 AAB。加入多余字符也减少 missing，会让 s 为 AA、t 为 AB 被误判；本例第二个 A 没有填上 B 的缺口。
- 若要求最短覆盖某些字母各至少两份，初始化需求次数即可，移动规则不变。若要求子序列按 t 的顺序出现，计数已不够，AB 与 BA 拥有同样计数但顺序不同，必须换用能表达顺序的信息。

## 执行过程示例

s 为 ABAAC，t 为 AAC，最初缺 A 两份、C 一份，共三份。

| 动作 | 缺额 A 与 C | missing | 决策 |
| --- | --- | --- | --- |
| 加入位置 0 的 A | 1 与 1 | 2 | 未覆盖 继续扩张 |
| 加入 B | 1 与 1 | 2 | 无关字符不改缺额 |
| 加入位置 2 的 A | 0 与 1 | 1 | A 刚好够 |
| 加入位置 3 的 A | -1 与 1 | 1 | A 多余一份 |
| 加入 C | -1 与 0 | 0 | 覆盖 记录 ABAAC |
| 删位置 0 的 A | 0 与 0 | 0 | 仍覆盖 记录 BAAC |
| 删 B | 0 与 0 | 0 | 仍覆盖 记录 AAC |
| 删位置 2 的 A | 1 与 0 | 1 | 失去覆盖 停止收缩 |

最终记录是 AAC，不能返回最后失效的 AC。

## 解法复述与检查

- 重复需求怎样表达？
- 多余字符为什么允许缺额为负？
- 为什么先记录合法窗口再删除？

:::details 解法概述

统计目标字符的需求次数，并维护当前窗口中各字符缺额和总缺份数。右端加入字符时，仅在填补实际缺口后减少总缺份数。总缺份数为零时记录窗口，持续移除左端以寻找更短覆盖；删除必需份数使窗口失效后，继续扩张右端。最终返回历史最短合法窗口。

:::

## TypeScript 实现

```ts
export function minWindow(s: string, t: string): string {
  if (t.length === 0 || t.length > s.length) return ''
  const need = new Map<string, number>()
  for (const char of t) need.set(char, (need.get(char) ?? 0) + 1)
  // 缺少的是字符总份数而不是字符种类数
  let missing = t.length
  let left = 0
  let bestStart = 0
  let bestLength = Infinity
  for (let right = 0; right < s.length; right++) {
    const char = s[right]
    const count = need.get(char)
    if (count !== undefined) {
      if (count > 0) missing-- // [!code highlight]
      need.set(char, count - 1)
    }
    while (missing === 0) {
      if (right - left + 1 < bestLength) {
        bestStart = left
        bestLength = right - left + 1
      }
      const removed = s[left++]
      const remaining = need.get(removed)
      if (remaining !== undefined) {
        need.set(removed, remaining + 1)
        // 移出必需的一份才会破坏覆盖
        if (remaining + 1 > 0) missing++ // [!code highlight]
      }
    }
  }
  return bestLength === Infinity ? '' : s.slice(bestStart, bestStart + bestLength)
}
```

## 复杂度与边界

- 左右端各最多走过 s 一次，在 Map 平均常数操作模型下，时间 **O(s.length + t.length)**，辅助空间为目标不同字符数 **O(u)**，没有递归。
- 只在结束时 slice 一次，返回字符串空间 **O(答案长度)**。
- 输入不变。
- 题目为英文字母，索引与 for of 在这里一致；一般 Unicode 需统一计数与索引单位。

## 分层提示

:::details 观察方向

先找到任意覆盖后 哪些左侧字符删掉仍能覆盖

:::

:::details 所需信息

每个目标字符缺几份 以及总共缺几份 多余份数可记为负

:::

:::details 组织步骤

扩到合法 记录并缩到刚失效 再扩张 最终截取历史最短区间

:::
