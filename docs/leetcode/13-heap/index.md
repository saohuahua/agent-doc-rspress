# 堆基础 局部顺序与极值维护

一组候选持续增加时，查询可能只需要获取其中最小或最大的一个，并不需要整个数组时时有序。每次插入后重新排序能够得到极值，但维护完整次序所需的操作多于单次极值查询的需求。

阅读前提：[复杂度与结构选择](/leetcode/00-intro/02-complexity-and-structures)。堆在这里指二叉堆，不是JavaScript垃圾回收中的堆内存。两者名字相同，含义不同。

## 局部顺序与全局最值

最小堆要求每个父节点不大于自己的孩子。沿任意根到叶路径，这个关系连续成立，所以根不会大于任何后代，根就是全局最小值。但左右子树之间并没有整体排序，不能把堆数组当成已排序数组做二分。

最大堆反过来要求父节点不小于孩子，根就是最大值。堆方向由需要优先移除的元素决定。例如保留最大的k项时，需要方便淘汰其中最小的候选，所以用最小堆，而不是因为题目出现最大就选最大堆。

## 二叉堆的数组表示

把节点按层从左到右放进数组。零下标节点的左右孩子在1和2，一般下标i的孩子是2i+1和2i+2，父节点是向下取整的(i-1)/2。形状始终按层紧凑，因此高度是O(log n)，不需要真实节点指针。

例如最小堆数组1、3、2、7，根1小于孩子3与2，节点3小于孩子7。数组中的3在2前面完全合法，因为堆只约束父子关系。

## 插入与删除如何恢复关系

插入5时先放末尾保持紧凑形状。如果它比父节点更小就交换，继续往上比较。只有这条祖先链可能违反顺序，其他父子关系没有变化。这叫上浮。

删除根时不能直接shift，否则整棵数组树的位置关系被打乱。取末尾节点覆盖根，再与优先级更高的孩子比较并交换，逐层往下。这叫下沉。必须在两个孩子里选择更优者，例如最小堆取较小孩子，否则可能修好一边又破坏另一边。

手推最小堆1、3、2、7删除根：末尾7覆盖根得到7、3、2，两个孩子中2更小，交换得到2、3、7。每次沿一条路径移动，插入和删除均为O(log n)，查看根为O(1)。本项目采用逐个插入建堆，总成本O(n log n)；另有线性建堆方法，本章主解不依赖它。

## 本地实现与力扣提交

比较器回答第一个参数是否应该更靠近根。最小堆用a小于b，最大堆用a大于b，对频次条目则比较count字段。size是元素数量，peek不移除，pop移除根。

```ts
// 优先级比较器返回真时表示左侧元素应更靠近堆顶
export class BinaryHeap<T> {
  private readonly values: T[] = []

  constructor(private readonly precedes: (a: T, b: T) => boolean) {}

  get size(): number {
    return this.values.length
  }

  peek(): T | undefined {
    return this.values[0]
  }

  push(value: T): void {
    const values = this.values
    values.push(value)
    let index = values.length - 1
    // 新元素只可能破坏它与祖先之间的顺序
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (!this.precedes(values[index], values[parent])) break
      ;[values[index], values[parent]] = [values[parent], values[index]]
      index = parent
    }
  }

  pop(): T | undefined {
    if (this.values.length === 0) return undefined
    const first = this.values[0]
    const last = this.values.pop()!
    if (this.values.length > 0) {
      this.values[0] = last
      let index = 0
      // 选优先级更高的孩子交换以同时守住两条父子关系
      while (true) {
        const left = index * 2 + 1
        const right = left + 1
        let best = index
        if (left < this.values.length && this.precedes(this.values[left], this.values[best])) best = left
        if (right < this.values.length && this.precedes(this.values[right], this.values[best])) best = right
        if (best === index) break
        ;[this.values[index], this.values[best]] = [this.values[best], this.values[index]]
        index = best
      }
    }
    return first
  }
}
```

第295题通过导入复用它。提交力扣时，将该类复制到解答前面，移除import和export。提交内容须包含入口类依赖的辅助类。第215题进一步利用官方固定整数值域做计数选择，第347题利用有限频次范围做桶选择，以满足相应线性时间要求，堆保留为对照思路。堆的插入与删除过程是理解第295题复杂度及边界维护的前提。

空堆peek与pop返回undefined。题目代码通过大小条件保证读根时非空。泛型只约束类型，正确性仍依赖比较器定义一致，比较规则在存储期间不能随外部状态任意变化。

## 本章题目

- [215 数组中的第K个最大元素](/leetcode/13-heap/0215-kth-largest-element-in-an-array)
- [347 前 K 个高频元素](/leetcode/13-heap/0347-top-k-frequent-elements)
- [295 数据流的中位数](/leetcode/13-heap/0295-find-median-from-data-stream)

[复习与迁移](/leetcode/13-heap/review) · [总导航](/leetcode/)
