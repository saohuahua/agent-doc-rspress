---
title: Vue
---

# Vue

> Vue 面试核心：Vue2 / Vue3 差异、响应式原理与更新调度、模板编译、虚拟 DOM 与 Diff、Composition API、组件与通信、生命周期与内置组件、Vuex / Pinia、路由模式与权限、SPA 与性能优化。
>
> 姊妹篇：[Nuxt](./nuxt)

整体知识链：

**响应式数据变化 → 依赖收集与触发 → 调度与批量更新 → render 函数与 VNode → Diff 与 patch → 组件更新 → 状态管理与业务应用 → 性能优化。**

---

## 一、Vue 基础与 Vue2 / Vue3 核心区别

### 你如何理解 Vue？它有哪些核心特点？

- **渐进式**：可以只用一个 `<script>` 引入做局部增强，也可以配合路由、状态管理、构建工具做成完整框架。
- **声明式渲染**：用模板或渲染函数描述 UI「应该长什么样」，框架负责把它变成真实 DOM。
- **响应式**：数据变化自动驱动视图更新，不需要手动操作 DOM。
- **组件化**：把 UI 拆成可复用的、自带模板/逻辑/样式的单元。
- **虚拟 DOM**：用 JS 对象描述 UI，配合 Diff 尽量复用已有 DOM、减少不必要的更新（不是性能的唯一来源）。
- **生态完善**：Vue Router、Pinia、VueUse、Nuxt 等配套成熟。

> **面试回答：** Vue 是一个渐进式框架，核心是「声明式渲染 + 响应式 + 组件化」：用模板声明 UI，数据变化通过响应式系统自动驱动视图更新，再通过虚拟 DOM 和 Diff 把变化落到真实 DOM。它不强制你一次性采用全部能力，可以从局部增强逐步扩展。

### Vue2 和 Vue3 的主要区别是什么？

| 维度 | Vue2 | Vue3 |
| --- | --- | --- |
| 响应式 | `Object.defineProperty` 逐个劫持已有属性 | `Proxy` 代理整个对象 |
| 新增/删除属性 | 无法自动检测，需要 `$set`/`$delete` | 直接支持 |
| 数组索引 / length | 无法检测，靠重写数组方法兜底 | 直接支持 |
| 集合类型 | 不支持 Map/Set | 原生支持 |
| 组织方式 | Options API 为主 | Composition API（仍兼容 Options API） |
| 生命周期 | `beforeDestroy`/`destroyed` | `beforeUnmount`/`unmounted` |
| 根节点 | 必须单一根节点 | 支持 Fragment 多根节点 |
| 源码 | JavaScript（Flow 类型） | TypeScript 重写 |
| 编译优化 | 运行时 diff 为主 | 静态提升、Patch Flags、Block Tree 等编译优化 |

> **面试回答：** 最大的区别是响应式实现从「劫持属性」变成「代理对象」，Vue3 因此能监听新增/删除属性、数组下标和 length、集合类型；其次是 Composition API 改善逻辑组织，以及编译期信息（静态提升、Patch Flags、Block Tree）让运行时更新更精准。但 Vue3 仍然有运行时 Diff，不是「不再 diff」。

### Vue2 和 Vue3 的响应式原理有什么区别？为什么 Vue3 选择 Proxy？

#### Vue2 的实现与局限

Vue2 初始化时会**递归遍历 `data` 中的每个属性（包括嵌套对象）**，把每个已有属性转成 `getter/setter`：读时收集依赖，写时触发更新。它是**深度递归观测**，不是只能处理第一层。

```javascript
const data = { count: 0 }
let value = data.count // 用闭包保存当前值，getter 才能返回它

Object.defineProperty(data, 'count', {
  get() {
    console.log('依赖收集')
    return value
  },
  set(newVal) {
    console.log('触发更新')
    value = newVal
  }
})
```

根本限制：**`defineProperty` 只能劫持「对象上已经存在的属性」**，它是属性级的，不是对象级的。所以：

- 新增属性 `this.user.age = 18`：`age` 原本不存在，没有对应的 getter/setter，不是响应式，需要 `this.$set(this.user, 'age', 18)`。
- 删除属性 `delete this.user.age`：同样无法被 setter 捕获，需要 `this.$delete`。
- 数组索引直接修改 `a[0] = 1` 或修改 `a.length`：也捕获不到。Vue2 通过重写 `push`、`pop`、`splice`、`sort` 等数组变更方法兜底，但 `a[0] = 1` 这种直接下标赋值仍无法检测。

所以 Vue2 的短板集中在「新增/删除属性、数组下标和 length」，对已存在属性的读取与修改，响应式能力是完整的。

#### Vue3 的实现

Vue3 用 `Proxy` **代理整个对象**，拦截对象层面的各种操作，无论属性是否存在都能拦截：

```javascript
const obj = { count: 0 }
const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    // 读取属性：收集依赖
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    // 新增、修改属性都能监听到
    const result = Reflect.set(target, key, value, receiver)
    // 触发更新
    return result
  },
  deleteProperty(target, key) {
    // 删除属性也能监听到
    const result = Reflect.deleteProperty(target, key)
    // 触发更新
    return result
  }
})
```

`Proxy` 相比 `defineProperty` 的改进：

- **新增属性、删除属性、数组下标、length 变化**都能拦截。
- **不需要初始化时递归遍历**：采用懒代理，访问到哪一层才代理哪一层。
- **对 Map、Set** 这类集合类型也能做响应式支持。
- 从「监听属性」→「监听对象行为」；从「补丁式处理数组」→「统一拦截机制」。

除 `get`/`set`/`deleteProperty` 外，`Proxy` 还能拦截 `has`（`in` 操作符）、`ownKeys`（`Object.keys` / `for...in` 遍历）等行为，这是 `defineProperty` 做不到的。

> **面试回答：** Vue2 用 `Object.defineProperty` 逐个劫持已有属性，因此新增、删除属性、数组下标和 length 都无法监听，只能靠 `$set`/`$delete` 和重写数组方法兜底。Vue3 改用 `Proxy` 代理整个对象，能拦截新增、删除、下标、length、`in`、遍历等操作，并采用懒代理避免初始化时递归遍历。核心是从「监听属性」升级为「监听对象行为」。

### Vue3 做了哪些编译期与运行时优化？

Vue3 的更新优化是**编译期 + 运行期共同作用**的结果，不是简单的「Vue2 全量 diff、Vue3 定点更新」：

- **静态提升**：不变的静态 VNode 提升到 render 函数外，避免每次渲染重复创建。
- **Patch Flags**：编译时给动态节点打上标记（如 `TEXT`、`CLASS`、`PROPS`），运行时只处理被标记的部分。
- **Block Tree**：以「块」为单位收集动态后代节点，更新时跳过静态部分。
- **事件缓存（cacheHandlers）**：缓存事件处理函数，减少不必要的函数重建与子组件更新。

Vue3 仍然有运行时 Diff。这些优化的核心是「利用编译期信息，减少运行时不必要的比较与更新」，而不是「所有更新都不再经过 Diff」。具体见第三章「Vue3 在编译阶段做了哪些优化」。

> **面试回答：** Vue3 在编译期做静态提升、Patch Flags、Block Tree 和事件缓存，运行时据此只更新被标记的动态部分、跳过静态子树；列表乱序仍走 key 映射 + 最长递增子序列的完整 diff。这些优化缩小了 diff 范围，但没有消灭 diff。

### Options API 和 Composition API 有什么区别？

两者是**组织代码的两种方式**，不是二选一的对立：

- Options API 按 `data`/`computed`/`methods`/生命周期等选项组织，简单组件直观。
- Composition API 按**业务功能**组织，把同一功能的状态、计算、方法、生命周期聚在一起，复杂组件更清晰，逻辑复用和 TypeScript 类型推导也更好。

Vue3 同时支持两种写法，`<script setup>` 只是 Composition API 的编译期糖。选型与设计原因详见第四章。

> **面试回答：** Options API 按选项拆分代码，同一功能的逻辑会分散在多个选项里，组件复杂后难以维护；Composition API 按业务功能聚合，可抽取 composable 复用，类型推导也更好。二者都可用，Composition API 主要解决「逻辑组织与复用」，不是单纯减少代码行数。

---

## 二、响应式系统与更新调度

### Vue3 的响应式原理是什么？数据变化后如何驱动视图更新？

Vue3 响应式的核心是 **`Proxy + track + trigger + effect`**，各部分职责明确：

- **`Proxy`**：拦截对象读写删等操作，是「拦截手段」。
- **`track`**：依赖收集，解决「谁依赖了这个数据」。
- **`trigger`**：派发更新，解决「数据变化后通知谁」。
- **`effect`**：副作用函数，是「数据变化后要重新执行的东西」。
- **数据结构 `WeakMap → Map → Set`**：建立「对象 → 属性 → 依赖集合」的映射。

完整链路：

```text
组件渲染 / effect 执行时读取响应式数据
        ↓
触发 Proxy 的 get
        ↓
track 收集依赖（当前 effect 记入该属性的 Set）
        ↓
响应式数据发生变化
        ↓
触发 Proxy 的 set / deleteProperty
        ↓
trigger 找到依赖并（经过 scheduler 调度）通知更新
        ↓
组件重新执行 render，生成新 VNode
        ↓
diff + patch 更新真实 DOM
```

响应式系统只负责「数据变化 → 通知依赖」这一段；后面的调度、render、VNode 比较、patch 属于渲染更新系统，两者通过「组件渲染本身也是一个 effect」衔接起来。

> **面试回答：** Vue3 用 Proxy 拦截对象操作：读取属性时 track 收集当前 effect 到该属性的依赖集合；数据变化时 trigger 找到这些依赖并交给 scheduler。对组件而言，渲染本身是一个 effect，数据变化会驱动 render 重新执行、生成新 VNode，再经 Diff 和 patch 更新真实 DOM。调度器会把更新批量处理，所以 DOM 不一定立即同步更新。

### Vue3 响应式系统由哪些核心部分组成？Reflect 有什么用？

```text
reactive  对象转响应式
ref       基本类型/对象转响应式（带 .value）
effect    副作用函数，数据变化后重新执行
track     依赖收集
trigger   依赖触发
proxy     代理对象，拦截 get/set/delete 等
reflect   配合 proxy 完成默认对象操作
```

拦截器里用 `Reflect.get(target, key, receiver)`、`Reflect.set(target, key, value, receiver)` 而不是直接 `target[key]`，是为了：

- 保留对象的默认行为（如原型链上的属性、setter）。
- 通过 `receiver` 让 `this` 指向代理对象本身，避免继承场景下 `this` 指向出错。
- `Reflect.set` 返回布尔值，正好符合 Proxy `set` 陷阱「返回是否成功」的约定。

> **面试回答：** 核心是 Proxy、track、trigger、effect：Proxy 拦截操作，track 收集依赖，trigger 派发更新，effect 是变化后要重跑的副作用。用 Reflect 而不是直接操作 target，是为了保留默认行为、让 receiver 修正 this 指向，并拿到 Reflect.set 的布尔返回。

### Vue 是如何完成依赖收集和触发更新的？

> 下面是一个**理解「依赖收集与触发」思想的简化示例**：手动调用 `track()`/`trigger()`，只展示「用 Set 存依赖、变化时统一重跑」的核心思想，并没有实现 Proxy 驱动的自动收集。

普通 JS 变量之间没有联动：

```javascript
let price = 10, quantity = 2
let total = price * quantity
console.log(total) // 20
price = 20
console.log(total) // 还是 20，不会自动变
```

手动版：把依赖 `price` 的副作用收集起来，变化时统一重新执行。

```javascript
let price = 10, quantity = 2, total = 0
const dep = new Set() // ① 存放副作用函数的集合
const effect = () => { total = price * quantity }
const track = () => { dep.add(effect) }        // ② 收集副作用
const trigger = () => { dep.forEach(fn => fn()) } // ③ 执行所有副作用

track()
trigger()
console.log(total) // 20
price = 20
trigger()
console.log(total) // 40
```

这个 demo 的 `track`/`trigger` 是**手动调用的**，`price` 本身没有任何拦截能力。真实 Vue 需要：

- 普通变量读/写无法被拦截，只有代理对象才能在「读属性时自动 track、写属性时自动 trigger」。
- 因此 `get` 里自动调 `track(target, key)`，`set`/`deleteProperty` 里自动调 `trigger(target, key)`。

支持多个对象时，把单个 `Set` 升级成 `WeakMap → Map → Set`：

```text
targetMap (WeakMap)
└── state 对象
    └── depsMap (Map)
        ├── count → Set [effect1, effect2]
        └── name  → Set [effect3]
```

> **面试回答：** 依赖收集就是「读取属性时把当前 effect 记进该属性的依赖集合」，触发更新就是「数据变化时从集合里取出 effect 重新执行」。数据结构用 `WeakMap → Map → Set`：WeakMap 的 key 是对象（可被 GC），Map 的 key 是属性名，Set 存 effect（去重）。这套机制本质是发布-订阅。

### reactive 是如何把普通对象变成响应式对象的？

> 下面是**最小实现**，只演示「get 收集依赖、set/delete 触发更新、嵌套对象懒代理、代理缓存」这些核心机制，不是 Vue3 的完整源码。

```typescript
const reactiveMap = new WeakMap()      // 缓存：同一原始对象只创建一个代理
const ITERATE_KEY = Symbol('iterate')  // 遍历类依赖的虚拟 key

function reactive(target) {
  // 只代理对象
  if (typeof target !== 'object' || target === null) return target
  // 已代理过直接返回缓存，避免每次读取嵌套对象都新建 Proxy
  if (reactiveMap.has(target)) return reactiveMap.get(target)

  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      track(target, key) // 读取属性时收集依赖
      // 懒代理：读到对象才继续代理，而不是初始化时全递归
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },

    // 遍历（Object.keys / for...in）时收集「遍历依赖」，新增/删除属性会触发它
    ownKeys(target) {
      track(target, ITERATE_KEY)
      return Reflect.ownKeys(target)
    },

    set(target, key, value, receiver) {
      const oldValue = target[key]
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.set(target, key, value, receiver)
      // Reflect.set 失败（如目标属性只读）时不触发更新
      if (!result) return result
      if (!hadKey) {
        trigger(target, key, 'ADD') // 新增属性，同时触发遍历依赖
      } else if (oldValue !== value) {
        trigger(target, key, 'SET') // 修改已有属性
      }
      return result
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (hadKey && result) {
        trigger(target, key, 'DELETE') // 删除属性，同时触发遍历依赖
      }
      return result
    }
  })

  reactiveMap.set(target, proxy)
  return proxy
}
```

关键点：

- **嵌套对象缓存**：`reactiveMap` 保证同一个嵌套对象反复读取时返回同一个 Proxy（否则每次 `state.user` 都生成新代理，破坏身份一致性）。
- **懒代理**：只在 `get` 读到对象时才继续 `reactive(result)`，不是初始化时全量递归。
- **区分新增与修改**：用 `hadKey` 判断，新增/删除属性还要通知「遍历」依赖（`ITERATE_KEY`）。
- **`Reflect.set` 的返回值**必须返回，它表示赋值是否成功；失败时不触发更新。
- **属性值比较**：只有 `oldValue !== value` 才触发，避免无变化也派发更新。

这段代码**没有实现**的能力（真实源码里有）：`readonly`、`isReactive`/`isProxy`、集合类型（Map/Set 需要专门的 handler）、数组 `length` 与索引的联动、`shallow` 浅层模式、`toRaw` 等。

> **面试回答：** reactive 用 `new Proxy` 包装对象：get 里 track 收集依赖，读到嵌套对象时懒代理并缓存；set/delete 里区分新增、修改、删除，用 Reflect 完成默认操作并触发 trigger。关键是「懒代理 + 代理缓存」，让深层对象按需转响应式且身份一致。

### effect 是什么？Vue 如何收集和清理依赖？

依赖收集就是：当副作用函数读取某个响应式数据，把它记录到该数据的依赖集合里，数据变化时重新执行它。

```typescript
effect(() => {
  document.body.innerText = state.count
})
```

上面的 `effect` 执行时读取 `state.count`，触发 `get`，`track` 把当前 effect 收集进 `state.count` 的依赖集合；`count` 变化时重新执行这个 effect。常见的 effect：组件渲染函数、`watchEffect` 回调、`computed` 的 getter、`watch` 的 source。

朴素写法有 bug：

```typescript
let activeEffect = null
function effect(fn) {
  activeEffect = fn
  fn()
  activeEffect = null // 第一次执行后清空，trigger 重跑时没有恢复上下文
}
```

第一次执行能收集依赖，但 `trigger` 再次调用 `fn()` 时，`activeEffect` 已经不在正确位置，依赖收集上下文丢失。正确实现需要处理四件事：

1. **执行时设置当前上下文**：`effect` 执行前把自身设为 `activeEffect`，执行后恢复外层。
2. **重新执行时重新收集依赖**：每次重跑都走一遍 `fn()`，重新触发 `get`，重新 `track`。
3. **清理旧依赖**：重跑前先把自己从旧依赖集合移除，否则条件分支变化后已不再读取的属性仍保留这个 effect，造成多余触发甚至内存泄漏。
4. **嵌套 effect 保存/恢复外层上下文**：用栈保存外层 `activeEffect`，内层执行完恢复外层。

实现：

```typescript
let activeEffect = null
const effectStack = []

function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)          // 先清理旧依赖，避免脏依赖残留
    activeEffect = effectFn    // 设置当前上下文
    effectStack.push(effectFn)
    const result = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1] ?? null // 恢复外层
    return result
  }
  effectFn.deps = []           // 记录自己都被收集进了哪些 Set
  effectFn.scheduler = options.scheduler
  if (!options.lazy) effectFn()
  return effectFn
}

function cleanup(effectFn) {
  for (const dep of effectFn.deps) dep.delete(effectFn)
  effectFn.deps.length = 0
}
```

对应的 `track` 双向记录依赖：

```typescript
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return // 不在 effect 里读取，不需要收集

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let deps = depsMap.get(key)
  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }
  deps.add(activeEffect)
  activeEffect.deps.push(deps) // 反向记录，供 cleanup 使用
}
```

- `WeakMap` 的 key 是原始对象：对象被回收后，它对应的依赖关系也能被 GC，避免内存泄漏。
- 用 `Set` 存依赖：保证同一个 effect 不被重复收集。
- `track` 本质是发布-订阅：`track` 订阅，`trigger` 发布通知。

> **面试回答：** effect 是「数据变化后要重跑的副作用」，执行时把自己设为 `activeEffect`，读取到的响应式数据就会把它收集进依赖集合。每次重跑前先清理旧依赖再重新收集，用栈处理嵌套；否则条件分支变化后会残留脏依赖，造成多余触发。

### 数据变化后，Vue 如何找到并触发相关依赖？

`trigger` 根据「怎么变的」找到对应依赖并通知。不同操作触发的依赖不同：

```typescript
function trigger(target, key, type) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const effects = new Set()
  const deps = depsMap.get(key)
  if (deps) deps.forEach(fn => effects.add(fn))

  // 新增/删除属性，还要通知依赖「遍历结果」的 effect（如 Object.keys、for...in）
  if (type === 'ADD' || type === 'DELETE') {
    const iterateDeps = depsMap.get(ITERATE_KEY)
    if (iterateDeps) iterateDeps.forEach(fn => effects.add(fn))
  }

  effects.forEach(effectFn => {
    // 有调度器就交给调度器，决定执行时机；否则同步执行
    if (effectFn.scheduler) effectFn.scheduler(effectFn)
    else effectFn()
  })
}
```

为什么不能只用 `target + key` 一个简单 Set 概括全部行为：

- **新增/删除属性**会改变「遍历结果」，需要额外通知 `ITERATE_KEY` 依赖。
- **数组 `length` 与索引联动**：修改 `length` 会影响索引大于等于新长度的元素；改某个索引又可能影响 `length`，依赖映射更复杂。
- **对象遍历**（`Object.keys`/`for...in`）依赖的是「键的集合」而非某个具体 key，需要 `ITERATE_KEY` 这类虚拟 key 单独收集。

`trigger` 通知依赖后，**不代表每个组件立即同步更新 DOM**。组件渲染 effect 带 `scheduler`，`trigger` 只是把任务交给 scheduler，scheduler 把任务放进更新队列、去重、批量刷新（见「Vue 为什么采用异步批量更新？nextTick 是什么？」）。

> **面试回答：** trigger 根据 key 和操作类型找依赖：改属性取该 key 的 Set；新增/删除还要额外通知 ITERATE_KEY 遍历依赖。找到后不是同步执行，而是交给 scheduler 决定时机，scheduler 会入队、去重、批量刷新。数组 length 与索引的联动、遍历依赖让依赖关系比「一个 key 一个 Set」更复杂。

### ref 为什么需要 .value？它是如何实现的？

`reactive` 用 Proxy 只能代理对象，**基本类型（number/string/boolean）不是对象，无法被 Proxy 代理**。`ref` 的解法是把值包成一个带 `.value` 的对象，在 `.value` 的 getter/setter 里做依赖收集与触发：

```typescript
// 简化实现，省略深层对象转换
function ref(value) {
  const wrapper = {
    get value() {
      track(wrapper, 'value')
      return value
    },
    set value(newValue) {
      if (newValue !== value) {
        value = newValue
        trigger(wrapper, 'value')
      }
    }
  }
  return wrapper
}
```

- `.value` 提供了**可追踪的读写入口**：基本类型自身没有可拦截的读写行为，包装对象让读写都走 getter/setter，从而可被 track/trigger。
- **ref 存对象时仍具备深层响应式**：真实实现里 `ref(object)` 内部会调用 `reactive(object)` 转成深层响应式，所以 `ref({ a: { b: 1 } }).value.a.b` 也是响应式的。
- **JS 与模板访问的区别**：JS 里必须写 `ref.value`；模板里 Vue 自动解包，直接写 `{{ count }}`。`reactive` 对象里嵌套的 `ref` 属性在模板/读取时也会自动解包（数组和 Map 集合里的 ref 不解包）。
- 上面的简单包装对象是**简化实现**，不是完整 ref（真实实现还处理对象深层代理、只读、比较、`__v_isRef` 标记等）。

> **面试回答：** 基本类型不能被 Proxy 代理，所以 ref 用一个带 `.value` 的对象包住值，读写都经过 getter/setter，从而可被 track/trigger。对象传给 ref 时内部会转成 reactive，所以仍具备深层响应式。模板里 Vue 会自动解包，JS 里才需要 `.value`。

### computed 为什么有缓存？惰性求值是怎么实现的？

`computed` 也基于 `effect`，核心是**缓存 + 惰性求值 + 脏标记**：

```typescript
function computed(getter) {
  let value
  let dirty = true // 脏标记：true 表示需要重新计算

  const effectFn = effect(getter, {
    lazy: true,              // 不立即执行
    scheduler() {
      dirty = true           // 依赖变化时只标记为脏，不立即重算
      trigger(computedRef, 'value') // 通知依赖 computed 的 effect 更新
    }
  })

  const computedRef = {
    get value() {
      if (dirty) {
        value = effectFn()   // 真正读取时才重新求值
        dirty = false
      }
      track(computedRef, 'value') // 收集「谁依赖了这个计算属性」
      return value
    }
  }
  return computedRef
}
```

- **为什么有缓存**：`getter` 依赖不变时，`dirty` 一直为 `false`，多次读取直接返回上次结果，不重复执行 `getter`。
- **为什么惰性求值**：`effect` 带 `lazy: true`，不在创建时立即执行，只有第一次读取 `.value` 时才求值。
- **依赖变化如何失效**：依赖变化时 `trigger` 调用 `effectFn` 的 `scheduler`，`scheduler` 只把 `dirty` 置真，**不立即重算**；下一次读取 `.value` 时才重新计算。
- **为什么适合纯同步派生**：它只承诺「依赖变化后，读取时返回最新值」，不负责异步、副作用。在 getter 里发请求、写 DOM 会破坏「可预测的派生」语义。

> **面试回答：** computed 是「惰性求值 + 缓存」的派生状态。它内部用一个带 scheduler 的 effect 包住 getter：依赖变化时只把脏标记置真，等真正读 `.value` 时才重算并缓存；依赖不变就永远走缓存。因此它适合纯同步派生，不适合异步副作用。

### watch 和 watchEffect 有什么区别？分别适合什么场景？

`watch` 显式指定数据源，变化时执行回调；`watchEffect` 自动收集内部读取的依赖：

```typescript
// watch：显式 source + 回调
watch(
  () => state.count,
  (newValue, oldValue) => console.log(newValue, oldValue)
)

// watchEffect：自动依赖收集
watchEffect(() => {
  console.log(state.count, state.name) // 两者任一变化都会重跑
})
```

- **监听数据源与回调的关系**：`watch` 的 source 内部会被包装成 effect，读取 source 时收集依赖；依赖变化后通过 **scheduler** 调度执行回调（不是直接同步重跑），回调拿到新旧值。
- **`watch` 默认不立即执行**（可用 `immediate: true`）；`watchEffect` 默认立即执行一次，且不区分新旧值。
- **`watch` 可以监听 `ref`、reactive 对象、getter、多个 source 数组**；`watchEffect` 只能自动收集，无法指定。
- **两者都用于「副作用」**，和 `computed`（派生值）区分开。

**异步请求的竞态与 cleanup**：快速输入搜索词时，旧请求可能比新请求更晚返回，导致旧结果覆盖新结果。用 watcher 的 cleanup 在回调失效时取消旧请求：

```typescript
watch(keyword, async (value, _oldValue, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort()) // 下一次回调触发前取消上一次请求

  const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
    signal: controller.signal
  })
  results.value = await response.json()
})
```

- 回调第三个参数 `onCleanup` 用于注册清理逻辑；Vue 3.5 起也可用 `onWatcherCleanup()`，但 `onWatcherCleanup()` 必须在回调的同步阶段（`await` 之前）调用。二者都应在异步操作启动前注册，避免竞态和遗漏。
- `AbortController` + `onCleanup`：当 `keyword` 再次变化，Vue 先执行上一次的 cleanup，`abort()` 让旧请求失效，新请求结果才可靠。
- 若请求无法取消，可用「请求序号」判断：只有最新序号的结果才写入，避免过期结果覆盖。

> **面试回答：** watch 显式指定 source 并拿到新旧值，默认不立即执行；watchEffect 自动收集依赖、默认立即执行、不区分新旧值。两者都用于副作用。异步场景要配合 cleanup 或 AbortController 取消旧请求，否则慢请求会覆盖新结果。

### Vue 为什么采用异步批量更新？nextTick 是什么？

**核心结论**：Vue 在**同一轮同步代码中**多次修改响应式数据时，不会每次都同步更新 DOM，而是把更新任务放进队列，等本轮同步代码执行完后再「批量刷新」，最终只渲染一次。`nextTick` 就是「在下次 DOM 更新完成后」执行回调的钩子。

1. 组件渲染是一个 effect。修改响应式数据时 `trigger` 找到这个渲染 effect，但 Vue 给组件渲染 effect 挂了 `scheduler`。
2. scheduler 不直接执行渲染，而是把 effect 放进**更新队列**（`queue`），同一 effect 通过 id 去重，只入队一次。
3. 本轮同步代码结束后，Vue 通过**微任务**（`Promise.then`）刷新队列，统一执行队列里的所有 effect。
4. 所以同一轮里 `count++` 三次，`trigger` 三次，但组件只重新渲染一次。

```text
同步代码修改 count（多次）
        ↓
trigger 通知渲染 effect，scheduler 把 effect 入队（去重）
        ↓
同步代码继续执行，DOM 还没变
        ↓
同步代码结束，微任务刷新队列
        ↓
重新渲染、diff、patch，DOM 更新完成
        ↓
nextTick 的回调在此之后执行
```

`nextTick` 的要点：

- `nextTick` 等待的是「**本次数据变更引起的 DOM 更新完成后**」，不是固定延时。
- 实现上它返回一个 Promise（或接受回调），把回调排进更新队列刷新之后；`await nextTick()` 之后访问 DOM 才是更新后的状态。
- 不是 `setTimeout` 那样的固定延时：如果本轮没有数据变更，`nextTick` 很快（微任务级别）就返回。

什么时候用 `nextTick`：

- 修改数据后**立即访问更新后的 DOM**（如获取新的元素尺寸、滚动位置）。
- 在 `onMounted` 里渲染了动态内容后需要立刻操作 DOM。
- 子组件挂载/更新后需要拿到其最新 DOM 或实例。

```javascript
count.value++
await nextTick()
console.log(document.querySelector('#count').textContent) // 已是最新值
```

> **面试回答：** Vue 用调度器把同一轮同步代码里的多次数据修改合并成一次渲染：trigger 只是把渲染 effect 入队去重，等同步代码结束再通过微任务批量刷新。nextTick 就是在这个刷新之后执行的钩子，用来拿更新后的 DOM；它不是固定延时，而是等待「本次更新完成」。

### 响应式 API 的选择与常见踩坑

#### watch 和 computed 有什么区别？如何选择？

| 维度 | computed | watch / watchEffect |
| --- | --- | --- |
| 本质 | **派生**一个值，声明式 | **副作用**，命令式 |
| 返回值 | 必须返回一个值 | 无返回值 |
| 缓存 | 有，依赖不变走缓存 | 无，变化就执行 |
| 执行时机 | 惰性，被访问时才计算 | 数据变化时执行（watchEffect 立即执行一次） |
| 异步 | 不适合 | 适合 |
| 场景 | 从多个状态得到新值、模板中复杂逻辑 | 发请求、操作 DOM、保存状态、清理 |

- **简单判断**：需要「一个新值」用 `computed`；需要「做点什么」用 `watch`/`watchEffect`。

`watch` 常用配置：

- `immediate: true`：创建后立即执行一次回调。
- `deep: true`：深度监听（`watch` 一个 reactive 对象时默认深；`watch(getter)` 返回对象时默认浅，需要显式 `deep`）。
- `flush: 'pre'`（默认）：组件更新前执行，回调里改状态会合并进本次更新。
- `flush: 'post'`：组件更新后执行，回调里可安全访问最新 DOM。
- `flush: 'sync'`：同步执行，破坏批量更新，慎用。

> **面试回答：** computed 是带缓存的惰性派生值，watch/watchEffect 是执行副作用的侦听器。要一个新值用 computed，要「做点什么」（请求、操作 DOM、持久化）用 watch；watch 显式指定 source，watchEffect 自动收集依赖。

#### ref 和 reactive 有什么区别？怎么选？

`ref` 用带 `.value` 的包装对象，基本类型和对象都能用（对象内部会转深层响应式）；`reactive` 直接返回 Proxy，只能代理对象/数组/Map/Set。

- **默认用 `ref`**：变量可整体替换，传参、解构语义更清晰。
- 表单、筛选条件这类「字段多、原地修改」的对象用 `reactive` 更自然。
- **不是绝对规则**：复杂对象也可以用 `ref`，不必强求「复杂对象必须用 reactive」。

```typescript
const page = ref(1)
const user = ref({ name: 'Tom' }) // ref 也能装对象

const form = reactive({ name: '', departmentId: undefined })

// reactive 的引用不能整体替换，否则模板/其他引用仍指向旧 Proxy
Object.assign(form, { name: '', departmentId: undefined }) // 正确：原地重置
```

> **面试回答：** ref 用 `.value` 包装，基本类型和对象都行，可整体替换；reactive 只代理对象，适合原地修改的表单/筛选对象。默认用 ref，字段多且原地改的对象用 reactive；reactive 不能整体重新赋值，重置用 Object.assign。

#### 使用 Vue 响应式 API 有哪些常见踩坑？

- **不要直接解构 `reactive` 对象**：解构拿到的是当时的普通值，后续不随原对象更新。用 `toRefs` 暴露多个字段，`toRef` 取单个字段。

```typescript
const state = reactive({ page: 1, pageSize: 20 })
const { page, pageSize } = toRefs(state) // 保持响应式关联
const currentPage = toRef(state, 'page')
```

- **`shallowRef` 只追踪 `.value` 整体替换**，不深层代理内部对象，适合 ECharts 实例、地图实例、大型不可变数据。`markRaw` 让对象永远不被转成响应式。两者是「确认深层响应式带来开销或兼容问题时」的优化手段，不是默认写法。
- **`watch` 传对 source**：`watch(() => route.params.id, loadUser)` 精确监听 ID；`watch(form, cb)` 对 reactive 对象隐式深监听，大表单可能造成多余触发。
- **第三方类实例**（如 `echarts.init` 返回的对象）不适合深度响应式代理，用 `shallowRef` 或 `markRaw` 保存，并在卸载时 `dispose`。

> **面试回答：** 常见坑是解构 reactive 丢响应式（用 toRefs/toRef 解决）、reactive 整体重赋值失效（用 Object.assign）、watch 大对象隐式深监听造成多余触发、第三方实例被深度代理。解决思路是：字段用 toRefs，重置用 Object.assign，第三方实例用 shallowRef/markRaw 并在卸载时释放。

---

## 三、模板编译、虚拟 DOM 与 Diff

### Vue 模板是如何编译成 render 函数的？

Vue 的 SFC 模板会经历「编译」过程，产出 render 函数：

1. **parse（解析）**：把模板字符串解析成 AST（抽象语法树），描述节点类型、属性、指令、子节点等。
2. **transform（转换）**：遍历 AST，识别 `v-if`、`v-for`、`v-on`、`v-bind` 等指令，做静态分析、生成 Patch Flags、做静态提升、收集 Block Tree 信息。
3. **generate（生成）**：把转换后的 AST 生成 JS 代码（render 函数），渲染时调用 `h()`/`createVNode()` 生成 VNode。

例如：

```html
<div class="box">{{ message }}</div>
```

大致编译为（示意）：

```javascript
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString } from 'vue'

export function render(_ctx, _cache) {
  return _createElementVNode('div', { class: 'box' }, _toDisplayString(_ctx.message), 1 /* TEXT */)
}
```

- 编译发生在**构建阶段**（SFC 通过 vue-loader / @vitejs/plugin-vue），或运行时用 `compile` 编译字符串模板。
- 运行时**不是每次更新都重新编译模板**，编译结果被缓存复用；每次更新只是重新执行 render 函数。
- 编译期能拿到「哪些是静态、哪些是动态」的信息，这是 Vue3 编译优化的基础。

> **面试回答：** 模板经过 parse 生成 AST、transform 识别指令并做静态分析/打 Patch Flag/静态提升、generate 生成 render 函数，渲染时 render 调用 h/createVNode 生成 VNode。编译发生在构建期并缓存，运行时只重新执行 render。

### VNode 和虚拟 DOM 是什么？二者有什么区别？

**核心结论：VNode 是描述单个节点的 JS 对象，虚拟 DOM 是由 VNode 组成的一整棵虚拟节点树。**

```html
<div id="app">
  <p>Hello Vue</p>
</div>
```

对应 VNode：

```javascript
const vnode = {
  type: 'div',
  props: { id: 'app' },
  children: [
    {
      type: 'p',
      props: null,
      children: 'Hello Vue'
    }
  ]
}
```

| 对比项 | VNode | 真实 DOM |
| --- | --- | --- |
| 本质 | JS 对象 | 浏览器 DOM 节点 |
| 创建成本 | 相对低 | 相对高 |
| 操作位置 | JS 内存中 | 浏览器渲染引擎中 |
| 作用 | 描述 UI 结构 | 真正渲染页面 |
| 更新方式 | 新旧 VNode diff | 真实 DOM patch |
| 是否直接显示 | 不会 | 会显示在页面上 |

完整渲染链路：

```text
Template（模板）
   ↓ 编译（构建期）
render 函数
   ↓ 执行（渲染/更新时）
VNode 树（虚拟 DOM）
   ↓ mount（首次）/ patch（更新）
真实 DOM
```

> **面试回答：** VNode 是描述单个节点（元素、组件、文本、Fragment）的 JS 对象，虚拟 DOM 是 VNode 组成的树。渲染链路是「模板 → 编译 → render 函数 → 执行 → VNode 树 → mount/patch → 真实 DOM」。

### Vue 为什么要引入虚拟 DOM？它一定比手写 DOM 快吗？

不要把虚拟 DOM 简单等同于「比手写 DOM 快」，它不一定比精心手写的 DOM 操作更快。它的价值在于：

- **声明式描述 UI**：开发者只描述「UI 应该是什么样」，不必手写命令式的 DOM 操作。
- **统一渲染与更新流程**：数据变化后，统一走「生成新 VNode → 对比 → 更新」的流程。
- **抽象真实 DOM 操作**：屏蔽底层 DOM API 细节。
- **支持按新旧 VNode 差异更新**：复用已有节点，减少不必要的创建/删除/移动。
- **为跨平台提供抽象基础**：同样的 VNode 可以渲染到 DOM、Canvas、原生（如小程序）等宿主。

也不要把所有 DOM 更新都描述成必然触发完整重排重绘。浏览器渲染流程复杂，是否重排/重绘取决于更新内容和优化策略（如合成层、样式是否影响布局等）。

```mermaid
flowchart TD
  A[响应式数据变化] --> B[trigger 通知组件渲染 effect]
  B --> C[进入调度队列，异步批量刷新]
  C --> D[重新执行 render 函数]
  D --> E[生成新 VNode 树]
  E --> F[patch 新旧 VNode]
  F --> G[更新真实 DOM]
```

> **面试回答：** 虚拟 DOM 的价值不是「一定更快」，而是让开发者用声明式描述 UI、屏蔽 DOM 操作细节、统一更新流程并支持跨平台。数据变化后生成新 VNode，通过 diff 尽量复用已有节点、减少不必要的 DOM 操作。它不一定比手写 DOM 快，具体 DOM 更新是否重排重绘也取决于内容。

### Vue 首次挂载和更新分别经历什么？mount 和 patch 有什么区别？

- **mount（挂载）**：首次渲染时，根据 VNode 创建真实 DOM 并插入页面。
- **patch（更新）**：更新时，比较新旧 VNode，复用或替换真实 DOM，把差异应用到页面。

patch 的入口判断：

```typescript
function patch(oldVNode, newVNode) {
  if (oldVNode 与 newVNode 不是同一类型 / key 不同) {
    unmount(oldVNode) // 卸载旧节点
    mount(newVNode)   // 挂载新节点
  } else {
    // 复用旧节点对应的真实 DOM，继续按类型比较（更新 props、children 等）
  }
}
```

普通元素节点的 patch 过程：

```text
1. 判断新旧节点是否同类型（type + key）
2. 复用旧节点的真实 DOM
3. 更新 props（class、style、事件、属性等）
4. 更新 children
```

children 的几种情况：

```text
1. 新 children 是文本 → 直接更新 textContent
2. 新 children 是数组 → 进入子节点 diff（带 key 时走列表 diff）
3. 新 children 为空 → 卸载旧子节点
```

> **面试回答：** 首次渲染走 mount，按 VNode 创建真实 DOM；更新走 patch，比较新旧 VNode。patch 先判断 type/key 是否相同：不同就卸载旧节点、挂载新节点；相同就复用 DOM、更新 props、再递归处理 children。

### Vue 的 Diff 算法遵循哪些核心原则？

- **同类型、同 key 的节点通常可以复用**：节点身份没变，只需更新属性和子节点，不必重建 DOM。
- **类型或 key 不同则卸载旧节点、创建新节点**：节点身份已经改变，继续复用会带来错误状态。
- **列表重排与普通节点更新是不同层次的问题**：普通节点 diff 处理「这一个节点变没变」，列表 diff 处理「一批节点的身份映射、复用、移动、增删」。
- **性能与准确性之间的取舍**：Vue 选择「只比较同层节点」而不是求两棵树的最小编辑距离。全量树 diff 的最优解复杂度高（O(n³) 级别），同层比较 + 启发式策略把复杂度降到接近 O(n)，代价是跨层级移动会被当成「卸载重建」——真实业务里跨层移动很少见，这个取舍合理。

只比较同层的原因：跨层级比较成本太高，且真实业务中跨层移动不常见。

```html
<!-- 这种跨层变化：卸载旧 div，重新挂载 section -->
<div><p>A</p></div>
<section><p>A</p></section>
```

> **面试回答：** Diff 的核心是「同层比较 + 同类型/key 复用 + 不同类型卸载重建」。它不做跨层的最优编辑距离计算，而是用启发式策略把复杂度降到接近 O(n)；列表节点再用 key 映射身份，与普通节点的属性更新分开处理。

### Vue3 的列表 Diff 是如何工作的？为什么用最长递增子序列？

针对有 key 的子节点 diff，Vue3 的核心流程分两个层次理解。

#### 概念理解版

列表 diff 要解决的核心问题：**新列表里的每个节点，对应旧列表里的哪个节点？** 因此需要「节点身份映射」。

- **为什么需要身份映射**：只有知道新节点 B 其实是旧节点 B，才能复用它并决定是否移动，而不是「卸载旧的、创建新的」。
- **为什么 LIS 能减少移动**：如果新列表里有若干节点，它们在旧列表里的相对顺序已经是递增的，那这些节点保持不动即可，只需移动其余节点。找到这样一组「顺序保持不变的节点」就是求最长递增子序列。

#### Vue3 实现版（带 key 子节点 diff 的关键阶段）

```text
1. 从新旧子节点列表头部开始同步（i 递增），跳过相同节点
2. 从尾部同步（e1、e2 递减），跳过相同节点
3. 旧节点已耗尽、新节点还有剩余 → 挂载新增节点（带正确锚点）
4. 新节点已耗尽、旧节点还有剩余 → 卸载多余节点
5. 对中间未匹配区间，建立「新节点 key → 新索引」的映射
6. 遍历中间旧节点：能在映射里找到则复用/更新，找不到则卸载
7. 构建 source 数组（新节点对应旧节点位置），求最长递增子序列
8. 从后向前遍历中间新节点：LIS 之外的节点执行移动或新增（从后向前保证锚点正确）
```

`source` 数组与 LIS 的约定：

```text
旧中间：B C D E
新中间：C B D E

旧节点索引：B=0, C=1, D=2, E=3
source[i] = 新位置 i 的节点在旧列表的索引 + 1（0 表示新增、没有对应旧节点）
  C → 1+1 = 2
  B → 0+1 = 1
  D → 2+1 = 3
  E → 3+1 = 4
source = [2, 1, 3, 4]
```

对这个 `source` 求**值严格递增**的最长递增子序列，返回的是**下标**：

```text
source = [2, 1, 3, 4]
值递增的子序列：
  [2, 3, 4] → 下标 [0, 2, 3]（对应新节点 C、D、E）
  [1, 3, 4] → 下标 [1, 2, 3]（对应新节点 B、D、E）
```

- `source[i]` 的值是「旧索引 + 1」，`0` 表示该新节点在旧列表中没有对应，需要挂载。
- LIS 求的是「值严格递增」的**下标序列**，这些下标对应的新节点在旧列表中的相对顺序是递增的，可以**保持不动**，其余节点再移动或新增。
- 上例中 `[0, 2, 3]`（C、D、E）保持不动，只有 B 需要移动到 C 之后——与「旧 B C D E → 新 C B D E 只有 B 移动」一致。

> **面试回答：** Vue3 列表 diff 先头尾同步跳过稳定部分，再处理新增/卸载，中间乱序区间用 key 建映射、构建 source（旧索引 + 1，0 表示新增），求 source 的最长递增子序列下标，这些下标对应的节点保持不动，其余从后向前移动/挂载。LIS 的意义是「找出一组相对顺序不变的节点」，从而减少真实 DOM 移动次数。

### 为什么列表渲染需要稳定的 key？为什么不推荐用 index？

key 是**节点或组件身份的标识**，diff 靠它判断「新列表的某个节点是否是旧列表里的同一个节点」。

- 没有 key 时，Vue 只能按位置「就地复用」，第 0 个更新成第 0 个、第 1 个更新成第 1 个……列表插入/删除/重排时就会错误复用。

```text
旧：A B C
新：B C A
没有 key → 误认为 A→B、B→C、C→A 三个就地更新（实际应该移动）
```

典型副作用：动态列表里输入框内容错位、组件状态错乱、动画异常、表单数据错乱。

```html
<li v-for="item in list" :key="item.id">
  <input :value="item.name" />
</li>
<!-- 用稳定业务 id 作为 key，避免输入框内容错位 -->
```

**为什么不推荐用 `index` 作 key**：index 不是稳定身份。头部插入元素后，所有后续元素的 index 都变了，Vue 会误以为「旧 index=0 的 A 就是新 index=0 的 D」，导致错误复用。

```text
index: 0 1 2
item:  A B C
头部插入 D 后：
index: 0 1 2 3
item:  D A B C
```

边界：

- **不能绝对地说「所有用 index 的列表都错」**：列表静态、不增删不重排、且节点没有内部状态（输入框、动画、组件实例）时，用 index 通常不会出错。但列表会插入/删除/排序时，index 就可能引发错误复用。
- **key 改变可能导致组件实例重建**：diff 判断「同类型 + 同 key」才复用组件实例；key 变了，旧实例被卸载、新实例被创建，内部 state、DOM 状态都会重置。

> **面试回答：** key 是节点身份标识，diff 靠它判断新旧列表的对应关系；没有 key 只能就地复用，插入/删除时会错位（输入框内容错乱等）。index 会随插入/排序变化，不是稳定身份，所以动态列表要用业务 id。key 变了会导致组件实例重建、状态重置。

### Vue3 在编译阶段做了哪些优化？

这些优化是「编译期生成信息 + 运行期使用信息」，目标是让更新更有针对性，**不意味着 Vue3 不再需要 VNode 和 Diff**：

- **静态提升**：把不依赖响应式数据的静态 VNode 提升到 render 函数外，避免每次渲染重复创建，复用同一份。
- **Patch Flags**：给动态节点打标记（`1 /* TEXT */`、`2 /* CLASS */`、`8 /* PROPS */` 等），运行期只处理被标记的动态部分，跳过静态 props 比较。
- **Block Tree**：以 Block 为单位收集「动态后代节点」存进 `dynamicChildren`，更新时直接遍历动态节点，跳过整片静态子树。
- **事件缓存（cacheHandlers）**：把内联事件函数缓存到 `_cache`，避免每次渲染创建新函数，减少不必要的子组件更新。

```html
<div :class="{ active: isActive }"></div>
```

`isActive` 变化时，因为节点带 CLASS 的 Patch Flag，运行期只更新 class，不会重新比较整个节点。

这些优化让「整棵树的递归 diff」变成「优先处理已标记的动态部分」，但列表乱序等场景仍要走 key 映射 + LIS 的完整 diff；编译优化缩小了 diff 范围，没有消灭 diff。

> **面试回答：** 编译期做四件事：静态提升（静态 VNode 复用）、Patch Flags（标记动态部分）、Block Tree（收集动态后代、跳过静态子树）、事件缓存。运行时据此只更新被标记的动态节点，缩小 diff 范围，但列表乱序仍需完整 diff。

### Diff 小结

```text
第一层 基础原则：patch 判断节点类型/key，同类型复用、不同类型卸载重建；只比较同层。
第二层 列表 Diff：头尾同步跳过稳定部分 → 处理新增/卸载 → 中间乱序用 key 映射 + 最长递增子序列减少移动。
第三层 Vue3 编译优化：静态提升、Patch Flags、Block Tree、事件缓存，缩小运行时 diff 范围。
```

---

## 四、Composition API 与逻辑复用

### 为什么引入 Composition API

Options API 按选项组织代码，**同一个业务功能的状态、计算、方法、生命周期会分散在多个选项里**。组件一复杂，阅读和修改都要在 `data`、`computed`、`methods`、`created/mounted` 之间反复横跳：

```javascript
export default {
  data() { return { count: 0, keyword: '', list: [] } },
  computed: { doubleCount() { return this.count * 2 } },
  methods: { increment() { this.count++ }, async search() { /* ... */ } },
  created() { this.search() }
}
```

当「计数」和「搜索」两个功能混在同一个组件里时，这种写法会让它们互相交织，难以定位。

Composition API 把**同一功能的状态、逻辑、生命周期聚在一起**，并按业务功能组织：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)
const increment = () => { count.value++ }
</script>
```

核心价值：

- **逻辑组织和复用**：复杂组件的代码按功能聚合，可复用的逻辑可以抽成 composable。
- **改善 TypeScript 类型推导**：composable 是普通函数，参数和返回值类型自然推导，不需要 mixin 那种隐式合并。
- **主要价值不是「减少代码行数」**，而是「按功能组织 + 可复用」。

边界：

- **Options API 仍然可用**，Vue3 没有移除它，两者甚至可混用。
- **不是所有组件都必须用同一套组织方式**：简单组件用 Options API 也很清晰。
- 真正要解决的是「逻辑分散、难以复用」的问题，而不是为用而用。

> **面试回答：** Options API 按选项拆分，同一功能的逻辑会散落在 data/computed/methods/生命周期里，组件复杂后难以维护和复用。Composition API 按业务功能聚合，可抽成 composable 复用，TS 类型推导也更好。它的价值是逻辑组织和复用，不是减少行数；Options API 仍然可用。

### 什么是 composable？它如何实现逻辑复用？

composable 是把一组相关状态和行为封装成的**普通函数**，不需要组件实例：

```typescript
// useMessage.ts
import { ref, onMounted } from 'vue'

export function useMessage() {
  const message = ref('Hello World')
  onMounted(() => console.log(message.value))
  return { message }
}
```

```vue
<script setup lang="ts">
import { useMessage } from './useMessage'
const { message } = useMessage()
</script>

<template>
  <p>{{ message }}</p>
</template>
```

关键细节：

- **composable 与组件的关系**：composable 是「可复用的、带响应式状态和生命周期依赖的逻辑单元」；组件调用它后，其状态和钩子就「挂载」到当前组件实例上。所以 `onMounted` 等钩子要在组件上下文中同步调用。
- **多次调用时状态不一定共享**：每次调用 `useMessage()` 都会新建一套 `ref` 和钩子，**默认不共享状态**。要跨组件共享，需把状态提升到模块级单例或放进 store。
- **为什么 composable 不天然等于单例**：它只是普通函数，函数内部的 `ref` 是每次调用新建的局部变量。只有把 `ref` 定义在模块作用域，才变成全局共享。
- **生命周期、watcher 要在正确的组件上下文中同步调用**：`onMounted`、`watchEffect` 等依赖「当前活跃组件实例」，放到 `setTimeout`、`Promise.then` 等异步回调里会脱离组件上下文，导致钩子不生效或挂到错误实例。
- **资源清理**：请求取消（AbortController）、事件监听（`addEventListener`）、定时器，都要在 `onBeforeUnmount`（或 `watchEffect` 的 cleanup）里清理。

业务例子：

```typescript
// usePagination.ts
export function usePagination() {
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  function reset() { page.value = 1 }
  return { page, pageSize, total, reset }
}

// useSearch.ts：取消旧请求，只接受最新结果
import { ref, watch, onBeforeUnmount } from 'vue'

export function useSearch<T>(fetcher: (keyword: string, signal: AbortSignal) => Promise<T[]>) {
  const keyword = ref('')
  const results = ref<T[]>([])
  let controller: AbortController | null = null

  watch(keyword, async (value) => {
    controller?.abort()                 // 取消上一次请求
    controller = new AbortController()  // 为本次请求创建取消信号
    try {
      results.value = await fetcher(value, controller.signal)
    } catch (err) {
      // 已取消的请求（AbortError）直接忽略，不写入结果
      if (err instanceof DOMException && err.name === 'AbortError') return
      throw err
    }
  })

  onBeforeUnmount(() => controller?.abort()) // 卸载时取消进行中的请求
  return { keyword, results }
}
```

上面的取消逻辑依赖 `fetcher` 正确把 `signal` 传给请求；若 fetcher 不支持取消，则改用「请求序号」：只有最新序号的结果才写入，避免过期结果覆盖。

> **面试回答：** composable 是把一组响应式状态和生命周期逻辑封装成的普通函数，组件调用后这些状态和钩子挂到当前实例上。每次调用默认新建一套状态，不共享；要共享就提升到模块级或 store。内部的钩子和 watcher 必须在组件上下文同步调用，资源要在卸载时清理。

### Composition API 与 mixin 有什么区别？

Composition API 用「函数封装 + 显式返回值」复用逻辑，和 mixin 相比：

| 维度 | mixin | composable |
| --- | --- | --- |
| 来源可追溯 | 隐式合并，来源难辨 | 显式引入和返回值，来源清晰 |
| 命名冲突 | 多个 mixin 的同名属性/方法可能互相覆盖 | 每个函数独立作用域，显式重命名 |
| 类型推导 | 差，隐式注入难以推导 | 好，普通函数天然可推导 |
| 组织方式 | 生命周期/数据分散 | 按功能聚合 |

普通函数封装、逻辑组合、显式返回值、避免命名冲突，是 composable 相比 mixin 的核心优势。`setup` 本身可以看作「一次函数式组织逻辑」的入口，`<script setup>` 是其编译期糖。

> **面试回答：** mixin 隐式合并属性，来源难追溯、同名会冲突、类型推导差；composable 是普通函数，显式引入和返回值、作用域独立、类型可推导。这是 Composition API 相比 mixin 在复用上的核心优势。

---

## 五、组件设计与组件通信

### 你如何理解 Vue 组件？如何设计可复用的组件？

组件是 Vue 应用的基础构建块，把模板、逻辑、样式封装成独立、可复用的单元。除「封装 + 复用」外，更值得关注**组件设计边界**：

- **清晰的输入/输出/插槽边界**：用 `props` 声明输入，用 `emit` 声明输出，用 slot 开放可定制的内容，三者构成稳定的对外契约。
- **区分容器组件与展示组件**：容器组件负责取数据、编排业务、持有状态；展示组件只接收 props、发出事件，不直接请求接口、不绑定业务 store。
- **基础展示组件不应无条件绑定某个业务 store 或接口**：否则换个页面复用就得把 store 和接口一起带过去。例如 `UserTable` 不应内部请求 `/api/users`，应由页面取数据后把 `rows`、`loading` 传进来，通过 `page-change`、`sort-change` 把用户意图抛出去。
- **让组件更易复用、测试、维护**：输入输出明确、无隐式依赖、单一职责的组件，单测和复用都更简单。

> **面试回答：** 组件是把模板、逻辑、样式封装成的可复用单元。设计上要定义清晰的 props（输入）、emit（输出）、slot（定制）边界，区分容器组件和展示组件；基础展示组件不直接绑定业务 store 或接口，只接收 props 发事件，这样才容易复用和测试。

### Vue 组件之间有哪些通信方式？如何选择？

先判断**状态归属**，再决定传递方式。

| 场景 | 方式 | 边界 |
| --- | --- | --- |
| 父 → 子传数据 | `props` | 子组件只读，不直接修改 |
| 子 → 父通知 | `emit` | 父组件决定如何更新状态 |
| 父子双向绑定 | `v-model` | 本质仍是 prop 向下 + 事件向上 |
| 祖先向深层后代提供局部能力 | `provide/inject` | 主题、表单上下文、组件库上下文 |
| 父组件命令式调用子组件 | template ref + `defineExpose` | 只暴露聚焦、重置、提交等明确动作 |
| 跨页面/跨模块共享状态 | Pinia | 登录用户、权限、购物车、全局筛选 |
| 临时跨模块通知 | `mitt` 等事件总线 | 统一注册与销毁，不承载核心状态 |

选型原则：

- 明确父子通信优先 `props` + `emit`。
- 多层后代共享局部上下文考虑 `provide/inject`。
- 跨页面或跨业务模块共享状态考虑 Pinia。
- 模板引用只暴露明确的命令式能力，不传核心业务数据。
- 事件总线只做必要的临时通知，不应无节制地承担核心业务状态。

典型父子组件：

```vue
<!-- Counter.vue -->
<script setup lang="ts">
const props = defineProps<{ count: number }>()
const emit = defineEmits<{ increment: [] }>()
</script>

<template>
  <button @click="emit('increment')">count: {{ props.count }}</button>
</template>
```

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import Counter from './Counter.vue'

const count = ref(0)
</script>

<template>
  <Counter :count="count" @increment="count += 1" />
</template>
```

`provide/inject` 适合「后代需要同一份上下文，但中间组件不关心」的情况，例如表单项拿到表单实例。它不应替代所有 props：依赖变隐式后，组件脱离当前树就不易复用。提供响应式值时直接提供 `ref` 或 `readonly(ref)`，不要提供某一刻的普通值：

```typescript
type FormState = { name: string; email: string }

// Form.vue
const formState = reactive<FormState>({ name: '', email: '' })
provide('formState', readonly(formState))

// FormItem.vue
const formState = inject<Readonly<FormState>>('formState')
if (!formState) throw new Error('FormItem must be used inside Form')
```

template ref 是命令式 escape hatch，不用它传业务数据。Vue 3 默认不暴露 `<script setup>` 子组件内部变量，需要显式 `defineExpose`：

```vue
<!-- SearchInput.vue -->
<script setup lang="ts">
const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })
</script>
```

> **面试回答：** 先判断状态归属：父子的用 props + emit；深层局部上下文用 provide/inject；跨页面状态放 Pinia；ref 只暴露 focus、reset 这类命令式能力；事件总线只处理临时通知。核心是保证数据来源唯一、更新路径可追踪，不为省事无差别上全局 store。

### 什么是单向数据流？为什么子组件不能直接修改 props？

Vue 的单向数据流是 `父组件 state → props → 子组件 view`。子组件不能直接改 prop，因为 prop 的真实所有者在父组件，子组件直接改即使暂时生效，也会在父组件下次重渲染时被覆盖。Vue 对直接修改 prop 会警告。

**为什么要有单一来源与可追踪更新路径**：数据只有一个可信来源，更新都通过明确的 emit 走回拥有者，才容易追踪「谁在什么时候改了什么」。

边界情况：

- **props 的只读保护并不等于嵌套对象不可修改**：`props.user.name = 'x'` 这类对嵌套成员的修改 Vue 通常不报错（只警告顶层赋值），它会直接改到父组件的对象上，破坏单向数据流。真正需要修改时应 emit 一个新的值或深拷贝。
- **直接修改共享对象的嵌套成员可能影响父组件**：因为 props 传的是引用。
- **「prop 派生本地状态」和「复制编辑草稿」是不同场景**：展示转换用 `computed` 派生即可；用户要编辑则复制一份本地草稿，提交时 emit 结果。
- **prop 更新自动覆盖本地草稿是一种业务策略**，不是所有表单的默认做法：有些场景需要保留用户正在编辑的草稿直到提交，是否覆盖取决于业务。

```vue
<script setup lang="ts">
const props = defineProps<{ initialName: string }>()
const emit = defineEmits<{ save: [name: string] }>()

const draftName = ref(props.initialName) // 本地草稿
watch(() => props.initialName, value => {
  draftName.value = value // 业务策略：prop 变化时同步草稿（是否覆盖由业务决定）
})
</script>

<template>
  <input v-model="draftName" />
  <button @click="emit('save', draftName)">保存</button>
</template>
```

> **面试回答：** 单向数据流让状态只有父组件一个来源，更新通过 emit 走回拥有者，路径可追踪。子组件直接改 prop 会被父组件重渲染覆盖，还破坏可预测性。要注意 props 传引用时嵌套成员仍可被改到父对象，需要修改时应 emit 新值，编辑草稿则复制本地状态。

### v-model 的实现原理是什么？Vue2 和 Vue3 有什么区别？

`v-model` 不是魔法双向绑定，是「值通过 prop 或 DOM 属性向下传，变化通过事件向上通知」的语法糖。原生文本输入框可理解为：

```vue
<input :value="name" @input="name = $event.target.value" />
```

- 复选框、单选框、`select` 会根据控件使用 `checked`、`change` 等不同属性和事件，不能把所有原生 `v-model` 都机械理解成 `value + input`。
- **v-model 没有违反单向数据流**：它始终是「prop 向下 + 事件向上」，数据仍是单向流转，只是语法上省去了手写绑定和监听。

Vue2：组件默认约定 `value` prop + `input` 事件；自定义名称用 `model` 选项；多值绑定常写 `:title` + `@update:title` 或借助 `.sync`。

```vue
<!-- Vue2 子组件 -->
<script>
export default {
  props: ['value'],
  methods: {
    update(value) {
      this.$emit('input', value)
    }
  }
}
</script>
```

Vue3：统一为 `modelValue` prop + `update:modelValue` 事件，天然支持多个具名 `v-model`，`.sync` 被移除。Vue 3.4 起可用 `defineModel` 减少样板：

```vue
<!-- Parent.vue -->
<UserEditor v-model:name="name" v-model:email="email" />

<!-- UserEditor.vue -->
<script setup lang="ts">
const name = defineModel<string>('name', { required: true })
const email = defineModel<string>('email', { required: true })
</script>

<template>
  <input v-model="name" />
  <input v-model="email" />
</template>
```

不用 `defineModel` 时，Vue3 等价实现是声明 `modelValue` prop，再 `emit('update:modelValue', nextValue)`，子组件并未直接改父组件的 prop。

修饰符（简要）：`.trim` 去首尾空格、`.number` 转数字、`.lazy` 改为 `change` 时同步。

> **面试回答：** v-model 是「prop 向下 + 事件向上」的语法糖，没有违反单向数据流。Vue2 用 value + input（.sync 实现多值），Vue3 统一为 modelValue + update:modelValue 并支持多具名绑定，3.4 起可用 defineModel。子组件始终 emit 更新事件，由父组件决定是否更新。

### 什么是插槽和作用域插槽？作用域插槽如何传递数据？

- **默认插槽 / 具名插槽**：让父组件往子组件的指定位置插入内容。
- **作用域插槽**：子组件把自身数据通过插槽 props 暴露给父组件，父组件用 `v-slot` 接收并渲染，实现「父组件决定结构、子组件提供数据」。

```vue
<!-- List.vue 子组件把 item 暴露给父组件 -->
<script setup lang="ts">
defineProps<{ items: { id: number; name: string }[] }>()
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" /> <!-- 作用域插槽 -->
    </li>
  </ul>
</template>
```

```vue
<List :items="list" v-slot="{ item }">
  <span>{{ item.name }}</span>
</List>
```

原理：插槽本质是**函数**——具名插槽编译成 `slots` 对象，作用域插槽的「插槽 props」就是调用这个插槽函数时传入的参数。`<slot :item="item">` 编译后相当于调用 `slots.default({ item })`。

使用场景：表格自定义列、表单自定义控件渲染、列表项自定义内容等「结构由父组件决定、数据在子组件」的场景。

> **面试回答：** 插槽让父组件向子组件指定位置插入内容；作用域插槽让子组件把自身数据通过插槽 props 传给父组件，父组件用 v-slot 接收后决定怎么渲染。插槽本质是函数，作用域插槽 props 就是调用该函数时传的参数，适合「父组件定结构、子组件供数据」的场景。

### Vue 组件何时会重新渲染？父组件更新子组件一定更新吗？

组件重新渲染（其渲染 effect 重新执行）的根本条件：**组件渲染时读取过的响应式数据发生了变化**。

- 只有渲染函数（或模板编译出的 render）实际读到的响应式数据，才被收集为组件渲染 effect 的依赖。
- 修改了组件内某个「从未在模板中读取」的 ref，不会触发该组件更新。
- `props` 变化会触发子组件更新（因为 props 是响应式的，且子组件渲染读到了它）；但 **Vue 对 props 更新有优化**：若子组件的 props 都是稳定值（未被父组件动态修改），或配合 `v-memo` 等条件，子组件可能跳过重渲染。
- **父组件更新时子组件不必然更新**：只有当子组件接收的 props 或自身依赖变化时才会更新；父组件重渲染本身不会无条件重渲染所有后代。不过要区分：无状态优化依赖编译期 Patch Flags（动态 props 才标记），若父组件每次都传新的对象/数组字面量，子组件仍会重新更新。

> **面试回答：** 组件重新渲染的条件是「它渲染时读到的响应式数据变了」。父组件更新不会无条件触发所有子组件更新，只有子组件接收的 props 或自身依赖变化才更新；编译期 Patch Flags 会让「props 稳定」的子组件跳过重渲染，但父组件每次传新对象字面量仍会触发子组件更新。

### 模板引用和 defineExpose 有什么作用？父组件如何调用子组件方法？

- `ref` 模板引用用于拿到子组件实例或 DOM 元素，暴露命令式能力。
- `<script setup>` 默认封闭，`defineExpose` 显式声明可被父组件访问的成员。
- 只暴露 `focus`、`reset`、`submit` 这类明确动作，不要暴露内部状态让父组件随意改，否则破坏单向数据流。

```vue
<!-- SearchInput.vue -->
<script setup lang="ts">
const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })
</script>

<!-- Parent.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import SearchInput from './SearchInput.vue'
const inputRef = ref<InstanceType<typeof SearchInput>>()
const focus = () => inputRef.value?.focus()
</script>
```

> **面试回答：** 模板 ref 拿到子组件实例或 DOM 元素；`<script setup>` 默认不暴露内部成员，子组件用 defineExpose 声明要暴露的命令式方法（如 focus、reset）。父组件通过 ref 调用这些方法，但只应暴露明确动作，不暴露内部状态。

---

## 六、生命周期、内置组件与指令

### Vue3 组件有哪些生命周期？各阶段适合做什么？

生命周期钩子是一条时间线：

```text
setup 阶段（组件初始化，同步执行）
   ↓
onBeforeMount（挂载前，DOM 尚未创建）
   ↓
onMounted（DOM 已挂载）
   ↓
（数据变化）onBeforeUpdate（DOM 更新前）
   ↓
onUpdated（DOM 更新后）
   ↓
onBeforeUnmount（卸载前）
   ↓
onUnmounted（已卸载）
   ↓
（KeepAlive 下）onDeactivated（失活进入缓存）/ onActivated（重新激活）
```

- **`setup` 不是生命周期钩子**，它是 Composition API 的入口（替代 Options API 的 `beforeCreate`/`created` 阶段），在其中定义响应式数据、computed、watch，或调用 composable。它同步执行，此时组件实例还没挂载。
- **各阶段用途**：`onMounted` 适合请求接口、访问 DOM、初始化图表/地图/第三方插件；`onBeforeUpdate` 适合保存旧 DOM 状态（如滚动位置）；`onUpdated` 适合基于最新 DOM 操作，但**不要在 `onUpdated` 里随意修改响应式状态**，否则可能触发无限循环更新。
- **资源清理放对时机**：定时器、事件监听、请求、第三方实例的销毁放在 `onBeforeUnmount`（卸载前还能访问组件状态和 DOM）。
- **SSR 环境限制**：服务端渲染时 `setup` 及组件初始化逻辑仍会执行，但 `onBeforeMount`、`onMounted`、`onUpdated`、`onUnmounted` 等与浏览器 DOM 相关的钩子不会在服务端执行；依赖 `window`/`document` 的逻辑应放在这些客户端钩子里。
- **钩子与 watcher 对组件上下文的依赖**：`onMounted`、`watchEffect` 等需要在组件实例上下文中同步调用。

> **面试回答：** 生命周期按「挂载前 → 挂载后 → 更新前 → 更新后 → 卸载前 → 卸载后」的顺序执行。setup 是入口不是钩子；DOM 相关操作放 onMounted；更新前保存旧状态放 onBeforeUpdate；资源清理放 onBeforeUnmount；KeepAlive 用 onActivated/onDeactivated。SSR 下浏览器 DOM 相关钩子不执行。

### v-if 和 v-show 有什么区别？如何选择？

| 维度 | `v-if` | `v-show` |
| --- | --- | --- |
| 实现方式 | 条件为假时**不挂载**子树（DOM 不存在） | 始终挂载，通过 CSS `display:none` 隐藏 |
| 切换成本 | 高（创建/卸载组件实例） | 低（只切 CSS） |
| 初始成本 | 低（假时完全不渲染） | 高（初始就渲染） |
| 生命周期 | 切换触发挂载/卸载钩子 | 切换不触发生命周期 |
| 适用场景 | 不常切换、条件渲染、需全新状态 | 频繁切换、大内容显示隐藏 |

- `v-if` 控制的是「子树是否挂载」，条件变化会创建或卸载组件实例；**不要把 `v-if` 描述成每次切换都重新编译整个模板**——模板编译结果已缓存，切换只是挂载/卸载实例。
- 选择看「切换频率 + 组件状态 + 生命周期 + 初始成本」：频繁切换用 `v-show`，不常切换或需要每次全新状态用 `v-if`。

> **面试回答：** v-if 条件为假时不挂载子树，切换有创建/卸载成本并触发生命周期；v-show 始终挂载，只用 display 切换，初始成本高但切换成本低。频繁切换用 v-show，不常切换或需要每次全新状态用 v-if。

### KeepAlive 有什么作用？失活和卸载有什么区别？

KeepAlive 缓存动态组件的实例：切换时**不卸载**，进入缓存；再次渲染时从缓存激活，避免重新创建实例。

- 首次创建仍触发 `onBeforeMount`/`onMounted`；实例最终被清除时仍触发卸载钩子。
- **失活不等于卸载**：失活时实例和状态保留，只是从 DOM 移除，进入缓存。
- `onActivated()`：从缓存重新插入 DOM 时调用，适合恢复滚动位置或按需刷新数据。
- `onDeactivated()`：从 DOM 移除进入缓存时调用，适合暂停轮询、视频、订阅。
- 定时器、轮询、视频、WebSocket 订阅等资源在失活时通常要**暂停**，激活时**恢复**，避免缓存期间后台继续消耗资源。
- `include`/`exclude` 按**组件名称**匹配控制缓存范围；`max` 限制最多缓存实例数，超出时按 LRU 淘汰最久未访问的缓存。

```html
<KeepAlive include="MyComponent">
  <component :is="currentComponent" />
</KeepAlive>
```

| 对比 | 普通卸载 | KeepAlive 失活 |
| --- | --- | --- |
| 组件实例 | 销毁 | 保留 |
| DOM | 移除 | 移除 |
| 状态 | 丢失 | 保留 |
| 钩子 | `onBeforeUnmount`/`onUnmounted` | `onDeactivated`/`onActivated` |

> **面试回答：** KeepAlive 缓存组件实例，切换时不卸载、进入缓存，再切回时激活复用，走 onDeactivated/onActivated 而不是卸载钩子。失活是保留实例和状态、只移出 DOM；要在失活时暂停轮询/订阅，激活时恢复。include/exclude 按组件名匹配，max 限制缓存数量。

### Teleport 解决什么问题？它会改变组件的逻辑层级吗？

`Teleport` 把某块 DOM 渲染到指定目标位置，**组件逻辑层级不变，只是 DOM 挂载位置改变**。用于弹窗、遮罩、通知这类「在逻辑上属于某组件、但 DOM 上应脱离父容器」的场景，避免被父级 `overflow`、定位、z-index 影响。

```html
<Teleport to="body">
  <div class="modal">...</div>
</Teleport>
```

- `to` 指定目标选择器或 DOM 节点（必填，没有默认目标）。
- 逻辑上事件、props、上下文仍属于原组件树，只有 DOM 位置变了。
- SSR 下需要确保 `to` 指向的目标在 hydration 时已存在，否则客户端和服务端内容不一致。

> **面试回答：** Teleport 用 `to` 把一块 DOM 渲染到指定目标（如 body），解决弹窗被父级 overflow/z-index 裁剪的问题。它只改 DOM 挂载位置，不改变组件的逻辑层级，事件和上下文仍属于原组件。

### Transition 有什么作用？列表过渡用哪个组件？

`Transition` 为**单个元素或组件**的进入、离开应用过渡：

- 机制：在元素插入/移除前后，自动添加/移除 CSS 过渡类名（如 `v-enter-from`、`v-enter-active`、`v-enter-to`），或调用 JS 钩子。
- 它本身不做 CSS，只负责**在正确的时机挂/摘类名或调用钩子**，动画细节由 CSS 或 JS 完成。

**列表项目的增删、移动过渡用 `TransitionGroup`**，它会给列表项应用过渡并处理移动动画：

```html
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</TransitionGroup>
```

> **面试回答：** Transition 处理单元素/组件的进入离开过渡，通过在正确时机挂摘类名或调用 JS 钩子工作；列表的增删、移动过渡用 TransitionGroup。两者本身不做动画，只负责时机，动画由 CSS/JS 完成。

### 什么时候用自定义指令？它与组件、composable 有什么区别？

`v-focus`、`v-permission` 这类自定义指令用于「需要直接操作 DOM 的命令式逻辑」。适用边界：

- **适合**：聚焦、权限显隐、点击外部关闭、埋点等和具体 DOM 元素强相关的操作。
- **不适合替代组件**：复杂结构、模板、样式、逻辑复用应交给组件。
- **不适合替代 composable**：涉及响应式状态、可复用逻辑应写成 composable；指令里维护状态容易产生隐式耦合。

> **面试回答：** 自定义指令只适合「直接操作 DOM 的命令式逻辑」，如聚焦、权限显隐、点击外部关闭。复杂结构用组件，涉及响应式状态和可复用逻辑用 composable，不要把指令当成组件或 composable 的替代。

### Vue3 中可以在同一元素同时用 v-if 和 v-for 吗？

**Vue3 中二者用于同一元素时，`v-if` 优先级高于 `v-for`**，因此 `v-if` 无法访问 `v-for` 的循环变量（这是与 Vue2 的差异：Vue2 里 `v-for` 优先级更高）。

```vue
<!-- 错误：Vue3 中 v-if 拿不到 item，会报错或得不到预期结果 -->
<li v-for="item in items" v-if="item.active" :key="item.id">{{ item.name }}</li>
```

更合理的写法：

- 要「过滤列表」，用 `computed` 先过滤再 `v-for`。
- 要「整体条件渲染列表」，把 `v-if` 放到外层容器或 `<template>` 上。

```vue
<!-- 推荐：computed 过滤 -->
<li v-for="item in activeItems" :key="item.id">{{ item.name }}</li>

<!-- 推荐：整体条件渲染放到外层 -->
<template v-if="items.length">
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</template>
```

> **面试回答：** Vue3 中 v-if 优先级高于 v-for，所以 v-if 拿不到循环变量，二者不要放同一元素。过滤列表用 computed 提前算好再 v-for；整体控制渲染把 v-if 放外层 template 或容器上。

---

## 七、状态管理与路由

### Vuex 和 Pinia 有什么区别？如何选择？

Vuex（Options 风格）：

```javascript
import { createStore } from 'vuex'

export default createStore({
  state() { return { count: 0 } },
  getters: { doubleCount(state) { return state.count * 2 } }, // 类似 computed
  mutations: { increment(state) { state.count++ } },          // 唯一能改 state 的地方
  actions: {
    async incrementAsync({ commit }) {
      await Promise.resolve()
      commit('increment') // 异步流程结束后再 commit mutation
    }
  }
})
```

Pinia（推荐 Composition 风格）：

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)

  function increment() { count.value++ }         // 直接改 state
  async function incrementAsync() {
    await Promise.resolve()
    count.value++
  }

  return { count, doubleCount, increment, incrementAsync }
})
```

核心差异与设计原因：

- **Vuex 的 state/getters/mutations/actions 职责**：`state` 存数据，`getters` 派生（类似 computed），`mutations` 同步改 state，`actions` 处理异步并提交 mutation。
- **为什么 Vuex 用 mutation 管同步变更、异步放 action**：强制所有状态变更都走 `mutation`，配合 DevTools 记录每一次同步变更，便于调试和时间旅行；异步逻辑放在 action 里，最终仍通过 commit 落到 mutation。
- **为什么 Pinia 不再强制 mutations**：Vue3 的响应式系统让「直接改 state」也能被可靠追踪，DevTools 同样能记录，mutation 的「唯一入口」约束不再必要，去掉后模板代码更少。
- **Pinia 的 action 如何组织业务逻辑**：action 就是普通函数，同步异步皆可，直接改 state；可以写 `loadUsers`、`login` 这类有业务语义的方法。
- **天然多 store + 无 namespace**：Vuex 是一个根 store 加 modules（复杂时处理 namespace）；Pinia 是多个独立 store，各自 `defineStore` + `useXxxStore` 引入。

> **面试回答：** Vuex 有 state/getters/mutations/actions，改 state 必须 commit mutation，异步放 action，模块化要处理 namespace，写法偏重；Pinia 去掉 mutations，action 直接改 state，天然多 store、无 namespace，TS 和 Composition API 体验更好。Vue3 新项目默认选 Pinia。

### 为什么直接解构 store 会丢响应式？storeToRefs 有什么用？

- **解构 state 会破坏响应式**：直接 `const { count } = store` 拿到的是当时的值（非响应式）。用 `storeToRefs(store)` 把 state/getter 转成 ref，保留响应式关联。
- **action 可以直接从 store 解构**：Pinia 的 action 已绑定到 store，`const { increment } = store` 后调用 `increment()` 不会丢失 `this`。`storeToRefs()` 只提取 state 和 getter，**不含 action**，所以不应该用 storeToRefs 处理 action。
- **哪些状态进 store、哪些留组件/composable**：跨页面、跨模块共享且需要单一来源的（登录用户、权限、购物车、全局筛选）进 store；组件私有 UI 状态、表单草稿、局部交互状态留组件或 composable。
- **不要把所有业务状态无差别塞进全局 store**：全局状态越多，耦合和追踪成本越高，也容易产生「谁都能改」的混乱。原则是「先局部，确实需要跨模块共享再提升」。

```typescript
import { storeToRefs } from 'pinia'
const store = useCounterStore()

const { count, doubleCount } = storeToRefs(store) // state/getter 保持响应式
const { increment } = store                        // action 直接解构即可
```

> **面试回答：** 直接解构 store 的 state 会拿到非响应式的普通值，用 storeToRefs 把 state 和 getter 转成 ref 保持响应式；action 已绑定 store，可以直接解构调用，storeToRefs 不包含 action。状态只把「跨模块共享且需要单一来源」的放进 store，局部状态留在组件或 composable。

### Vue Router 的 hash 和 history 模式有什么区别？

| 维度 | Hash | History |
| --- | --- | --- |
| URL 形式 | `#/user/1` | `/user/1` |
| 服务端请求 | `#` 后内容不发给服务器 | 刷新会真实请求该路径 |
| 刷新/回退 | 一般无需服务端配置 | 需要服务端回退到 `index.html` |
| 监听机制 | `hashchange` | `popstate` |
| SEO | 两者都不天然利于 SEO | 同左，SSR/预渲染才能稳定抓取 |

Hash 模式把路径放在 `#` 后面，切换触发 `hashchange`，`#` 后内容不随 HTTP 请求发送，因此刷新通常无需服务端配置，但 URL 不够自然。

History 模式用 `history.pushState()` / `replaceState()` 改地址，通过 `popstate` 响应前进后退：

- **为什么需要服务器回退规则**：刷新 `/user/1` 时浏览器会真的请求该路径，若服务端不把它回退到 `index.html`，就会 404。

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

- **`pushState()` 不会触发 `popstate`**：`pushState` 只改地址和历史记录，不派发 `popstate` 事件；只有浏览器前进/后退（或 `history.back`/`forward`）才会触发 `popstate`。
- **前端路由为何能切换页面却不做完整文档导航**：切换时前端拦截路由变化，用组件渲染替换内容，不请求新 HTML 文档，所以不会整页刷新。
- **SPA 路由与 SSR 不是同一概念**：SPA 是「客户端渲染 + 前端路由」的架构，SSR 是「服务端渲染出 HTML」，两者可以组合（SSR 应用同样用前端路由）。

> **面试回答：** hash 模式把路径放 # 后，不发给服务器，刷新无需配置，用 hashchange 监听；history 模式用 pushState 改地址，URL 更干净但刷新会真实请求路径，需要服务端回退到 index.html，用 popstate 监听前进后退。pushState 本身不触发 popstate。

### 路由权限应该怎么设计？为什么还需要后端鉴权？

路由守卫不应只写成「没有 token 就跳登录」，至少要区分：未登录、已登录但权限未加载、无权限、登录页回跳、接口 token 失效。

```typescript
router.beforeEach(async to => {
  const auth = useAuthStore()

  // 未登录访问受保护页面
  if (!auth.token && to.meta.requiresAuth) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 已登录但权限/路由还没加载，先加载再重新进入，避免错误跳转
  if (auth.token && !auth.routesReady) {
    await auth.loadProfileAndRoutes()
    return { ...to, replace: true }
  }

  // 无权限访问
  if (to.meta.permissions && !auth.hasAll(to.meta.permissions)) {
    return { name: 'forbidden', replace: true }
  }
})
```

关键场景：

- **未登录**：跳登录并记录 `redirect`，登录后回跳原目标。
- **权限尚未加载**：先加载用户信息和权限码，再 `replace` 回到目标，避免「误判未登录」或「跳到 404」。
- **动态路由防重复注册**：`router.addRoute()` 前判断路由名是否已存在，或在加载函数里做幂等，避免重复注册和导航循环。
- **刷新恢复**：刷新后内存路由表丢失，守卫里要先恢复用户/权限状态和动态路由，再放行。
- **无权访问**：跳 403 或降级页面，而不是静默跳登录。
- **前后端权限边界**：前端路由守卫只是「用户体验 + 前端访问流程」的一部分，用于隐藏无权限菜单、避免无效跳转；**真正的接口权限和数据访问控制必须由后端校验**，不能只靠前端隐藏页面或检查 token。

路由组件用动态 `import()` 分包；动态参数从 `/users/1` 切到 `/users/2` 时，同一组件实例通常复用，依赖参数重新请求数据要 `watch(() => route.params.id)` 或组件内守卫，不能只依赖 `onMounted`。

> **面试回答：** 路由守卫要区分未登录（跳登录带回跳）、权限未加载（先加载再 replace）、无权限（跳 403）、刷新恢复（重建路由表）几种情况，动态路由要防重复注册和导航循环。前端守卫只改善体验，接口和数据权限必须由后端校验，前端隐藏页面不能作为安全边界。

---

## 八、性能优化与实际场景

### SPA 和 MPA 有什么区别？各自有哪些优缺点？

SPA 通过前端路由和组件渲染动态重写当前页面，避免整页跳转；MPA 每个页面是独立 HTML，切换时整页刷新。

| 对比项 | SPA | MPA |
| --- | --- | --- |
| 组成 | 一个主页面 + 多个页面片段 | 多个独立主页面 |
| 刷新方式 | 局部刷新 | 整页刷新 |
| URL | 前端路由（hash/history） | 真实 URL 整页跳转 |
| 首屏 | 通常较慢（要加载 JS 再渲染） | 通常较快（服务端返回 HTML） |
| 后续导航 | 一般更快、体验连贯 | 需重新加载资源 |
| SEO | 需 SSR/预渲染改善 | 天然可抓取 |
| 状态/数据 | 客户端内存中易共享 | 靠 URL/cookie/localStorage 传递 |

修正过于绝对的表述：

- **SPA 不一定比 MPA 切换更快**：取决于分包、缓存、网络；首屏没优化好的 SPA 体验反而差。
- **MPA 不一定维护成本更高**：小规模或页面独立的项目 MPA 反而简单。
- **搜索引擎不是完全无法收录 SPA**：现代爬虫能执行 JS，但稳定性不如服务端输出；要稳定 SEO 用 SSR/预渲染。

SPA 的典型代价：首屏加载慢、SEO 需要额外方案、复杂应用 JS 内存占用上升。

> **面试回答：** SPA 是单页 + 前端路由，局部刷新、状态易共享，但首屏慢、SEO 需额外方案；MPA 是多页整页刷新，首屏和 SEO 更直接，但导航要重载资源。选择看应用形态：重交互的后台/工具用 SPA，内容站点或强 SEO 场景考虑 MPA 或 SSR。

### SPA 首屏加载慢应该如何排查和优化？

先定位，再优化，不要把手段清单无差别套用。

1. **用 Performance / Network 定位耗时**：看首屏是 JS 下载、解析执行、接口等待、图片资源还是渲染耗时。
2. **判断问题来源**：JavaScript 体积与执行、接口串行等待、图片字体资源、渲染阻塞等，对症下药。
3. **减少首屏 JS 体积**：路由懒加载、代码拆分、UI 库按需引入、公共代码抽离。
4. **路由懒加载与合理分包**：`() => import(...)` 让首屏只加载当前路由代码；用构建工具（Vite/Rollup，Webpack 的 `SplitChunksPlugin`）做 vendor/公共 chunk 拆分。
5. **优化请求并发与缓存**：HTTP 缓存头（`Cache-Control`、`ETag`）、接口并行、避免串行阻塞。
6. **优化图片、字体等关键资源**：图片压缩、懒加载、字体子集化/预加载、关键 CSS 内联。
7. **按业务评估 SSR 或预渲染**：需要 SEO 或极致首屏时再上，权衡服务器成本与复杂度。

图片懒加载注意：**只设 `data-src` 不会自动加载图片**，必须有机制在图片接近视口时把真实地址赋给 `src`：

```html
<!-- 方式一：原生 loading 属性（现代浏览器） -->
<img src="actual-image.jpg" loading="lazy" />

<!-- 方式二：IntersectionObserver 把 data-src 赋到 src -->
<img data-src="actual-image.jpg" alt="..." />
```

```javascript
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target
      img.src = img.dataset.src // 把真实地址赋给 src 才会发起加载
      observer.unobserve(img)
    }
  })
})
document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img))
```

> **面试回答：** 先用 Performance/Network 定位瓶颈是 JS 体积、接口、图片还是渲染，再对症：JS 大就路由懒加载、代码拆分、按需引入；接口慢就并行和缓存；图片大就压缩、懒加载；确实需要 SEO 或极致首屏再评估 SSR/预渲染，而不是无脑套手段清单。

### Vue3 组件更新慢应该如何排查和优化？

本题与「首屏优化」分开：首屏关注**首次加载与关键渲染路径**，本题关注**运行时更新、重渲染、大列表与响应式开销**。

Vue3 已有内置优化：静态提升、Patch Flags、Block Tree、调度批量刷新、列表 key + LIS。

项目里主动优化，先定位再处理：

1. **先定位**：用 Vue Devtools 的 performance 面板、Performance 面板找出重渲染来源和高频更新组件。
2. **判断类型**：是加载性能、更新性能还是资源管理问题。
3. **选择方案**（并说明收益与成本）：
   - 列表用**稳定业务 ID 作 key**；大量数据用**虚拟列表**，不能期待 Diff 解决几万行 DOM 的渲染成本。
   - 不常切换用 `v-if`，频繁显示隐藏用 `v-show`。
   - 不再变化的区域用 `v-once`；`v-memo` 只用于「大量重复列表渲染且依赖可明确声明」的场景，不能作为默认写法。
   - 路由和大组件用动态 `import()` 或 `defineAsyncComponent` 分包。
   - ECharts、地图等第三方实例用 `shallowRef`/`markRaw` 保存，卸载时 `dispose`，避免不必要的深层响应式代理。

```typescript
const ReportPanel = defineAsyncComponent(() => import('./ReportPanel.vue'))

const chart = shallowRef<echarts.ECharts>()
onBeforeUnmount(() => chart.value?.dispose())
```

**核心原则：先确认瓶颈，再选优化；不要为了用优化 API 到处加复杂度。**

> **面试回答：** 先用 Vue Devtools 定位是哪些组件频繁重渲染，再判断是更新、加载还是资源问题。大列表虚拟化、列表用稳定 key、第三方实例用 shallowRef 避免深层代理、大组件分包、按需用 v-once/v-memo；关键是先定位再优化，不要为了「优化」到处加复杂度。

### 为什么大列表需要虚拟列表？核心原理是什么？

大量数据（几千上万行）渲染成真实 DOM 会带来巨大成本，diff 也救不了。虚拟列表的思路是**只渲染视口附近可见的若干项**，用上下 padding 撑起总高度，滚动时动态替换可见项：

- 数据多、每条结构相似时收益最大。
- 可用成熟库（如 vue-virtual-scroller、vueuc 等），配合稳定 key 和 `v-memo`。
- 若每条内容复杂、高度不定，需要动态测量行高，实现成本更高。

> **面试回答：** 大列表渲染成真实 DOM 的创建和更新成本太高，虚拟列表只渲染视口附近的可见项，用 padding 撑起总高度，滚动时动态替换，把 DOM 数量从「全部数据」降到「可见数量」。适合数据多、结构相似、行高相对稳定的场景。

### 什么情况下应该选 SSR？SSR 和 CSR 有什么区别？

| 维度 | 客户端渲染（CSR/SPA） | 服务端渲染（SSR） |
| --- | --- | --- |
| 首屏 | 通常较慢（要下载 JS 再渲染） | 通常较快（服务端直接返回 HTML） |
| SEO | 需额外方案 | 好 |
| 服务器压力 | 低（静态托管即可） | 高（服务端渲染 + hydration） |
| 复杂度 | 低 | 高（服务端环境、数据、hydration） |
| 交互 | hydration 后全量交互 | hydration 前无交互 |

- 需要 SEO 或强首屏时考虑 SSR/SSG/预渲染；纯后台、强交互、内网应用通常 CSR 足够。
- Nuxt 是 Vue 的 SSR 框架，兼顾了前端路由与服务端渲染。
- SSR 首屏「更快」是相对 CSR 通常而言，也受服务端渲染耗时、网络、缓存影响，不是无条件成立。

> **面试回答：** SSR 在服务端渲染 HTML，首屏和 SEO 通常更好，但服务器压力、复杂度更高，且 hydration 前无交互；CSR 部署简单、交互全在客户端，但首屏和 SEO 弱。需要 SEO 或强首屏选 SSR/SSG，后台/重交互/内网应用 CSR 足够。

---

## 附录：架构与扩展概念

### MVVM、MVC 和 MVP 有什么区别？为什么 Vue 常被从 MVVM 角度理解？

| 模式 | Model | View | 中间层 | 交互方式 |
| --- | --- | --- | --- | --- |
| MVC | 数据管理 | 用户界面 | Controller（控制器） | Controller 接收输入，操作 Model 并更新 View；View 与 Model 可能直接通信 |
| MVP | 数据管理 | 用户界面（不含业务逻辑） | Presenter（展示器） | View 与 Model 完全分离，所有交互经 Presenter |
| MVVM | 数据模型 | 视图 | ViewModel（视图模型） | 数据绑定，View 与 ViewModel 自动同步 |

- **MVVM 核心是数据绑定**：ViewModel 连接 View 与 Model，通过绑定实现自动同步。Vue 通过响应式系统和虚拟 DOM 实现了这一机制。
- **为什么 Vue 常被从 MVVM 角度理解**：Vue 实例可看作 ViewModel——`data`（Model）经响应式系统与模板/渲染函数（View）自动同步，开发者不需要手动操作 DOM。
- **不要断言 Vue 每个内部部分都严格符合 MVVM 规范**：Vue 的响应式、虚拟 DOM、模板编译是组合起来「近似 MVVM」的工程实现，并非照搬教科书 MVVM。特别是「双向绑定」只是 `v-model` 的语法糖，底层仍是单向数据流 + 事件。

Vue 里的对应关系（Vue2 示例，仅为说明 MVVM 概念）：

```javascript
const vm = new Vue({
  data: { message: 'Hello' },       // Model
  template: '<div>{{ message }}</div>' // View（模板）
  // vm（Vue 实例）即 ViewModel
})
```

> **面试回答：** 三者区别在中间层和交互方式：MVC 的 Controller 处理输入并可能让 View 直接接触 Model；MVP 的 Presenter 让 View 与 Model 完全解耦；MVVM 靠 ViewModel 的数据绑定自动同步。Vue 的响应式让 data 和视图自动同步，所以常被理解为 MVVM，但它是工程上的近似，不是严格照搬。

### 如何手写一个最小的 SPA？它与 Vue Router 有什么区别？

> 这是理解「URL 变化 → 路由匹配 → 内容切换」的**最小示例**，不是 Vue Router 的完整实现。

```javascript
const appDiv = document.getElementById('app')

const routes = {
  '/home': () => `<h2>欢迎来到首页！</h2>`,
  '/about': () => `<h2>关于我们</h2>`,
  '/404': () => `<h2>404 - 页面未找到</h2>`
}

function renderContent() {
  let path = window.location.hash.slice(1)
  if (!path) path = '/home' // 默认路由
  const contentFn = routes[path] || routes['/404'] // 404 兜底
  appDiv.innerHTML = contentFn()
}

renderContent() // 首次渲染
window.addEventListener('hashchange', renderContent) // 路由切换
```

- **首次渲染与路由切换**：加载时先 `renderContent()`，之后靠 `hashchange` 响应切换。
- **默认路由与 404**：空 hash 落到 `/home`，未知路径落到 `/404`。
- **XSS 风险**：示例直接 `innerHTML = contentFn()`。这里内容是**硬编码的静态模板**，所以安全；一旦内容来自用户输入、URL query 或接口返回，就必须避免拼进 `innerHTML`，改用 `textContent` 或做转义。
- 真实 Vue Router 还包括路由表匹配、嵌套路由、导航守卫、`pushState` 与历史管理等，本示例只展示最小闭环。

> **面试回答：** 最小 SPA 就是「用 hash 存路径，hashchange 时按路由表匹配、渲染对应内容，空路径和未知路径分别兜底到首页和 404」。它只演示了 URL→内容切换的最小闭环，Vue Router 还处理嵌套路由、导航守卫、history 模式等，不能混为一谈。

### 其他低优先级扩展题

- **Vue 如何实现组件之间的事件总线**：早期用 `new Vue()` 作为事件中心 `$on/$emit/$off`；Vue3 移除了实例事件 API，改用 `mitt`。事件总线适合临时通知，需统一注册与销毁，不应承载核心业务状态。
- **Vue 的 nextTick 与微任务**：`nextTick` 基于 Promise 微任务（兼容环境回退到 `MutationObserver`/`setTimeout`），等待当前数据变更引发的 DOM 更新完成。
- **Vue 与 React 的异同**：都是组件化 + 虚拟 DOM + 声明式；差异在于响应式实现（Proxy 依赖收集 vs 不可变数据 + 调度）、模板语法 vs JSX、更新粒度等，属于横向对比题。
