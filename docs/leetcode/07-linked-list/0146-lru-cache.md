# 0146 LRU 缓存

相关基础：[本章基础](/leetcode/07-linked-list/)。[官方题目](https://leetcode.cn/problems/lru-cache/)。

## 题目

:::info 题面

**难度**：中等

设计固定容量缓存，get 返回键对应值，不存在返回 -1；put 插入或更新。读取命中和写入都算一次使用，超过容量时淘汰最久未使用的键。LRU 关心最后一次使用的时间顺序，不是使用次数最多，也不是最早插入。题目要求 get 与 put 平均 O(1)，容量为正数。

:::

### 官方示例

> **示例**
>
> 输入
> ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
> [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
> 输出
> [null, null, null, 1, null, -1, null, -1, 3, 4]

### 约束

- 1 <= capacity <= 3000
- 0 <= key <= 10000
- 0 <= value <= 10^5
- 最多调用 2 * 10^5 次 get 和 put

## 前期思路

### 朴素方法与复杂度

朴素实现使用数组保存按新旧排列的记录：读取时扫描找键，再把它挪到最前；满了就删除末尾。该方法直接维护使用顺序，但扫描和中间移动都是 O(capacity)。如果给每条记录存时间戳，查询可用 Map 加速，但淘汰时仍需扫所有记录找最旧。需要同时解决“按键找到”和“按使用顺序移位”两个问题。

### 优化依据

Map 擅长按键找到节点，却不直接表达任意节点在使用顺序中的前后邻居。双向链表让节点保留 previous 和 next，已知节点时可以常数次改边将它摘下再插到头部。把 Map 的值设为链表节点，就连接了两种能力：查询直接到节点，节点直接知道怎样从当前位置退出。

### 算法推导

设置两个哨兵 head 与 tail，真实节点放在中间，越靠 head 越新，越靠 tail 越旧。detach 把节点两侧邻居相接，moveToFront 把已摘下或新建的节点插在 head 之后。两个哨兵让空链、单节点及两端操作都使用同一套邻接规则。

get 未命中直接返回 -1；命中先摘下再移到前面，最后返回值。put 已有键时更新值并刷新顺序，不增加容量；新键则创建节点入表并放前面，若超容量，删除 tail.previous，并同时从 Map 删除它的 key。

不变量有两条：Map 与真实链节点一一对应；链从前到后按最近使用到最久使用排序。每个公共操作都维护两条，因此查表结果有效，尾节点就是该淘汰者。淘汰节点必须保存 key，否则只能从值反推键，既不可靠也破坏常数成本。

### 变式分析与错误反例

- 错误反例：容量 2，put 1、put 2、get 1、put 3，如果 get 不刷新顺序，会错误淘汰 1；正确淘汰的是 2。只从链表删尾而不删 Map，会让 get 返回已经淘汰的键。更新已有键时再建一个节点，则一个键可能在链里出现多份。
- 如果改成 LFU 最少使用次数淘汰，最近时间顺序不够，需要频率分组及同频率下的时间规则。若增加过期时间，LRU 尾也未必是最先过期项，必须增加失效策略。先说明每个结构负责的查询，再扩展，而不是往现有链表随意增加字段。
- 哈希定位与双向链表维护使用顺序的组合，也可对照[力扣官方题解](https://leetcode.cn/problems/lru-cache/solutions/259678/lruhuan-cun-ji-zhi-by-leetcode-solution/)阅读。本篇额外强调两种结构必须同步删除，否则会出现已淘汰键仍能查到的错误。

## 执行过程示例

容量为 2，顺序按新到旧写。

| 操作 | 返回 | 使用顺序 | 原因 |
| --- | --- | --- | --- |
| put 1 10 | 无 | 1 | 新插入 |
| put 2 20 | 无 | 2 1 | 2 最新 |
| get 1 | 10 | 1 2 | 读取也刷新 |
| put 3 30 | 无 | 3 1 | 淘汰旧键 2 |
| get 2 | -1 | 3 1 | 未命中不改顺序 |
| put 1 11 | 无 | 1 3 | 更新已有键不增容量 |

## 解法复述与检查

复述检查：

- Map和双向链表分别解决哪个操作瓶颈？
- get命中为什么也改顺序？
- 淘汰时为什么必须同时删除表项和链节点？

:::details 算法概述

将需求拆成按键快速查找和按时间快速移动。Map 从键定位到双向链表节点，链头保存最新，链尾保存最旧。读取命中或写已有键都将节点摘下放头部，新键加入后若超容量就删尾节点，同时清理 Map。哨兵统一边界，每次只改固定几条连接。

:::

## TypeScript 实现

本地保留导出及共用类型导入以便测试。提交时移除模块导入和导出，节点定义使用力扣模板；随机节点的类名按模板调整。

```ts
class Entry {
  previous: Entry | null = null
  next: Entry | null = null
  constructor(public key: number, public value: number) {}
}

export class LRUCache {
  private readonly entries = new Map<number, Entry>()
  private readonly head = new Entry(0, 0)
  private readonly tail = new Entry(0, 0)

  constructor(private readonly capacity: number) {
    this.head.next = this.tail
    this.tail.previous = this.head
  }

  private detach(node: Entry): void {
    node.previous!.next = node.next
    node.next!.previous = node.previous
  }

  private moveToFront(node: Entry): void {
    const first = this.head.next!
    node.previous = this.head
    node.next = first
    first.previous = node
    this.head.next = node
  }

  get(key: number): number {
    const node = this.entries.get(key)
    if (node === undefined) return -1
    // 读取命中也会刷新最近使用顺序
    this.detach(node)
    this.moveToFront(node)
    return node.value
  }

  put(key: number, value: number): void {
    const existing = this.entries.get(key)
    if (existing !== undefined) {
      existing.value = value
      this.detach(existing)
      this.moveToFront(existing)
      return
    }
    const node = new Entry(key, value)
    this.entries.set(key, node)
    this.moveToFront(node)
    if (this.entries.size > this.capacity) {
      // 尾部前一个真实节点是最久未使用者
      const oldest = this.tail.previous!
      this.detach(oldest)
      this.entries.delete(oldest.key)
    }
  }
}
```

## 复杂度与边界

- 在哈希表平均常数时间假设下，get 与 put 平均 **O(1)**，链表操作严格常数次改边。
- 容量为 C 时占 **O(C)** 存储，两个哨兵常数开销，无递归。
- 输入是操作流，缓存实例会按设计改变内部状态。
- key、value 按题面数字范围使用 number。

## 分层提示

:::details 提示一 先观察什么

查键和找最旧记录是两种不同操作 哪种结构分别擅长

:::

:::details 提示二 需要维护什么

Map 的值保存节点引用后 能否直接摘掉任意节点

:::

:::details 提示三 怎样组织步骤

双哨兵链维护新旧顺序 每次命中移头 超容量同时删尾和表项

:::
