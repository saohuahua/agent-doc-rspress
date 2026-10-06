# 0207 课程表

课程是否可执行取决于尚未完成的先修课程数量。数量为零的课程可以完成；完成后，其后继课程的未满足先修数量随之减少。该过程将依赖关系转化为可逐步更新的计数。

相关基础：[本章基础](/leetcode/09-graph/)。[力扣原题](https://leetcode.cn/problems/course-schedule/)。

## 题目

:::info 题面

**难度**：中等

输入课程数numCourses和依赖对[a,b]，含义是学习a之前必须先学b。返回能否完成全部课程，不要求输出具体顺序。没有依赖的孤立课程也需要算在总课程数里，依赖可能形成闭环。

:::

### 官方示例

> **示例 1**
>
> 输入：numCourses = 2, prerequisites = [[1,0]]
> 输出：true

> **示例 2**
>
> 输入：numCourses = 2, prerequisites = [[1,0],[0,1]]
> 输出：false

### 约束

- 1 <= numCourses <= 2000
- 0 <= prerequisites.length <= 5000
- prerequisites[i].length == 2
- 0 <= ai, bi < numCourses
- prerequisites[i] 中的所有课程对 互不相同

## 前期思路

### 朴素方法与复杂度

直接模拟可以反复扫描所有未学课程，对每门课检查它的全部先修是否完成。找到可学课程就学掉，再从头扫描。如果一整轮无法前进但仍有课没学，就失败。这个方案已经给出了正确判断，只是不断重查那些尚未满足的关系。

### 优化依据

一门课缺几个前提，只会在某个先修课程刚完成时变化。不必每次重新检查全部先修。给每门课维护尚未完成的先修数量，同时记录完成某门课会影响哪些后继。这个计数是入度，影响清单是从先修到后继的有向边。

### 算法推导

对每个[a,b]建立b到a的连接，并把a的待完成计数加一。初始计数为零的全部课程进入队列，表示现在都可以学，不表示已经完成。

取出一门课，完成数量增加。逐个访问它的后继，将后继计数减一；仅在计数刚变零时把后继入队。这样队列中的课程始终满足全部先修已经完成的条件，不能把减一后仍为正的课程提前放进去。

队列空时比较完成数量和总课程数。若相同，出队顺序就是一份合法学习证据。若有剩余，则剩余每门课至少还有一个未完成前提。有限个点里沿这些前提不断追溯，必然重复某点，即存在依赖环；环上任何课程都无法率先满足前提。因此剩余依赖存在环时，不存在覆盖全部课程的合法完成顺序。这种按依赖消除入口的过程叫拓扑排序。

### 变式分析与错误反例

- 若要求输出学习顺序，把出队的课程依次记录即可。如果还要求字典序最小，应在所有当前可学课程中选编号最小者，需要最小堆而不只是普通队列。依赖条件不变，选择策略变了。
- 错误反例：三门课中0与1互相依赖，2独立。队列可以处理2，但不能因此返回成功，完成数只有1。必须比较总完成数量，不能用“存在一个入口”证明整张图无环。

## 执行过程示例

课程为0、1、2，依赖为`[[1,0],[2,1]]`。

| 操作 | 待完成计数 | 队列剩余 | 已完成 |
| --- | --- | --- | --- |
| 初始化 | 0 1 1 | 0 | 0 |
| 学完0 | 0 0 1 | 1 | 1 |
| 学完1 | 0 0 0 | 2 | 2 |
| 学完2 | 0 0 0 | 空 | 3 |

若另加`[0,2]`，初始三个计数都为1，没有第一门可学，完成数为0，返回false。

## 解法复述与检查

- 依赖[a,b]该连哪一个方向？
- 计数什么时候减？
- 为什么没有入口且有剩余意味着存在环？

:::details 算法概述

为每门课记录未完成的先修数量，并保存从先修指向后继的连接。把初始没有先修的课程放入队列，每学完一门就减少它所有后继的计数，新变零的课程再入队。最终完成数等于总数就能全部学完，否则剩余依赖存在环。

:::

## TypeScript 实现

```ts
export function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const successors = Array.from({ length: numCourses }, () => [] as number[])
  const remaining = Array<number>(numCourses).fill(0)
  for (const [course, prerequisite] of prerequisites) {
    successors[prerequisite].push(course)
    remaining[course]++
  }
  const queue: number[] = []
  for (let course = 0; course < numCourses; course++) {
    if (remaining[course] === 0) queue.push(course)
  }
  let head = 0
  let completed = 0
  while (head < queue.length) {
    const course = queue[head++]
    completed++
    for (const next of successors[course]) {
      // 只有最后一个先修完成时才解锁后继课程
      remaining[next]--
      if (remaining[next] === 0) queue.push(next)
    }
  }
  return completed === numCourses
}
```

## 复杂度与边界

- 设课程数V、依赖数E。
- 建图访问每条边一次，后续每门课至多出队一次、每条边至多更新一次，时间**O(V+E)**，空间**O(V+E)**。
- 不修改输入。
- 没有依赖时所有课程都能完成；自依赖会形成一个节点的环。

## 分层提示

:::details 提示一 先观察什么

像选课一样先找没有未完成先修的课

:::

:::details 提示二 需要维护什么信息

记录每门课还差几个先修 以及完成一门课会影响谁

:::

:::details 提示三 如何组织步骤

初始零计数入队 完成时沿后继减计数 全部完成才成功

:::
