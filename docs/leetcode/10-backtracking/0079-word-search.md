# 0079 单词搜索

相关基础：[本章基础](/leetcode/10-backtracking/)。题目来源：[力扣 79](https://leetcode.cn/problems/word-search/)。

## 题目

:::info 题面

**难度**：中等

给非空字母网格和非空单词，判断是否存在一条上下左右相邻的路径，其字符依次拼成单词。每个格子在同一条路径中最多用一次，不能走对角线。相同字母可以来自不同格子，限制的是格子位置，不是字母值。

:::

### 官方示例

> **示例 1**
>
> 输入：board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = "ABCCED"
> 输出：true

> **示例 2**
>
> 输入：board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = "SEE"
> 输出：true

> **示例 3**
>
> 输入：board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = "ABCB"
> 输出：false

### 约束

- m == board.length
- n = board[i].length
- 1 <= m, n <= 6
- 1 <= word.length <= 15
- board 和 word 仅由大小写英文字母组成

### 进阶要求

考虑更大网格下怎样通过剪枝减少搜索。

## 前期思路

### 朴素方法与复杂度

找出所有等于单词首字母的格子作为起点，从每个起点尝试四个邻居。邻居字符与单词下一字母相等才继续，否则回头换方向。整词匹配成功就结束；一个起点失败还要尝试其他起点。不能只看到网格里包含全部字母就认定存在，因为相邻关系与顺序同样重要。

### 状态设计与优化依据

搜索子问题由当前行列、要匹配的字符位置index，以及当前路径已用格子共同决定。只缓存“这个坐标失败”是不安全的：不同来路占用的格子不同，后续可走的邻居可能不同。这个例子说明并非所有递归都能只按坐标做普通动态规划。

用used[row][col]标记当前路径占用，递归返回前恢复。选择独立布尔表而不改网格字符，确保输入即使成功提前返回也保持原样。标记的生命周期是一条路径，不是所有搜索的永久访问记录。

### 算法推导

函数先检查越界、当前格是否已用、字符是否匹配，任一失败直接返回false。如果当前位置匹配单词最后字符，返回true。否则把当前格标为已用，再依次尝试四个方向匹配index+1。

四个方向任一成功即可，因为题目只问是否存在。无论子方向成功还是失败，当前层返回前都要把used恢复false；先把结果保存到局部变量，恢复以后再返回，就不会因短路成功跳过清理。

为什么不会漏解？任何合法路径有一个起点，外层遍历一定会尝试；路径每步是四邻居之一，递归会尝试对应方向。used只排除已经在本路径里的格子，恰好对应禁止复用约束；字符不匹配也不可能构成目标前缀，所以所有剪枝均安全。

### 变式分析与错误反例

- 若允许重复使用格子，used约束应移除，词长有限仍能终止，但答案会改变，ABA在上面网格中就可沿A到B再回A。若允许对角线，方向集合要扩大，复杂度分支也改变。错误全局访问标记会让先前失败路线封锁后续合法路线；错误只按字母值标记会禁止使用两个不同位置的同字母。

## 执行过程示例 网格匹配

网格第一行AB、第二行CD，查找ABD。

| 当前状态 | 检查与动作 | 后续 |
| --- | --- | --- |
| A匹配第0位 | 标记A已用 | 尝试相邻C和B |
| C尝试第1位B | 字符不同 | 立即失败 不占用C |
| B匹配第1位 | 标记B已用 | 尝试D以及已用A |
| D匹配最后位 | 成功 | 向上传回true |
| 返回B再返回A | 分别撤销使用标记 | 输入与标记恢复 |

若查ABA，最后一步不能再次使用起点A，因此失败。虽然字符串的第一个与第三个字符相同，但这不是字母重复本身的问题，而是缺少另一个合法相邻A格子。

## 解法复述与检查

- 为何每个起点都要尝试？
- 标记为什么不能永久保留？
- 找到答案提前返回前需要做什么？

:::details 算法概述

从每个格子尝试匹配首字母，每次检查边界、路径占用和字符。匹配后如果还没到词尾，就标记该格并尝试四邻居的下一字母。任何方向成功即可，但返回前都撤销当前标记，使其他路径不受影响。匹配完全部字符返回真。

:::

## 复杂度与边界

- 网格m乘n、词长L，粗略时间上界**O(mn·4^L)**，不走回头路会使实际分支更少。
- 辅助used为**O(mn)**，递归栈深度最多min(L,mn)，输出常数空间，不修改board或word。
- 若L超过格子总数立即返回false。
- 单格单字母可以直接成功，大小写按题目字符原值比较。

## 分层提示

:::details 提示一 观察方向

下一字母只能来自当前格四个邻居 先从每个首字母位置尝试

:::

:::details 提示二 需要的信息

除了坐标与单词下标 还要知道本条路径已经用过哪些格子

:::

:::details 提示三 组织步骤

检查匹配后标记 尝试下一字符的四方向 成功失败都恢复当前标记再返回

:::

## TypeScript 实现

本地使用命名导出供测试调用 提交力扣时按题目入口移除导出声明

```ts
export function exist(board: string[][], word: string): boolean {
  const rows = board.length
  const columns = board[0].length
  if (word.length > rows * columns) return false
  const used = Array.from({ length: rows }, () => new Array<boolean>(columns).fill(false))
  const visit = (row: number, col: number, index: number): boolean => {
    if (row < 0 || row >= rows || col < 0 || col >= columns) return false
    if (used[row][col] || board[row][col] !== word[index]) return false
    if (index === word.length - 1) return true
    // 占用只属于当前路径而不是所有搜索共用的历史
    used[row][col] = true
    const found = visit(row + 1, col, index + 1) || visit(row - 1, col, index + 1) ||
      visit(row, col + 1, index + 1) || visit(row, col - 1, index + 1)
    // 成功短路后也恢复本层状态
    used[row][col] = false
    return found
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (visit(row, col, 0)) return true
    }
  }
  return false
}
```
