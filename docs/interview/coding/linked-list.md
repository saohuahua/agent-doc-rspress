# 链表题集

## 预备：链表节点与两种输入模式

+ 核心代码模式（LC / 大部分面试）：**函数签名已给定**，传入 `head`，直接写算法，不用管输入输出
+ ACM 模式（NK 系 / 部分公司牛客环境）：**自己读输入、自己建链表、自己打印**，下面是万能模板

```javascript
// 节点定义（核心代码模式一般题目已给出）
function ListNode(val, next) {
  this.val = val ?? 0;
  this.next = next ?? null;
}

// ACM 模式：数组 -> 链表，返回头节点
const buildList = arr => {
  const dummy = new ListNode(); // 哨兵：插入节点不用特判头节点
  let cur = dummy;
  for (const v of arr) {
    cur.next = new ListNode(v);
    cur = cur.next;
  }
  return dummy.next;
};

// ACM 模式：链表 -> 数组，方便打印验证
const listToArray = head => {
  const res = [];
  for (let cur = head; cur; cur = cur.next) res.push(cur.val);
  return res;
};
```

---

## 反转链表（NK-44，LC206）

**题目**：给定单链表头节点 `head`，将链表反转，返回新头。`1→2→3→4→5` 变 `5→4→3→2→1`

### 思路

+ 反转的本质：**遍历每个节点，把它的 `next` 从指向后一个改成指向前一个**
+ 问题：改掉 `next` 的一瞬间，后面的节点全断了 → 所以**改之前先存下后继**
+ 需要三个指针：`prev`（已反转部分的头）、`cur`（当前节点）、`next`（临时保存后继）

### 迭代写法（面试首选）

```javascript
function reverseList(head) {
  let prev = null; // prev：已反转部分的头。初始为 null，因为反转后原头节点的 next 是 null
  let cur = head;  // cur：当前待反转的节点

  while (cur) {
    const next = cur.next; // 1. 先存后继，防止断链
    cur.next = prev;       // 2. 核心一步：当前节点掉头指向 prev
    prev = cur;            // 3. prev 前移一步
    cur = next;            // 4. cur 前移一步
  }
  // 循环结束时 cur === null，prev 停在原来的尾节点 = 新头
  return prev;
}
```

### 递归写法（会被追问）

```javascript
function reverseList(head) {
  // 终止条件：空链表，或只剩一个节点（它就是新头，原样返回）
  if (!head || !head.next) return head;

  // 1. 信任递归：先把自己后面的整段反转好，拿到新头
  const newHead = reverseList(head.next);
  // 2. 此时 head.next 是反转后那段的尾节点，让它指回自己
  head.next.next = head;
  // 3. 自己的 next 置空，否则原 head 还指着旧后继会成环
  head.next = null;
  // 4. 新头一路向上原样传回，永远不变
  return newHead;
}
```

### 复杂度与追问

+ 迭代：时间 O(n)，空间 O(1) —— **答这个是标准答案**
+ 递归：时间 O(n)，空间 O(n)（递归调用栈），面试可说「递归思路优雅但有栈开销，生产用迭代」
+ 追问 1：反转部分区间（LC92）→ 加 dummy 定位到区间前一个节点，区间内套用本题逻辑
+ 追问 2：K 个一组翻转（LC25）→ 数够 k 个断开一段，段内反转再拼接
+ 追问 3：为什么要 `prev = null` 起始？→ 反转后的尾（原头）必须指向 null，否则成环

---

## 重排链表（NK-38，LC143）

**题目**：`L0→L1→…→Ln-1→Ln` 重排为 `L0→Ln→L1→Ln-1→…`，**必须原地操作，不能只改节点值**
`1→2→3→4→5` 变 `1→5→2→4→3`

### 思路：三步走

+ 直接重排没有规律，先拆解：目标序列其实是 **前半段和「反转后的后半段」交错合并**
  - `1→2→3 | 4→5` → 后半段反转 `5→4` → 交错合并 `1→5→2→4→3`
+ 所以拆成三个独立子问题，每个都是经典套路：
  1. **快慢指针找中点**：slow 一步 fast 两步，fast 到头时 slow 停在前半段末尾
  2. **反转后半段**：就是上一题的迭代反转
  3. **交错合并**：两段逐一拼接
+ 三个子问题分别能讲清楚，这题就赢了——这也是面试官想考的「拆解能力」

### 代码

```javascript
function reorderList(head) {
  if (!head || !head.next) return head; // 0/1 个节点不用动

  // ---------- 第一步：快慢指针找中点 ----------
  let slow = head, fast = head;
  // fast.next && fast.next.next：保证 slow 停在前半段最后一个节点
  // 偶数长度 1→2→3→4：slow 停在 2；奇数长度 1→2→3→4→5：slow 停在 3（中点）
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  // ---------- 第二步：反转后半段 ----------
  let prev = null;
  let cur = slow.next; // 后半段从 slow.next 开始
  slow.next = null;    // 断开前半段和后半段，防止最后成环
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  // prev = 后半段反转后的头

  // ---------- 第三步：两段交错合并 ----------
  // 前半段长度 >= 后半段，所以循环条件用 p2（短的那段走完就结束）
  let p1 = head, p2 = prev;
  while (p2) {
    const n1 = p1.next; // 先存两段各自的后继
    const n2 = p2.next;
    p1.next = p2;       // 前段节点指向后段节点：1→5
    p2.next = n1;       // 后段节点接回前段后继：5→2
    p1 = n1;            // 各自前进
    p2 = n2;
  }
  return head;
}
```

### 用例走一遍（面试可主动画）

```
输入 1→2→3→4→5
① 找中点：slow=3, fast=5；断开后 前段 1→2→3  后段 4→5
② 反转后段：4→5 变 5→4
③ 合并：1→5→2→4→3 ✓
```

### 复杂度与追问

+ 时间 O(n)：找中点 + 反转 + 合并各一趟；空间 O(1) —— 全程只动指针
+ 追问 1：为什么不能改值？→ 题目节点是对象，面试考察的是**指针操作能力**；且真实场景中节点可能被外部引用，改值会污染数据
+ 追问 2：为什么合并循环条件是 `p2` 不是 `p1`？→ 前半段一定 >= 后半段（奇数时中点归前段），后半段先耗尽，循环 `p1` 会空指针
+ 追问 3：找中点的循环条件怎么写？→ 本题写 `fast.next && fast.next.next`，保证 slow 停在**前半段最后一个节点**（奇数时中点归前段）。边界写法不唯一，但必须守住一条不变式：**断开后前半段长度 >= 后半段**，否则合并循环会断——能说出这条不变式，比背条件本身加分

> 反转链表就记一句话：**存后继、掉头、双指针平移**，迭代 O(n)/O(1) 是标准答案，递归要能讲出 `head.next.next = head` 这一步。
>
> 重排链表是三个经典套路的组合：**快慢指针找中点 → 反转后半段 → 交错合并**，全程 O(n)/O(1)。答的时候先说「目标是前半段和反转后的后半段交错」，把拆解思路讲出来，再动手写，比直接默写代码加分。
>
