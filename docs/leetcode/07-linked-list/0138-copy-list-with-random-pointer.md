# 0138 随机链表的复制

相关基础：[本章基础](/leetcode/07-linked-list/)。[官方题目](https://leetcode.cn/problems/copy-list-with-random-pointer/)。

## 题目

:::info 题面

**难度**：中等

节点除了 next，还有 random，可以指向同一链表任意节点或 null，甚至指向自己。要求深拷贝：新链中的每个节点都必须新建，数值和两类连接关系与原链一致，但任何新边都不能指回原节点。next 主链无环，random 可以形成环。返回的是新头而非原头的另一个变量名。

示例中的每一对 `[值, 随机下标]` 代表一个节点，节点按 `next` 顺序排列；随机下标从零开始，`null` 表示没有随机连接。输出数组只描述结构相同，不代表返回原节点。

:::

### 官方示例

> **示例 1**
>
> 输入：head = [[7,null],[13,0],[11,4],[10,2],[1,0]]
> 输出：[[7,null],[13,0],[11,4],[10,2],[1,0]]

> **示例 2**
>
> 输入：head = [[1,1],[2,1]]
> 输出：[[1,1],[2,1]]

> **示例 3**
>
> 输入：head = [[3,null],[3,0],[3,null]]
> 输出：[[3,null],[3,0],[3,null]]

### 约束

- 0 <= n <= 1000
- -10^4 <= Node.val <= 10^4
- Node.random 为 null 或指向链表中的节点。

## 前期思路

### 朴素方法与复杂度

普通链表复制只需从前到后逐个创建，但 random 可能指向还没创建的后方节点。例如第一个节点指向第三个，刚创建第一个副本时，第三个副本尚不存在。若每次为了找目标副本而重新从头按位置扫描，容易达到 O(n²)。问题不是复制数字，而是重建对象之间的身份关系。

### 优化依据

需要一张“旧节点对象 → 对应新节点对象”的表。不能用 val 做键，因为两个不同节点可能具有相同值。把创建身份与连接边分成两遍：第一遍保证所有副本存在，第二遍就能直接查到任意 random 目标的副本。这和页面数据建立实体索引类似，但必须以本题真正的对象身份为准。

### 算法推导

第一遍沿 next 遍历，为每个原节点创建只含 val 的新节点，并放入 Map。此时每个原对象恰好对应一个新对象，next 与 random 暂时都是 null。

第二遍再次沿原 next 走。要建立副本的 next，就看原 next 指向谁，再从 Map 找谁的副本；random 完全同理。原目标是 null 时新边也为 null。这一步不沿 random 遍历，所以 random 自环和互相指向不会导致无限递归。

正确性来自映射保持关系：对每一条原边 u→v，建立新边 copy(u)→copy(v)。每个节点都已创建，边的目标都从副本表取得，因此既不漏边，也不混入原对象。值相同仍对应不同键，保证节点数量和身份结构不被合并。

### 变式分析与错误反例

- 错误反例：用 Map&lt;number, RandomNode&gt; 按值存副本时，两个值为 7 的原节点会覆盖；直接 copy.random = node.random 则只是浅复制，修改原目标值会影响观察到的副本内容。
- 若 random 允许指向主链外的节点，沿 next 建表不再覆盖全部目标，需要把结构视为图，沿两类边发现新节点并使用映射防重复。若输入允许 next 成环，也同样需要访问集合。沿 next 两遍扫描的实现依赖主链有限且无环这一前提。

## 执行过程示例

原链 a(7)→b(7)，a.random=b，b.random=b。

| 阶段 | 映射或赋值 | 为什么 |
| --- | --- | --- |
| 创建 a | a→A | A 是新对象 |
| 创建 b | b→B | 即使值也为 7 仍创建独立对象 |
| 连接 A | A.next=B A.random=B | 两条边都查旧目标 b 的副本 |
| 连接 B | B.next=null B.random=B | 自指向应在副本内部保留 |

检查时既要 A!==a、B!==b，也要 A.random===B，不能仅比较输出值都是 7。

## 解法复述与检查

复述检查：

- 为什么创建副本与连接边分两遍？
- 映射为何必须按对象身份而不是值？
- random自环如何在副本内保留？

:::details 算法概述

复制难点是随机边可能指向未来节点。首先遍历创建所有副本，用旧对象映射到新对象；再遍历连接 next 和 random，每条原边都翻译成两个副本之间的边。这样无需递归随机指针，也不会把相同值的节点混为一个，更不会让副本引用原节点。

:::

## TypeScript 实现

本地保留导出及共用类型导入以便测试。提交时移除模块导入和导出，节点定义使用力扣模板；随机节点的类名按模板调整。

```ts
import { RandomNode } from '../shared.js'

export function copyRandomList(head: RandomNode | null): RandomNode | null {
  const copies = new Map<RandomNode, RandomNode>()
  // 先建立每个原对象到新对象的身份对应
  for (let node = head; node !== null; node = node.next) {
    copies.set(node, new RandomNode(node.val))
  }
  for (let node = head; node !== null; node = node.next) {
    const copy = copies.get(node)!
    // 两种边都必须指向新对象而不是原对象
    copy.next = node.next === null ? null : copies.get(node.next)!
    copy.random = node.random === null ? null : copies.get(node.random)!
  }
  return head === null ? null : copies.get(head)!
}
```

## 复杂度与边界

- 按 Map 平均常数操作假设，时间 **O(n)**，映射辅助空间 **O(n)**，新节点另占 **O(n)** 输出空间。
- 无递归栈，不修改原节点。
- 空链返回 null。
- 该实现选择清晰且只读的两遍法；常数辅助空间进阶可交错插入副本，但那会暂时修改输入并需要谨慎恢复。

## 分层提示

:::details 提示一 先观察什么

新节点的 random 可能指向一个还没创建的副本

:::

:::details 提示二 需要维护什么

保存原对象与副本的一一对应而不是数值对应

:::

:::details 提示三 怎样组织步骤

先创建全部副本 再按映射翻译两类边

:::
