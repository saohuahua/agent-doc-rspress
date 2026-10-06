# 0025 K 个一组翻转链表

相关基础：[本章基础](/leetcode/07-linked-list/)。[官方题目](https://leetcode.cn/problems/reverse-nodes-in-k-group/)。

## 题目

:::info 题面

**难度**：困难

每 k 个节点组成一组，把每组内部反转，组与组顺序不变。最后不足 k 个必须保持原样。比如 1→2→3→4→5 且 k=3，结果是 3→2→1→4→5，不能把最后两个也反转。要求改变节点连接而非交换数值，k 合法且至少为 1。

:::

### 官方示例

> **示例 1**
>
> 输入：head = [1,2,3,4,5], k = 2
> 输出：[2,1,4,3,5]

> **示例 2**
>
> 输入：head = [1,2,3,4,5], k = 3
> 输出：[3,2,1,4,5]

### 约束

- 链表中的节点数目为 n
- 1 <= k <= n <= 5000
- 0 <= Node.val <= 1000

### 进阶要求

尝试只用 O(1) 额外空间完成分组反转。

## 前期思路

### 朴素方法与复杂度

已经会反转整条链后，很容易想到反复反转小段。困难变为如何限定小段、怎么接回前后、最后不足一组怎么办。可以先数总长度，再每次处理 k 个；也可以在当前组前先向后探测 k 步。后者无需总长，但必须先探测完再修改，否则不足一组时还要额外恢复。

### 优化依据

需要保存三个边界信息：组前 before、组末 kth、组后 after，以及原组头 oldFirst。组内反转时 oldFirst 会变成尾，kth 会变成头，所以处理结束后 before 应连 kth，下一轮 before 应变成 oldFirst。这四个引用分别负责连接已处理部分、定位新组头、保留后续入口和定位新组尾，改边时必须保持各自可达。

### 算法推导

每轮从 before 向后走 k 步，如果中途到 null，说明剩余不足一组，直接结束，原链没有被触碰。如果足够，保存 after=kth.next。

接下来使用局部反转。previous 初始指向 after，而不是 null，意味着旧组头第一次改边就接到未来的组后。current 从 oldFirst 开始，直到 current===after 为止，每步都先保存原 next 再改向 previous。由于 after 预先保存且不在本组内，终止边界不会因为改边而丢失。

最后 before.next=kth 接回新头，before=oldFirst 为下一组准备。循环开始时，before 之前各组已正确反转，之后仍未处理；每轮改变恰好 k 个节点，组后仍可达，约定成立。k=1 时反转一节点不改变连接，但 before 仍向后推进，所以不会死循环。

### 变式分析与错误反例

- 错误反例：长度 5 且 k=3，边翻边数到末尾后才发现不够，会已把 4→5 变成 5→4，违反不足组不动的要求。另一个错误是用 kth.next 作为动态停止条件，kth.next 在反转最后一步会被修改，因此必须事先保存 after。
- 若题意改成最后不足 k 个也要反转，可以把尾部实际长度视为最后一组，不再直接停止。若只翻转某个范围，边界保护原理同样成立。局部链段处理都需要维护前驱、尾部和后继入口，反转范围变化后可依据这些边界重新安排连接。

## 执行过程示例

输入 1→2→3→4→5 且 k=3。

| 步骤 | current | previous | 已改边 |
| --- | --- | --- | --- |
| 探测完成 | 1 | 4 | kth 为 3 after 为 4 |
| 处理 1 | 2 | 1 | 1→4 |
| 处理 2 | 3 | 2 | 2→1→4 |
| 处理 3 | 4 | 3 | 3→2→1→4 |
| 接回前缀 | 下一组从 4 开始 | before 为 1 | dummy→3→2→1→4→5 |
| 再探测 | 不足三节点 | 不改动 | 返回上述结构 |

## 解法复述与检查

复述检查：

- 为什么先探测完整一组再改边？
- previous为什么从组后开始？
- 完成后谁是新组头、新组尾和下一组前驱？

:::details 算法概述

每组先确认有 k 个节点，不足就不改。保存组后入口和原组头，把这 k 个节点反转，反转前驱初始指向组后，确保新尾自动接回后面。再把组前接新头，原组头变成下一组前驱。这样同时解决组内反向与两端连接。

:::

## TypeScript 实现

本地保留导出及共用类型导入以便测试。提交时移除模块导入和导出，节点定义使用力扣模板；随机节点的类名按模板调整。

```ts
import { ListNode } from '../shared.js'

export function reverseKGroup(head: ListNode | null, k: number): ListNode | null {
  const dummy = new ListNode(0, head)
  let before = dummy
  while (true) {
    let kth: ListNode | null = before
    // 先探测完整一组以免修改不足长度的尾段
    for (let count = 0; count < k && kth !== null; count++) kth = kth.next
    if (kth === null) break
    const after: ListNode | null = kth.next
    const oldFirst = before.next!
    let previous: ListNode | null = after
    let current: ListNode | null = oldFirst
    while (current !== after) {
      const next: ListNode | null = current!.next
      current!.next = previous
      previous = current
      current = next
    }
    before.next = kth
    // 旧组头已经成为新组尾
    before = oldFirst
  }
  return dummy.next
}
```

## 复杂度与边界

- 每个节点至多参与一次组长度探测和一次反转，时间 **O(n)**，不是每组重新扫全链。
- 辅助空间 **O(1)**，无递归；原地修改 next，不修改 val。
- 实现依赖 k≥1，k=0 会破坏推进关系，题面已排除。
- 尾部不足组长度保留原对象与原连接。

## 分层提示

:::details 提示一 先观察什么

整条反转之外 每组还需要接回哪两端

:::

:::details 提示二 需要维护什么

先确认组是否完整 保存不会随改边变化的组后引用

:::

:::details 提示三 怎样组织步骤

探测 k 个 反转到 after 接回新头 原头成为下一组前驱

:::
