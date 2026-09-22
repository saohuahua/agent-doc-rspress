## git 的四个核心区域分别是什么

git 把文件管理拆成四个区域，理解这四块才能理解 reset / diff / pull 的区别。

```text
工作区(Working Directory) --git add--> 暂存区(Stage/Index) --git commit--> 本地仓库(Local Repo) --git push--> 远程仓库(Remote Repo)
             <--git checkout/reset --                      <--git pull / fetch--
```

- **工作区**：正在编辑、还没交给 git 管理的文件
- **暂存区**：`git add` 之后，等待提交的改动
- **本地仓库**：`git commit` 之后，本地保存的提交历史
- **远程仓库**：`git push` 之后，服务器上的仓库

> 面试版口述：git 本质是把代码分成四个区域来流转。工作区是你正在改的文件；`git add` 把改动放进暂存区，相当于"标记这次要提交什么"；`git commit` 把暂存区固化成本地仓库里的一次提交；`git push` 再把本地提交推到远程。理解这四个区域，后面 `git diff` 比较的是谁、`git reset` 回退到哪，就都清楚了。

## git add / commit / status / log 这些基础命令分别做什么

```bash
git init              # 在本地初始化一个 git 仓库
git clone <url>       # 克隆远程仓库到本地（本地和远程自动建立关联）

git add <file>        # 把指定文件的改动加入暂存区
git add .             # 把当前目录所有改动加入暂存区

git commit -m "msg"   # 把暂存区的内容提交到本地仓库，生成一个版本

git status            # 查看工作区、暂存区的状态（哪些改了、哪些已暂存）

git log               # 查看提交历史
git log --oneline     # 每个提交压缩成一行，简洁展示
```

> 面试版口述：这几个是日常最高频的命令。`git add` 是把工作区的改动送进暂存区；`git commit` 把暂存区固化成一次提交；`git status` 是"现在是什么状态"的镜子；`git log` 看历史。其中 `git log --oneline` 在排查时很实用，每个提交一行，配合 `git reflog` 能快速定位问题提交。

## git reflog 是什么，为什么说是 reset --hard 的后悔药

**核心结论**：`git log` 只记录提交历史，`git reflog` 记录的是**所有对 HEAD 指针的操作**（提交、reset、checkout、merge、rebase 等），即使提交被 `reset --hard` 丢弃，reflog 里仍然留着它的记录。

```bash
git reflog
# Git
# abc1234 HEAD@{0}: reset: moving to HEAD^
# def5678 HEAD@{1}: commit: feat: xxx
```

- `git log` 看不到已经"消失"的提交，因为它的指针已经移走了
- `git reflog` 记录的是操作流水账，被 `reset --hard` 回退掉的提交，在 reflog 里依然存在
- 后悔药用法：`git reflog` 找到丢失提交的 hash，然后 `git reset --hard <hash>` 或 `git checkout <hash>` 找回

> 面试版口述：`git log` 是提交历史，只看当前分支能到达的提交；`git reflog` 是操作历史，记录你每次对 HEAD 的移动。所以当你 `reset --hard` 回退错了、想找回被丢弃的提交时，`git log` 里已经看不到了，但 `git reflog` 里还留着那条记录，找到对应的 hash 再 reset 回去就能恢复。这就是为什么说 reflog 是 reset --hard 的后悔药。

## git diff 的三种用法分别比较什么

```bash
git diff              # 工作区  vs  暂存区（还没 add 的改动）
git diff --cached     # 暂存区  vs  本地仓库 HEAD（已经 add 但没 commit 的改动）
git diff HEAD         # 工作区 + 暂存区  vs  本地仓库 HEAD（所有未提交的改动）
```

> 面试版口述：`git diff` 默认比较的是"工作区"和"暂存区"，也就是你改了但还没 `git add` 的部分；`git diff --cached`（`--staged` 等价）比较"暂存区"和"本地仓库"，也就是已经 add 但还没 commit 的部分；`git diff HEAD` 最全，把工作区和暂存区加起来跟本地仓库比，等于"所有还没提交的改动"。实际开发里图形化工具看 diff 更直观，命令行了解这三个方向就够。

<!-- 这是一张图片，ocr 内容为： -->
> 📷 图片缺失（源文件未随仓库保存）：`QQ_1752731395422.png`。补图后重跑 `npm run sync:interview`

## git fetch 和 git pull 的区别

**核心结论**：`fetch` 只拉取、不合并；`pull` = `fetch` + `merge`，拉下来直接合并到当前分支。

```bash
git fetch origin          # 把远程更新拉到本地仓库，更新 origin/main 等远程跟踪分支
git merge origin/main     # 手动合并到当前分支

git pull origin main      # 等价于上面两条命令合起来，自动合并
```

| 对比项     | git fetch                           | git pull                            |
| ---------- | ----------------------------------- | ----------------------------------- |
| 是否更新远程跟踪分支 | 是                              | 是（内部先执行 fetch）              |
| 是否合并到工作区 | 否，需要手动 merge                | 是，自动 merge                      |
| 安全性     | 安全，先看再合                      | 直接合，可能产生意外冲突            |
| 使用场景   | 想先看远程改了什么，再决定怎么合并  | 明确要同步远程代码时                |

> 面试版口述：`git fetch` 只是把远程仓库的更新下载到本地仓库，更新 `origin/main` 这类远程跟踪分支，但**不碰你的工作区和当前分支**，你可以先看差异再决定怎么合并；`git pull` 等价于 `fetch` + `merge`，一步到位把远程改动合并进当前分支。团队协作时我更习惯先 `fetch` 看下远程的改动，确认没问题再 merge，避免 `pull` 直接合进来产生冲突一脸懵。

## git reset 和 git revert 的区别，线上回滚用哪个

**核心结论**：`reset` 是**移动指针、改写历史**；`revert` 是**生成一个新提交来反向撤销，不改写历史**。

### reset 三种模式

```bash
git reset --soft HEAD^    # 只移动 HEAD，改动保留在暂存区（可以重新 commit）
git reset --mixed HEAD^   # 默认模式，改动保留在工作区（回到 add 之前）
git reset --hard HEAD^    # 改动全部丢弃（工作区、暂存区都清空）
```

| 模式      | HEAD 指针 | 暂存区   | 工作区   |
| --------- | --------- | -------- | -------- |
| `--soft`  | 回退      | 保留改动 | 保留改动 |
| `--mixed` | 回退      | 清空     | 保留改动 |
| `--hard`  | 回退      | 清空     | 清空     |

### revert

```bash
git revert <commit-hash>   # 生成一个新提交，内容是"反向撤销"目标提交的改动
```

### 两者区别

| 对比项   | git reset                       | git revert                          |
| -------- | ------------------------------- | ----------------------------------- |
| 原理     | 移动 HEAD 指针                  | 生成新的反向提交                    |
| 历史     | 改写历史（回退的提交被丢弃）    | 保留历史（撤销动作本身也是一次提交）|
| 能否 push | 已 push 的提交需 force push    | 直接 push，不需要强推               |
| 适用场景 | 本地未推送的提交                | 已推送到远程、需要线上回滚的提交    |

> 面试版口述：`git reset` 是移动 HEAD 指针，把历史"倒回去"，被回退的提交就丢了，属于改写历史；`git revert` 是生成一个新的提交，内容是把某个提交的改动反向应用，也就是"用新提交撤销旧提交"，历史保留。所以线上回滚一定用 `revert`：因为已经 push 到远程的提交，如果再用 `reset --hard` 回退，push 的时候需要 `force push` 强推，会破坏其他同事已经拉取的历史；而 `revert` 生成的是正常的新提交，直接 push 就行，还能追溯"什么时候、为什么回滚"。`reset` 更适合本地还没 push 的提交，回退完重写干净再推。

## git merge 和 git rebase 的区别，上线合入用哪个

**核心结论**：`merge` 保留分叉历史、产生合并提交；`rebase` 把提交"搬家"到目标分支之后、历史变直线。

```bash
# merge：在 main 分支合并 dev
git checkout main
git merge dev
# 结果：产生一个 merge commit，历史是"分叉后合拢"

# rebase：把当前分支的提交搬到目标分支之后
git checkout dev
git rebase main
# 结果：dev 的提交被逐个"重放"到 main 最新提交之后，历史是一条直线
```

### rebase 做了什么

1. 找到 dev 和 main 的**共同祖先**，把 dev 上"祖先之后"的提交逐个"摘下来"
2. 把 dev 指针移到 main 最新提交上，再逐个"重放"这些提交

```text
变基前：                   git rebase main 后：
    A---B---C   dev         D---E---F---A'---B'---C'   dev
   /                        （A' B' C' 是新 hash 的提交）
D---E---F     main
```

- 关键点：rebase 不是"移动"原提交，而是**重新生成等价提交**，所以 hash 会变
- 这也是公共分支不能 rebase 的原因

| 对比项       | git merge                          | git rebase                              |
| ------------ | ---------------------------------- | --------------------------------------- |
| 历史形状     | 分叉后合并（保留真实分支轨迹）     | 一条直线                                |
| 是否产生合并提交 | 是，生成 merge commit            | 否，逐个重放提交                        |
| 是否改写历史 | 否                                 | 是（commit hash 会变）                  |
| 冲突解决次数 | 一次解决                           | 每个被重放的提交都可能冲突              |
| 适用场景     | 公共分支合入、保留真实历史         | 个人 feature 分支同步主干、保持历史整洁 |

补充：`git rebase -i`（交互式）可以合并本地碎提交，比如把一堆 `fix typo` squash 成一个语义完整的提交，push 前整理历史；冲突时解决后 `git rebase --continue` 继续，想放弃用 `--abort`。

**黄金法则**：不要在公共分支上 rebase——因为 rebase 会改写历史，别人已经基于旧提交开发，你一变，对方的历史就"漂移"了。

**上线合入用哪个**：
- 主干合入 feature：用 `merge`，保留真实开发历史和合并记录，安全可追溯
- feature 分支同步主干最新代码：用 `rebase`，让个人分支保持线性、干净，方便 review

> 面试版口述：merge 和 rebase 本质都是"把一个分支的代码合到另一个分支"，区别在历史长什么样。merge 会生成一个合并提交，历史保留分叉的痕迹，能看到这个功能是从哪个分支合进来的；rebase 是把当前分支的提交"摘下来"，重新接到目标分支最新提交之后，历史变成一条直线，看起来像一直在主干上线性开发。
>
> 代价上，rebase 会改写提交历史（hash 会变），所以有黄金法则——公共分支不要 rebase，否则同事基于旧提交的工作会乱。上线合入我一般用 merge：主干是大家共享的，用 merge 保留真实历史和合并记录，出问题好追溯；而个人的 feature 分支在 push 之前用 rebase 同步一下主干，让提交历史干净、review 起来舒服。
>
> 另外提一句 `git rebase -i`：它能把本地一堆碎提交合并成一个语义完整的提交，push 前整理历史，面试时顺带带出来会很加分。

<!-- 这是一张图片，ocr 内容为： -->
> 📷 图片缺失（源文件未随仓库保存）：`QQ_1752745255644.png`。补图后重跑 `npm run sync:interview`

## git stash 是什么，什么时候用

**核心结论**：`git stash` 把工作区和暂存区的改动"暂存"起来，让工作区恢复干净，之后随时可以恢复。

```bash
git stash          # 暂存当前改动，工作区回到干净状态
git stash list     # 查看所有 stash 记录
git stash pop      # 恢复最近一次 stash，并删除这条记录
git stash apply    # 恢复最近一次 stash，但保留记录
git stash drop     # 删除指定 stash 记录
```

**典型场景**：功能开发到一半，突然要切分支处理紧急 bug，但当前改动又不想提交（提交会污染历史），就用 `stash` 把改动先存起来，切过去处理完再回来 `stash pop` 恢复。

> 面试版口述：`git stash` 就是把"没提交的改动"临时存到一边，让工作区变干净。最常见的场景是开发到一半被叫去处理紧急 bug：直接切换分支会带着未提交的改动一起过去，容易乱；提交吧又是个半成品。这时候 `git stash` 存起来，切分支处理完，回来 `git stash pop` 恢复。`pop` 和 `apply` 的区别是 pop 恢复后会删掉这条 stash 记录，apply 会保留。

## git cherry-pick 是什么，什么时候用

**核心结论**：`git cherry-pick` 把**指定的某几个提交**单独"摘取"到当前分支，不需要合并整个分支。

```bash
git cherry-pick <commit-hash>   # 摘取单个提交
git cherry-pick A B C           # 一次摘取多个提交
git cherry-pick A..C            # 摘取连续区间（不含 A，含 C）
```

- 摘过来的改动会生成一个**新的提交**（hash 和原提交不同）
- 冲突时：解决后 `git cherry-pick --continue` 继续，想放弃用 `--abort`

**和 merge 的区别**：merge 合并的是"整个分支的所有提交"，cherry-pick 是"自己挑某几个提交"，粒度更细、更精准。

**典型场景**：dev 分支上修了个 bug，只想把这一个修复提交同步到主干或 hotfix 分支，而不是把整个 dev 分支 merge 过去；或者提交合错了分支，把那次提交挑过来补救。

> 面试版口述：cherry-pick 可以理解为"精准摘樱桃"，只挑指定的某几个提交应用到当前分支。和 merge 的区别是，merge 合并的是整个分支，cherry-pick 是手动挑 commit，粒度更细。实际场景比如在 dev 分支上修了一个 bug，这个修复也要同步到线上的 hotfix 分支，就用 `git cherry-pick <commit>` 把这一次提交挑过去，不用把整个 dev 合并过去。注意它生成的是新提交，hash 会变；冲突时解决后 `--continue` 继续。

## gitignore 的作用和常见内容

用于忽略某些不该纳入版本控制的文件，主要包括：

1. 系统自动生成的文件（如 macOS 的 `.DS_Store`）
2. 编译产生的中间文件、结果文件（如 Java 的 `.class`、`dist/`）
3. 运行产生的日志、缓存、临时文件
4. 涉及身份、密码、口令的文件（如 `.env`）

常用语法：

```gitignore
# 注释
*.class          # 忽略所有 .class 结尾的文件
/dist            # 忽略 dist 目录
!keep.txt        # 反选，保留 keep.txt（即使被前面的规则命中）
```

## 使用 SSH key 来 clone 远程仓库

```bash
# 1. 生成密钥对（一路回车即可）
ssh-keygen -t rsa -C "你的邮箱"

# 2. 生成两个文件：
#    私钥 id_rsa（自己保留，不外传）
#    公钥 id_rsa.pub（复制内容添加到 GitHub/GitLab 的 SSH Keys 设置里）

# 3. 验证是否连通
ssh -T git@github.com

# 4. 之后就能用 ssh 协议 clone，免输密码
git clone git@github.com:xxx/repo.git
```

## 本地仓库和远程仓库如何同步

两种场景：

**1. 直接 clone 远程仓库**

```bash
git clone <url>
# 本地和远程自动建立关联，之后直接 push / pull
```

**2. 已有本地仓库，要关联远程仓库**

```bash
git remote add origin <url>   # 1. 建立连接，origin 是远程仓库的别名
git branch -M main            # 2. 设置默认分支为 main（已是 main 可省略）
git push -u origin main       # 3. 首次 push，-u 把本地 main 和远程 origin/main 建立追踪
```

## git 分支的常用操作

```bash
git branch              # 查看所有分支
git branch <name>       # 创建分支
git branch -d <name>    # 删除已合并的分支
git branch -D <name>    # 强制删除未合并的分支

git checkout <name>     # 切换分支（也能恢复文件，语义不单一）
git switch <name>       # 专门切换分支，语义更清晰（推荐）
git checkout -b <name>  # 创建并切换到新分支

git merge <name>        # 合并分支，例如在 main 下执行 git merge dev，把 dev 合入 main
```

注意：各分支的代码、文件彼此独立，切换分支前，确保改动已经提交（或 `stash`），否则未提交的改动会带到其他分支。

<!-- 这是一张图片，ocr 内容为： -->
> 📷 图片缺失（源文件未随仓库保存）：`QQ_1752746287131.png`。补图后重跑 `npm run sync:interview`

## 多人协作时 git 冲突如何产生、如何解决

**冲突产生的原因**：两个分支同时修改了**同一文件的同一行**（或一处删了、另一处改了），git 无法自动判断保留哪边，就会产生冲突。

### 解决流程

```text
1. 先同步远程最新代码：git pull（或先 git fetch 再 merge）
2. 出现冲突时，git 会在冲突文件里标记冲突位置
3. 手动编辑冲突文件，决定保留哪边（或两边都改）
4. git add 该文件（标记冲突已解决）
5. git commit 完成合并
```

### 冲突标记长什么样

```text
<<<<<<< HEAD
这是 main 分支改的内容
=======
这是 feat 分支改的内容
>>>>>>> feat
```

手动删除 `<<<<<<<`、`=======`、`>>>>>>>` 三行标记，保留想要的代码，然后 `git add` + `git commit` 即完成解决。

### 解决冲突的两种方式

**方式一：merge 解决冲突** —— 解决一次，保留合并提交

**方式二：rebase 解决冲突** —— 把当前分支搬到目标分支上，逐个提交重放，冲突逐个解决，历史成直线

```bash
git switch dev
git rebase main      # 把 dev 搬到 main 之后，冲突时逐个解决
```

> 面试版口述：多人协作冲突的本质是"同一份文件的两处修改，git 无法自动合并"。解决流程是：先 pull 同步最新代码，冲突文件里会出现 `<<<<<<< HEAD` 到 `>>>>>>>` 的标记，中间 `=======` 分隔两边，手动改成想要的最终代码，删除标记，然后 `git add` 标记已解决，再 `git commit` 完成。如果冲突太多，可以 `git merge --abort` 或 `git rebase --abort` 放弃本次合并。解决方式上，merge 一次解决一个合并提交，rebase 是把提交逐个重放、冲突逐个解决，最终历史是直线。
