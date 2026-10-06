# 0208 实现 Trie (前缀树)

单词集合需要支持完整单词查询和前缀查询。完整查询要求匹配路径末端具有单词结束标记；前缀查询只要求对应路径存在，两者的结束条件不同。

相关基础：[本章基础](/leetcode/09-graph/)。[力扣原题](https://leetcode.cn/problems/implement-trie-prefix-tree/)。

## 题目

:::info 题面

**难度**：中等

实现Trie类，提供insert插入单词、search判断完整单词是否存在、startsWith判断是否有此前插入单词使用给定前缀。输入单词与前缀由小写英文字母构成，非空。插入apple不等于插入app，同一单词可以重复插入而不改变存在性答案。

:::

### 官方示例

> **示例**
>
> 输入
> ["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
> [[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]
> 输出
> [null, null, true, false, true, null, true]

### 约束

- 1 <= word.length, prefix.length <= 2000
- word 和 prefix 仅由小写英文字母组成
- insert、search 和 startsWith 调用次数 总计 不超过 3 * 10^4 次

## 前期思路

### 朴素方法与复杂度

最直接用一个字符串数组保存所有单词。查询完整单词逐个比较，查询前缀也逐个调用前缀匹配。若存了N个单词，每次查询可能比较N次；很多词都有相同开头时，每次还会反复比较那一段。Set可以加快完整匹配，却不能直接完成任意长度前缀查询。

### 优化依据

apple与apply的前四个字母相同，没有必要各自保存并重新比较一条独立的前缀匹配过程。把相同前缀共享成一条路径，每走一条边就消费一个字符。这样查询只沿目标字符走，不遍历其他无关单词。需要额外记住哪些路径结束处真的插入过完整单词。

### 算法推导

创建一个不代表字母的根节点。每个节点保存children映射和terminal布尔值。映射的键是下一字符，值是下一节点；terminal表示从根走到这里组成的字符串是已插入单词。

插入时从根依次处理字符，缺少边就创建子节点，已有边就复用。走完后设置terminal为真，不能在每一步都设置，否则会把所有前缀误当成单词。

查询时也从根逐字符走。某一步找不到边，说明没有任何插入单词具有这个前缀，立即失败。完整走完后，startsWith只要求路径存在，search还要求末尾terminal为真。路径的定义保证每前进一步恰好匹配一个输入字符，所以不会把别的字符串误认进来。结束标记把结构上存在与业务上存过区分开。这种共享前缀的树叫Trie。

### 变式分析与错误反例

- 若要支持删除单词，只清除terminal可以保留路径并正确处理完整查询，但startsWith需要注意已无人使用的残留分支。可以维护经过节点的单词计数或删除无后继且非终止的节点。若要统计同词插入次数，布尔标记要改成终止计数。
- 错误反例：只插入apple后，若search只判断路径能否走完，search(app)会错误返回true。另一方面，插入app后再插入apple，不能清掉app原有终止标记，否则前者又会被错误遗忘。

## 执行过程示例

按顺序执行下列操作，所有状态变化都列在表中。

| 操作 | 路径或标记变化 | 结果及原因 |
| --- | --- | --- |
| 插入apple | 创建a p p l e 在e处标终止 | 只插入完整apple |
| 查询app | 能走到第二个p 但未标终止 | false |
| 查询前缀app | 能走完a p p | true |
| 插入app | 复用原路径 在第二个p标终止 | 不影响apple |
| 查询app | 末节点已有终止标记 | true |

## 解法复述与检查

- 根节点代表哪个字符？
- 路径存在与完整单词存在有什么差别？
- 重复插入为什么不用复制路径？

:::details 算法概述

使用一棵树共享相同前缀，每个节点通过字符映射到下一节点。插入时沿字符复用或创建路径，只在单词末尾设置结束标记。前缀查询只要路径能走完，完整查询还要求末节点有结束标记。这样每次查询只跟输入长度有关，不扫描整个词库。

:::

## TypeScript 实现

```ts
class TrieNode {
  children = new Map<string, TrieNode>()
  terminal = false
}

export class Trie {
  private readonly root = new TrieNode()

  insert(word: string): void {
    let node = this.root
    for (const char of word) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode())
      node = node.children.get(char)!
    }
    // 路径存在不代表完整单词存在 只标记真正的末尾
    node.terminal = true
  }

  search(word: string): boolean {
    return this.walk(word)?.terminal === true
  }

  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null
  }

  private walk(text: string): TrieNode | null {
    let node = this.root
    for (const char of text) {
      const next = node.children.get(char)
      if (next === undefined) return null
      node = next
    }
    return node
  }
}
```

## 复杂度与边界

- 一次插入或查询长度L的字符串，平均Map操作模型下时间**O(L)**。
- 查询额外空间**O(1)**，插入最坏新增**O(L)**个节点。
- 总存储不超过所有插入字符数的数量级，共享前缀会减少节点。
- 方法不修改字符串。
- 当前题目是小写英文字母，字符迭代和长度含义一致。

## 分层提示

:::details 提示一 先观察什么

完整单词与某个单词的开头是两种不同查询

:::

:::details 提示二 需要维护什么信息

共享相同前缀的路径 另记路径末尾是否真正插入过单词

:::

:::details 提示三 如何组织步骤

逐字符走子节点 插入缺边就建 search再看结束标记 startsWith只看路径

:::
