# 0234 回文链表

相关基础：[本章基础](/leetcode/07-linked-list/)。[官方题目](https://leetcode.cn/problems/palindrome-linked-list/)。

## 题目

:::info 题面

**难度**：简单

判断链表从左到右的数值序列是否与从右到左相同，返回布尔值。1→2→2→1 是回文，1→2 不是。比较数值而不是节点身份，左右两边本来就是不同节点。题目追问能否在线性时间且常数空间完成。

:::

### 官方示例

> **示例 1**
>
> 输入：head = [1,2,2,1]
> 输出：true

> **示例 2**
>
> 输入：head = [1,2]
> 输出：false

### 约束

- 链表中节点数目在范围[1, 10^5] 内
- 0 <= Node.val <= 9

### 进阶要求

尝试用 O(n) 时间和 O(1) 额外空间完成判断。

## 前期思路

### 朴素方法与复杂度

把全部数值放进数组，然后两端向中间比较，该方法的时间 O(n)，辅助空间 O(n)。问题是单链表只允许向后走，右端无法直接向左移动。如果每次都从头寻找倒数位置，会退化为 O(n²)。反转后半段可将两端比较转化为同时向前遍历，比较结束后再恢复连接，即可避免永久修改原链。

### 优化依据

回文比较只需要成对访问前半和后半，并不需要随机访问所有位置。若能找到中点，把后半链反转，就可以用两个都向 next 前进的指针完成两端比较。于是拆成两个已能独立理解的小任务：定位一半、反转一段。反转用于改变后半段的访问顺序，使两个指针同时前进时读取到对称位置。

### 算法推导

先让 slow 和 fast 同时从头出发，slow 每轮一步，fast 每轮两步。仅当 fast 后面还有两个节点时继续，因此偶数长度 slow 落在前半最后一个，奇数长度落在中央节点。两种情况都从 slow.next 开始反转，奇数中央值不参与比较。

得到后半新头 second 后，left 从原头走，right 从 second 走。只需比较 right 存在的那些位置，因为它恰好代表需配对的数量。某对不等就记录 false，但不能直接返回，否则恢复步骤不会执行。

最后再次反转 second，并赋回 slow.next。反转两次恢复后半原顺序，前半除边界连接外没有变化。比较覆盖每一对对称位置，所以全相等当且仅当回文；中间单独一个元素不影响对称性。

### 变式分析与错误反例

- 错误反例：1→2→3→4 在首对比较失败时直接 return false，会使后半仍保持反向，调用者下一次遍历得到错误结构。测试必须比较每个原节点的 next，而不仅核对返回值。
- 如果题目要求字符串忽略空格和大小写，需要先明确归一化规则；链表值比较规则不能照搬。若允许 O(n) 空间且输入必须在整个调用过程中只读，数组方案更合适。若只检查前 k 个节点是否回文，则边界要先限定，不能对全链中点操作。

## 执行过程示例

输入 1→2→3→2→1。

| 阶段 | slow | fast | 关键结果 |
| --- | --- | --- | --- |
| 起始 | 第一个 1 | 第一个 1 | 尚未定位 |
| 第一轮 | 第一个 2 | 3 | 快慢距离扩大 |
| 第二轮 | 3 | 最后 1 | 中间已确定 |
| 反转后半 | 3 | 不再使用 | second 为 1→2 |
| 比较 | 从左 1 和右 1 开始 | 两对均相等 | 中央 3 不参与 |
| 恢复 | 3.next 接回 2→1 | 原拓扑还原 | 返回 true |

## 解法复述与检查

复述检查：

- 快慢指针在奇偶长度下分别停在哪里？
- 为什么从slow.next反转？
- 比较失败时为何仍不能跳过恢复步骤？

:::details 算法概述

数组方案可以先保证正确，再减少额外存储。使用一快一慢找到前半末尾，把后半反转，让两边都能沿 next 从外向内比较。比较次数以后半长度为准，奇数中点自动跳过。发现不等只记录结果，最后一定把后半反转回来并接回去，再返回判断。

:::

## TypeScript 实现

本地保留导出及共用类型导入以便测试。提交时移除模块导入和导出，节点定义使用力扣模板；随机节点的类名按模板调整。

```ts
import { ListNode } from '../shared.js'

export function isPalindrome(head: ListNode | null): boolean {
  if (head === null || head.next === null) return true
  let slow = head
  let fast = head
  // 快指针抵达末尾时慢指针停在前半段末尾
  while (fast.next !== null && fast.next.next !== null) {
    slow = slow.next!
    fast = fast.next.next
  }
  function reverse(node: ListNode | null): ListNode | null {
    let previous: ListNode | null = null
    while (node !== null) {
      const next: ListNode | null = node.next
      node.next = previous
      previous = node
      node = next
    }
    return previous
  }
  const second = reverse(slow.next)
  let left: ListNode | null = head
  let right = second
  let result = true
  while (right !== null) {
    if (left!.val !== right.val) result = false
    left = left!.next
    right = right.next
  }
  // 即使比较失败也恢复原链表连接
  slow.next = reverse(second)
  return result
}
```

## 复杂度与边界

- 找中点、两次反转、比较都为 **O(n)**，总时间仍是 **O(n)**。
- 辅助空间 **O(1)**，局部反转是迭代而无递归栈。
- 过程短暂修改 next，返回时恢复；不分配新节点。
- 单节点为 true，本地也支持空链返回 true。

## 分层提示

:::details 提示一 先观察什么

数组两端比较缺少的只是从尾向前访问能力

:::

:::details 提示二 需要维护什么

将后半反转后能否让两个指针都向后走

:::

:::details 提示三 怎样组织步骤

定位前半末尾 反转后半 比较后必须恢复

:::
