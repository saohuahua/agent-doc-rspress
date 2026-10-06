# 0148 排序链表

相关基础：[本章基础](/leetcode/07-linked-list/)。[官方题目](https://leetcode.cn/problems/sort-list/)。

## 题目

:::info 题面

**难度**：中等

把任意顺序链表排列成升序，返回新头。题目进阶希望 O(nlog n) 时间和常数辅助空间。链表无法像数组一样 O(1) 访问中间下标，但很擅长顺序扫描与改接节点。需要先会 0021 的两个有序链合并，本题的关键在于怎样把无序输入变成可合并的有序小段。

:::

### 官方示例

> **示例 1**
>
> 输入：head = [4,2,1,3]
> 输出：[1,2,3,4]

> **示例 2**
>
> 输入：head = [-1,5,3,4,0]
> 输出：[-1,0,3,4,5]

> **示例 3**
>
> 输入：head = []
> 输出：[]

### 约束

- 链表中节点的数目在范围 [0, 5 * 10^4] 内
- -10^5 <= Node.val <= 10^5

### 进阶要求

尝试达到 O(n log n) 时间与 O(1) 额外空间。

## 前期思路

### 朴素方法与复杂度

收集值后调用排序再回写容易实现，却使用 O(n) 数组且绕过了链表结构；逐个节点插入到有序链，最坏每次都扫描长前缀，达到 O(n²)。另一条路线是从一个确定事实出发：只有一个节点的链段天然有序。若把相邻有序段合成更长有序段，就能逐渐覆盖整条链。

### 优化依据

每次合并两段的成本与两段总长成正比，真正要控制的是同一节点经历多少轮。每轮把有序段长度翻倍，1 变 2，2 变 4，最多 log n 轮，而不是每次只增长一个。这个过程叫归并排序。为了避免递归调用占 O(log n) 栈，采用从短段开始的迭代方式。

### 算法推导

先统计长度。width 表示本轮输入有序段的最大标准长度，初始为 1。每轮从 dummy.next 开始，连续切出 left 和 right 两段，每段最多 width 个，剩余入口保存在 current。

cut 的职责是走到段尾，把段尾 next 断为 null，并返回后段入口。断开非常重要，否则合并循环会越过属于自己的范围。然后像 0021 一样，两个头中选较小值接到 tail，直到两段耗尽，再让 tail.next 指回 current，继续本轮下一对。

一轮结束，相邻每两段已合并成最多 2width 的有序段，width 翻倍。初始单节点有序，合并保持有序，因此按轮归纳，width 达到链长前最后一轮已把整条链合为有序。尾部不足标准长度也可切成短段，缺失的右段按 null 处理，不需要丢弃尾部。

### 变式分析与错误反例

- 错误反例：如果 cut 不断开段尾，width=1 时 left 并不是单节点 4，而仍连着全部后续，合并范围失控并可能制造环。只检查最终值排序还不够，测试应检查节点总数不变且无环。
- 如果允许 O(log n) 栈，可以递归对半分再合并，概念更短，但不能称为常数空间。若只要求取最小 k 个，完整排序可能做了不必要的工作，应根据输出需求重新选方法。归并的优势来自顺序访问，适合链表和外部文件流。

## 执行过程示例

输入 4→2→1→3→0。

| width | 本轮分组 | 合并后的链 |
| --- | --- | --- |
| 1 | [4]与[2] [1]与[3] [0]与空 | 2→4→1→3→0 |
| 2 | [2 4]与[1 3] [0]与空 | 1→2→3→4→0 |
| 4 | [1 2 3 4]与[0] | 0→1→2→3→4 |

每轮看起来不一定全局有序，例如第二轮末尾 0 还在最后，但标准段内部已经有序，这才是需要维持的状态。

## 解法复述与检查

复述检查：

- 为什么单节点段可以作为起点？
- cut为何要真的断开连接？
- width翻倍后保持的性质是全链有序还是每段有序？

:::details 算法概述

从单节点天然有序开始，把相邻长度为一的段两两合并，再合并长度为二的段，依次翻倍。每次切断两段并保留后续入口，用双头比较接到结果尾。一轮扫描所有节点，轮数是对数，所以得到 O(nlog n)，迭代实现避免递归栈。

:::

## TypeScript 实现

本地保留导出及共用类型导入以便测试。提交时移除模块导入和导出，节点定义使用力扣模板；随机节点的类名按模板调整。

```ts
import { ListNode } from '../shared.js'

export function sortList(head: ListNode | null): ListNode | null {
  let length = 0
  for (let node = head; node !== null; node = node.next) length++
  const dummy = new ListNode(0, head)
  function cut(start: ListNode | null, count: number): ListNode | null {
    if (start === null) return null
    for (let i = 1; i < count && start.next !== null; i++) start = start.next
    const rest = start.next
    // 断开当前段以限制合并范围
    start.next = null
    return rest
  }
  for (let width = 1; width < length; width *= 2) {
    let current = dummy.next
    let tail = dummy
    while (current !== null) {
      let left: ListNode | null = current
      let right = cut(left, width)
      current = cut(right, width)
      while (left !== null || right !== null) {
        if (right === null || (left !== null && left.val <= right.val)) {
          tail.next = left
          left = left!.next
        } else {
          tail.next = right
          right = right.next
        }
        tail = tail.next!
      }
      tail.next = current
    }
  }
  return dummy.next
}
```

## 复杂度与边界

- 每轮切段与合并合计 **O(n)**，总共 **O(log n)** 轮，时间 **O(nlog n)**。
- 辅助空间 **O(1)**，只有固定指针与 dummy，无递归。
- 重用原节点并修改 next，不修改 val。
- 空链和单节点无需任何合并；重复值使用左侧优先，保留相对次序。

## 分层提示

:::details 提示一 先观察什么

一个节点是否已经有序 两个有序段怎样合并

:::

:::details 提示二 需要维护什么

每轮让段长度翻倍能让节点参与几轮

:::

:::details 提示三 怎样组织步骤

按 width 切两段 合并接回 再把 width 翻倍

:::
