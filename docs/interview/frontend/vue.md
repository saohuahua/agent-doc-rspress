---
title: Vue
---

# Vue

> Vue 面试核心：Vue2 / Vue3 差异、响应式原理、虚拟 DOM 与 Diff 算法、Composition API、组件与通信、生命周期与内置组件、Vuex / Pinia、路由模式与权限、SPA 与性能优化。
>
> 姊妹篇：[Nuxt](./nuxt)

## Vue2 与 Vue3 的核心区别

响应式实现不同，是两者最核心的区别。

### 响应式：defineProperty vs Proxy

Vue2 基于 `Object.defineProperty` 实现。初始化时会**遍历 data 中的每个属性**，将每个属性转换为 `getter`、`setter`：读属性时 getter 收集依赖，修改属性时 setter 触发更新。

```javascript
const data = { count: 0 }

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

问题：只能劫持对象已经存在的属性，**没法监听对象新增或删除的属性**。例如 `this.user.age = 18`，这个 `age` 就不是响应式的，除非用实例方法 `this.$set(this.user, 'age', 18)`；类似的，数组索引修改 `a[0] = 1` 也触发不了，所以 Vue2 需要重写 `push`、`pop`、`sort`、`splice` 等数组变更方法来兜底。

Vue3 则是基于 `Proxy`。**Proxy 不是劫持对象里面的属性，而是直接代理整个对象**，相当于拦截对象的读、增、删、`in`、`Object.keys` 等行为。

```javascript
const proxy = new Proxy(obj, {
  get(target, key) {
    // 收集依赖
    return target[key]
  },
  set(target, key, value) {
    // 新增或修改都能监听到
    target[key] = value
    // 触发更新
    return true
  },
  deleteProperty(target, key) {
    // 删除属性也能监听到
    delete target[key]
    return true
  }
})
```

总结来说，`Proxy` 相比 `defineProperty` 的改进主要是：**可以监听新增属性、删除属性、数组索引和 length 变化；不需要初始化时递归劫持每个属性；对 Map、Set 这类集合类型也能做更好的响应式支持；整体响应式系统更完整。**

+ 从"监听属性" → "监听对象行为"
+ 从"补丁式处理数组" → "统一拦截机制"
+ 从"初始化递归" → "按需代理"

### 其他方面的区别

+ **Composition API**：Vue3 引入 `setup`、`ref`、`reactive`，逻辑组织和复用更好（详见下文 Composition API 一节）
+ **编译性能优化**：Vue3 编译模板时会标记静态节点（不再重复渲染）和动态节点（精准更新），例如 `createVNode('div', null, text, PatchFlags.TEXT)` 只更新 text，不用 diff 整个节点。Vue2 是"全量 diff"，Vue3 是"定点更新"
+ **生命周期命名**：Vue3 更语义化，销毁阶段的 `beforeDestroy` / `destroyed` 改成了 `beforeUnmount` / `unmounted`
+ **TypeScript**：Vue3 源码用 TS 重写，类型支持更好
+ **多个根节点**：Vue3 支持 Fragment，模板可以有多个根节点

> Vue2 和 Vue3 最大的区别之一是响应式原理不同。Vue2 使用 `Object.defineProperty`，它是在初始化时递归遍历 `data`，把每个已有属性转换成 `getter/setter`，通过 `getter` 做依赖收集，通过 `setter` 触发更新。这个方案的问题是只能劫持已有属性，所以对象新增属性、删除属性、数组索引修改、`length` 修改都不能天然监听，需要通过 `$set`、`$delete` 或重写数组方法来弥补。
>
> Vue3 改成了 `Proxy`。`Proxy` 代理的是整个对象，可以拦截 `get`、`set`、`deleteProperty`、`has`、`ownKeys` 等操作，所以对象新增、删除、数组索引修改、`length` 修改都可以被正常追踪，对 `Map`、`Set` 这类集合类型的支持也更好。同时 Vue3 使用懒代理，只有访问到深层对象时才继续代理，避免了 Vue2 初始化时深度递归遍历的成本。
>
> 除了响应式，Vue3 还引入了 Composition API，让复杂组件的逻辑组织和复用更方便；编译层面有静态提升、patch flag、block tree 等优化，更新更精准；源码使用 TypeScript 重写，类型支持也更好。整体来说，Vue3 相比 Vue2 在响应式能力、性能、逻辑复用和 TypeScript 支持上都有明显提升。

## Vue3 响应式原理

Vue3 通过 Proxy 代理响应式对象：在读取属性的时候收集依赖，修改属性的时候触发依赖更新，从而让数据变化自动驱动视图更新。

完整链路：

```
组件渲染时读取响应式数据
        ↓
触发 Proxy 的 get
        ↓
track 收集依赖
        ↓
响应式数据发生变化
        ↓
触发 Proxy 的 set / deleteProperty
        ↓
trigger 通知依赖更新
        ↓
组件重新执行 render
        ↓
生成新的 VNode
        ↓
diff + patch 更新真实 DOM
```

### 核心组件

Vue3 响应式系统最核心的组件：

```
reactive  对象转为响应式对象
ref       基本类型、对象转响应式对象
effect    副作用函数，数据变化后重新执行的函数
track     依赖收集
trigger   依赖触发
proxy     代理对象，拦截 get/set/delete 等操作
reflect   配合 proxy 完成默认对象操作
```

核心：`Proxy + track + trigger + effect`。

这里要使用 `Reflect`（`Reflect.get(target, key, receiver)`、`Reflect.set(target, key, value, receiver)`）而不是直接操作 `get`、`set`，主要是为了：

+ 保留对象默认行为
+ this 指向更加准确
+ 和 `proxy` 中的 `handler` 方法对应上

### 从一个最小 demo 理解 track 和 trigger

先看基础的响应式设计该怎么实现。普通 JS 变量之间没有联动：

```javascript
let price = 10, quantity = 2;
const total = price * quantity;
console.log(`total: ${total}`); // total: 20
price = 20;
console.log(`total: ${total}`); // total: 20
// 修改 price 的值并不会引起 total 的变化
```

解决办法：把依赖 `price` 的副作用函数收集起来，变化时统一重新执行。

```javascript
let price = 10, quantity = 2, total = 0;
const dep = new Set(); // ①
const effect = () => { total = price * quantity };
const track = () => { dep.add(effect) };  // ②
const trigger = () => { dep.forEach(effect => effect()) };  // ③

track();
console.log(`total: ${total}`); // total: 0
trigger();
console.log(`total: ${total}`); // total: 20
price = 20;
trigger();
console.log(`total: ${total}`); // total: 40
```

① 初始化一个 `Set` 类型的 `dep` 变量，用来存放需要执行的**副作用函数**（这里是修改 `total` 值的方法）；

② 创建 `track()` 函数，用来将需要执行的副作用保存到 dep 变量中（也称**收集副作用**）；

③ 创建 `trigger()` 函数，用来**执行 `dep` 变量中的所有副作用**。

每次修改 `price` 或 `quantity` 后，调用 `trigger()` 执行所有副作用，`total` 就会自动更新为最新值。

若要支持多个对象的响应式，就引入 `WeakMap / Map` 存储依赖：以响应式数据的对象为 key，value 为保存对象属性的 Map。具体映射关系如下，`targetMap` 是响应式对象集合，`depsMap` 是对象的属性集合，`dep` 就是单个属性的依赖集合：

![](https://cdn.nlark.com/yuque/0/2025/png/55783515/1753771455146-f69091ae-a0c1-434c-9406-f20635178d34.png)

### reactive 的实现

```typescript
const state = reactive({
  count: 0,
  user: {
    name: 'Tom'
  }
})
```

核心实现：`get` 收集依赖，`set` 触发 trigger 更新，`delete` 删除数据并触发更新；读取到嵌套对象时递归转为响应式。

```typescript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)

      // 依赖收集
      track(target, key)

      // 如果读取到的还是对象，继续转成响应式
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }

      return result
    },

    set(target, key, value, receiver) {
      const oldValue = target[key]

      const result = Reflect.set(target, key, value, receiver)

      if (oldValue !== value) {
        // 触发更新
        trigger(target, key)
      }

      return result
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)

      const result = Reflect.deleteProperty(target, key)

      if (hadKey && result) {
        trigger(target, key)
      }

      return result
    }
  })
}
```

注意 get 里对嵌套对象递归 `reactive` 是在**读取时才发生**的，这是一种懒代理：不是一上来全递归一遍，而是访问到哪一层才代理哪一层。

### 依赖收集：track

依赖收集就是：当某个副作用函数读取了某个响应式数据，Vue 就把这个副作用函数**记录**下来，等这个数据变化的时候，再重新执行这个副作用函数。

```typescript
effect(() => {
  document.body.innerText = state.count
})
```

`effect` 执行时读取了 `state.count`，触发 `proxy` 的 `get`，`track` 把这个 effect 收集起来；后续若 `count` 变化（例如 `count++`），就会重新执行这个 effect。

+ 这个 effect 就是副作用函数：产生外部影响的函数，比如更新 DOM、触发组件重新渲染、watch 回调等等
+ 常见的副作用函数：组件的渲染函数、`watchEffect` 回调、`computed` 属性的 getter 函数

```typescript
let activeEffect = null

function effect(fn) {
  activeEffect = fn
  fn()
  activeEffect = null
}
```

track 如何收集依赖：通过 `const targetMap = new WeakMap()` 收集，结构类似：

```
targetMap
└── state 对象
    └── depsMap
        ├── count
        │   └── effects: [effect1, effect2]
        └── name
            └── effects: [effect3]
```

具体实现：

```typescript
const targetMap = new WeakMap()
let activeEffect = null

function track(target, key) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target) // 具体对象

  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let deps = depsMap.get(key) // 具体属性

  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }

  deps.add(activeEffect) // 添加依赖
}
```

+ 用 `WeakMap` 可以理解为一个全局仓库，存储所有响应式对象（key 是具体对象，不会阻止垃圾回收，避免内存泄漏）
+ `track` 的核心就是区分对象 `target`、区分属性 `key`，最后添加具体依赖 `effect`；用 `Set` 是为了保证副作用函数唯一，避免重复收集
+ 类似发布-订阅模式：`track` 订阅，`trigger` 发布通知更新

### 派发更新：trigger

响应式数据被修改时触发 `set`，set 中执行 `trigger(target, key)`，trigger 根据之前收集到的 effects 依赖，重新执行它们：

```typescript
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // 具体属性
  const deps = depsMap.get(key)
  if (!deps) return

  // 执行副作用函数
  deps.forEach(effectFn => {
    effectFn()
  })
}
```

完整流程：

```
state.count 被读取
  ↓
track(state, 'count')
  ↓
effect 被收集到 state.count 对应的 Set 中

state.count 被修改
  ↓
trigger(state, 'count')
  ↓
找到 state.count 对应的 effects
  ↓
重新执行 effect
```

### 完整的 reactive 实现

现在把 effect、track、trigger 组合起来，可以实现一个响应式的伪代码：

```typescript
let activeEffect = null
const targetMap = new WeakMap()

// effect
function effect (fn){
  activeEffect = fn
  fn()
  activeEffect = null
}

// 发布-订阅模式，track 订阅，trigger 发布
// track
function track(target, key) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target) // 具体对象

  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let deps = depsMap.get(key) // 具体属性

  if (!deps) {
    deps = new Set()
    depsMap.set(key, deps)
  }

  deps.add(activeEffect) // 添加依赖
}

// trigger
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const deps = depsMap.get(key)
  if (!deps) return

  deps.forEach(effectFn => effectFn())
}

function reactive(target){
  return new Proxy(target,{
    get(target,key,receiver){
      const result = Reflect.get(target,key,receiver)

      track(target,key)

      // 懒代理：只有读取属性的时候才递归 reactive，而不是一上来全递归一遍
      if (typeof result === 'object' && result !== null){
        return reactive(result)
      }

      return result
    },

    set(target,key,value,receiver){
      const oldValue = target[key]
      const result = Reflect.set(target,key,value,receiver)

      if (oldValue !== value){
        trigger(target,key)
      }

      return result
    }
  })
}
```

### ref 的实现

`reactive` 只能处理对象，基本类型用不了。**`ref` 的本质是把值包装成一个带 `value` 属性的对象**，在 `value` 的 getter / setter 里做依赖收集和触发更新：

```typescript
function ref(value) {
  // wrapper 包裹成一个对象
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

这也是为什么在 JS 中使用 `ref` 要写 `.value`，但在模板里 Vue 会自动解包。

### computed 和 watch 的实现

`computed` 和 `watch` 的实现都可以基于 `effect` 来理解。

`computed` 有两个特点：懒执行、有缓存。

+ 只有在读取的时候才会执行
+ 如果依赖没变，多次读取会直接返回缓存；变了 `computed` 会标记为脏数据，下次读取时重新计算

`watch`：

```typescript
watch(
  () => state.count,
  (newValue, oldValue) => {
    console.log(newValue, oldValue)
  }
)
```

+ `() => state.count` 负责收集依赖
+ `state.count` 变化的时候，通过 `scheduler` 调度执行回调

> Vue3 的响应式核心是基于 `Proxy` 实现的。`reactive` 会把一个普通对象包装成 Proxy，当组件渲染或者 effect 执行时读取响应式数据，会触发 Proxy 的 `get`，Vue 会在 `get` 中通过 `track` 做依赖收集；当数据被修改、删除或者新增属性时，会触发 Proxy 的 `set`、`deleteProperty` 等拦截器，然后通过 `trigger` 找到之前收集的依赖并通知它们更新。
>
> 依赖收集的本质是建立一个映射关系：某个对象的某个属性，对应哪些副作用函数。Vue3 内部可以理解成用 `WeakMap -> Map -> Set` 这样的结构保存依赖：`WeakMap` 的 key 是原始对象，`Map` 的 key 是属性名，`Set` 中存放依赖这个属性的 effect。这样当读取 `state.count` 时，就把当前正在执行的 effect 收集到 `state.count` 对应的集合里；当后面修改 `state.count` 时，就从这个集合中取出 effect 重新执行。
>
> 在组件层面，组件渲染本身也可以理解成一个 effect。组件首次渲染时，模板中读取了哪些响应式数据，这些数据就会收集当前组件的渲染 effect。后续这些数据变化时，Vue 会触发组件更新，重新执行 render，生成新的 VNode，再通过 diff 和 patch 更新真实 DOM。同时 Vue3 还有 scheduler 调度机制，同一轮事件循环中的多次数据修改不会每次都立刻更新 DOM，而是会放入队列中批量更新，这也是 `nextTick` 存在的原因。
>
> `ref` 的实现和 `reactive` 有点不同。因为基本类型不能直接被 Proxy 代理，所以 `ref` 会把值包装成一个带有 `value` 属性的对象，通过 `value` 的 getter 做依赖收集，通过 setter 触发更新。这也是为什么在 JS 中使用 `ref` 要写 `.value`，但在模板里 Vue 会自动解包。
>
> Vue3 使用 Proxy 相比 Vue2 的 `Object.defineProperty`，主要优势是代理的是整个对象，而不是某个具体属性，所以它可以监听对象新增属性、删除属性、数组索引变化、数组 length 变化，也能更好地支持 Map、Set。并且 Vue3 对深层对象采用懒代理，只有访问到深层对象时才继续转成响应式，避免了 Vue2 初始化时递归遍历所有属性的成本。
>
> 所以理解 Vue3 响应式不能只说 Proxy，Proxy 只是拦截数据读写的手段，真正核心是 `track` 和 `trigger`。`track` 解决"谁依赖了这个数据"，`trigger` 解决"数据变化后通知谁更新"。最终 Vue 通过这套机制，把响应式数据和组件渲染 effect 关联起来，实现数据变化自动驱动视图更新。

## Composition API 与逻辑复用

Vue2 采用选项式 API（Options API）定义组件逻辑，数据、方法、计算属性、生命周期钩子分开写。当组件复杂的时候，一个功能的代码会散落在各个部分，难以维护：

```javascript
export default {
    data() {
        return {
            count: 0,
            message: 'Hello World'
        };
    },
    computed: {
        doubleCount() {
            return this.count * 2;
        }
    },
    methods: {
        increment() {
            this.count++;
        }
    },
    created() {
        console.log(this.message);
    }
};
```

这也是 Vue3 引入 Composition API 的根本原因，主要有三点。

### 1. 更好的代码组织和重用

通过 Composition API，可以将相关功能的逻辑组织在一起，提高代码的可读性和可维护性：

```vue
<script>
import { ref, computed, onMounted } from 'vue';

export default {
    setup() {
        const count = ref(0);
        const message = ref('Hello World');

        const doubleCount = computed(() => count.value * 2);

        const increment = () => {
            count.value++;
        };

        onMounted(() => {
            console.log(message.value);
        });

        return {
            count,
            doubleCount,
            increment,
            message
        };
    }
};
</script>
```

### 2. 更好的逻辑复用：组合式函数

组合式函数（composable）的本质是把一组相关的状态和行为封装为普通函数。它不需要组件实例，也不应该在里面再写 `export default`。

```typescript
// useMessage.ts
import { ref, onMounted } from 'vue'

export function useMessage() {
  const message = ref('Hello World')

  onMounted(() => {
    console.log(message.value)
  })

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

### 3. 适应函数式编程

Composition API 借鉴了函数式编程的思想，将逻辑封装成函数，使得代码更加简洁、模块化。

## 虚拟 DOM 与 Diff 算法

### VNode 与虚拟 DOM

核心结论：**VNode 是描述单个节点的 JS 对象，虚拟 DOM 是由 VNode 组成的一整棵虚拟节点树**。

VNode 全称 Virtual Node（虚拟节点），本质就是一个普通的 JS 对象，用来描述页面中的一个节点。它可以描述的除了普通 DOM 节点外，还可以描述组件、文本、Fragment 等等。

```html
<div id="app">
  <p>Hello Vue</p>
</div>
```

对应的 VNode：

```javascript
const vnode = {
  type: 'div',
  props: {
    id: 'app'
  },
  children: [
    {
      type: 'p',
      props: null,
      children: 'Hello Vue'
    }
  ]
}
```

VNode 和真实 DOM 的区别：

| 对比项 | VNode | 真实 DOM |
| --- | --- | --- |
| 本质 | JS 对象 | 浏览器 DOM 节点 |
| 创建成本 | 相对低 | 相对高 |
| 操作位置 | JS 内存中 | 浏览器渲染引擎中 |
| 作用 | 描述 UI 结构 | 真正渲染页面 |
| 更新方式 | 新旧 VNode diff | 真实 DOM patch |
| 是否直接显示 | 不会显示 | 会显示在页面上 |

Vue 中虚拟 DOM 的工作流程：

```
template
   ↓ 编译
render 函数
   ↓ 执行
VNode 树
   ↓ patch / diff
真实 DOM
```

### 为什么要引入虚拟 DOM

+ **核心不一定是虚拟 DOM 比真实 DOM 快**
+ 虚拟 DOM 的核心价值是**让开发者用声明式的方式写 UI，同时通过 diff 尽量减少不必要的 DOM 操作**
    - 也就是屏蔽了真实 DOM 的操作细节，提供跨平台的能力

直接操作 DOM 的性能开销较大，直接修改真实 DOM，浏览器就需要经历计算样式、布局、重绘等步骤。而 Vue 的做法是：

+ **数据变化时先更新 VNode**：当应用状态（数据）发生变化时，Vue 并不会立即操作真实 DOM，而是根据新的数据创建一棵**新的虚拟 DOM 树**
+ **高效的 Diff 算法**：递归比较新旧两棵虚拟 DOM 树，找出它们之间**最小的差异**
+ **批量更新真实 DOM**：将差异收集成"补丁"（patch），**一次性**、**批量地**应用到真实 DOM 上

> 虚拟 DOM 本质上是一棵用 JS 对象描述的 DOM 树，而 VNode 就是这棵树里的单个虚拟节点。
>
> Vue 的渲染流程可以理解为：模板先被编译成 render 函数，render 函数执行后生成 VNode 树，然后 Vue 根据 VNode 创建真实 DOM。当响应式数据变化时，组件会重新执行 render，生成新的 VNode，Vue 会拿新旧 VNode 做 diff，找出需要更新的地方，最后通过 patch 把变化更新到真实 DOM 上。
>
> 虚拟 DOM 的意义不是说它一定比手写真实 DOM 更快，而是它让我们可以用声明式方式描述 UI，不需要手动操作 DOM。同时 Vue 可以通过 diff 尽量复用已有 DOM，减少不必要的创建、删除和移动。在 Vue3 中，虚拟 DOM 还配合了 `patchFlag`、静态提升、block tree 等编译优化，让更新时可以更精准地定位动态节点，减少运行时 diff 成本。
>
> 所以一句话总结：**VNode 是描述单个节点的 JS 对象，虚拟 DOM 是由 VNode 组成的树；Vue 通过新旧虚拟 DOM 的 diff，计算出最小化的真实 DOM 更新。**

### diff 的核心原则

diff 的整体入口是 `patch`，作用是比较两个 VNode，然后决定如何更新真实 DOM：

```typescript
// 伪代码
function patch(oldVNode, newVNode) {
  if (oldVNode 和 newVNode 不是同一种节点) {
    卸载 oldVNode
    挂载 newVNode
  } else {
    复用 oldVNode 对应的真实 DOM
    根据节点类型继续比较
  }
}
```

重点是判断两个节点是否为"同一个节点"，一般看 `type` 和 `key`：

```html
<!-- 可以复用 -->
<div key="a"></div>
<div key="a"></div>

<!-- 不可以复用：type 不同 -->
<div key="a"></div>
<p key="a"></p>

<!-- 不可以复用：key 不同 -->
<div key="a"></div>
<div key="b"></div>
```

核心策略：尽可能不做整棵树的全量比较，那样复杂度太高。

```
1. 只比较同层节点
2. 不同类型的节点直接卸载重建
3. 相同类型的节点尽可能复用
4. 列表 diff 依赖 key 判断节点身份
5. 使用最长递增子序列减少 DOM 移动
6. 编译阶段通过 patchFlag 提前标记动态节点，减少运行时比较范围
```

为什么只比较同层：跨层级比较成本太高，且真实业务中跨层移动不常见，同层比较可以把复杂度降下来。

```html
<div>
  <p>A</p>
</div>

<!-- 这种变化就是卸载旧的 div，重新挂载新的 section -->
<section>
  <p>A</p>
</section>
```

普通节点的 diff 过程：

```
1. 判断新旧节点是否是同类型
2. 复用旧节点的真实 DOM
3. 更新 props，比如 id、class、style、事件等
4. 更新 children
```

```typescript
// 伪代码，重点是属性和子节点
function patchElement(oldVNode, newVNode) {
  const el = newVNode.el = oldVNode.el

  // 更新属性
  patchProps(oldVNode.props, newVNode.props)

  // 更新子节点
  patchChildren(oldVNode.children, newVNode.children, el)
}
```

子节点 children 的几种情况：

```
1. 新 children 是文本 -> el.textContent 更新即可
2. 新 children 是数组 -> 走子节点 diff（有 key 时进入列表 diff）
3. 新 children 为空 -> 卸载
```

最复杂的情况是数组变数组：

```html
<ul>
  <li>A</li>
  <li>B</li>
</ul>

<ul>
  <li>B</li>
  <li>A</li>
  <li>C</li>
</ul>
```

### 列表 diff 的核心流程

针对有 key 的子节点做 diff，步骤如下：

```
1. 从左往右比较相同节点
2. 从右往左比较相同节点
3. 新节点多了，挂载新增节点
4. 旧节点多了，卸载多余节点
5. 中间乱序部分，用 key 建立映射，再配合最长递增子序列减少移动
```

简单情况（子节点没有乱序）：

```
首先从左往右比较
旧：A B C D
新：A B E C D
    ↑ ↑
    相同，先 patch A、B

旧：C
新：E 不同，左侧比较停止

从右往左比较
旧：A B C D
新：A B E C D
          ↑ ↑
          C D 相同，可复用

此时就剩中间的 E
旧：空
新：E
直接挂载新增的 E 节点即可
```

复杂情况，中间乱序：

```
旧：A B C D E
新：A C B E D

1. A 相同；然后从右往左没有相同的，剩下中间部分

旧：B C D E
新：C B E D 此时都是乱序的

2. 进入乱序 diff 核心：先按旧列表建立 key -> 旧索引 的映射
   B -> 0, C -> 1, D -> 2, E -> 3

3. 遍历新列表，查每个节点在旧列表中的位置
   B 在旧列表中，复用
   C 在旧列表中，复用
   D 在旧列表中，复用
   E 在旧列表中，复用
   （若某个新节点在旧列表中找不到，就挂载新增；
     旧列表中没有被任何新节点引用的，就卸载）
```

`source` 数组：在乱序 diff 中，构建数组来记录**新列表中的节点，对应旧列表中的哪个位置**。

```
旧：B C D E
新：C B E D

旧节点索引
B -> 0
C -> 1
D -> 2
E -> 3

新节点就分别对应 C1 B0 E3 D2
source = [1, 0, 3, 2]
```

最长递增子序列：根据 `source` 数组求出**最长递增子序列**（LIS）。

```
source = [1, 0, 3, 2]
LIS = [1, 3] 或 [0, 2]
```

这代表：**这些节点在新旧列表中的相对顺序是递增的，所以它们可以不移动**。

+ 也就是 LIS 里面的节点，Vue 尽可能让它们保持不动，而去移动不在 LIS 中的节点

```
旧：B C D E
新：C B D E
source = [1,0,2,3]
LIS = [0,2,3] 对应 B D E，说明 B D E 相对顺序是稳定的，可以不动，只需要移动 C
```

### 为什么 key 在 diff 中很重要

key 是判断列表节点身份的重要依据。

```
旧：A B C
新：B C A
如果没有 key，Vue 就会认为
旧第 0 个节点更新成新第 0 个节点
旧第 1 个节点更新成新第 1 个节点
旧第 2 个节点更新成新第 2 个节点
```

```html
<li v-for="item in list" :key="item.id">
  <input :value="item.name" />
</li>

<!-- 这里必须用稳定的 id 作为 key，否则容易出现
     输入框内容错位、组件状态错乱、动画异常、表单数据错乱 -->
```

为什么不推荐用 `index` 作为 `key`：index 不是稳定身份。

```
index: 0 1 2
item:  A B C

若在头部插入一个 D
index: 0 1 2 3
item:  D A B C

如果用 index 作为 key，Vue 就会误认为
旧 key=0 的 A 可以复用成新 key=0 的 D
旧 key=1 的 B 可以复用成新 key=1 的 A
旧 key=2 的 C 可以复用成新 key=2 的 B
```

### Vue3 相比 Vue2 的 diff 优化

+ **patchFlag**：编译阶段标记节点哪些部分是动态的（如 CLASS、TEXT、PROPS），更新时只处理被标记的部分

```html
<div :class="{ active: isActive }"></div>
```

响应式触发 `isActive` 变化时，只会更新 class，不再 diff 整个节点。

+ **静态提升**：静态节点提升到 render 函数外，避免每次渲染重新创建
+ **block tree**：以块为单位收集动态后代节点，更新时跳过静态部分
+ **事件缓存**（cacheHandlers）：缓存事件处理函数，避免不必要的子组件更新

### 总结

```
第一层：Vue 更新时会生成新 VNode，然后和旧 VNode 做 patch
第二层：如果新旧节点类型不同，直接卸载旧的，挂载新的
第三层：如果类型相同，就复用 DOM，更新 props，再比较 children
第四层：children 如果是文本就更新文本，如果是数组就进入列表 diff
第五层：列表 diff 会先从头部和尾部做双端比较，跳过相同部分
第六层：剩下乱序部分，用 key 建映射，判断新增、删除、复用和移动
第七层：为了减少移动，Vue3 会用最长递增子序列找出不需要移动的节点
第八层：Vue3 还结合 patchFlag、静态提升、block tree，减少无意义 diff
```

> Vue3 的 DOM diff 本质上是新旧虚拟 DOM 的对比。响应式数据变化后，组件会重新执行 render，生成新的 VNode，然后 Vue 会通过 `patch(oldVNode, newVNode)` 对比新旧节点，找出最小化的 DOM 更新操作。
>
> Vue3 diff 的第一步是判断新旧 VNode 是否是同一种节点，通常会看 `type` 和 `key`。如果不是同一种节点，就直接卸载旧节点，挂载新节点；如果是同一种节点，就复用旧的真实 DOM，然后更新 props，再继续比较 children。
>
> children 的 diff 会根据类型处理：如果新 children 是文本，就直接更新文本；如果是空，就卸载旧子节点；如果是数组，就进入列表 diff。列表 diff 是重点，Vue3 会先从头部开始比较相同节点，再从尾部比较相同节点，这样可以快速跳过前后稳定的部分。
>
> 如果比较之后发现新节点多了，就直接挂载新增节点；如果旧节点多了，就卸载多余节点。最复杂的是中间乱序部分，Vue3 会根据新节点的 key 建立映射表，然后遍历旧节点，判断哪些节点可以复用，哪些需要删除，哪些是新增节点。
>
> 对于需要移动的节点，Vue3 会使用最长递增子序列算法。最长递增子序列的作用是找出新旧列表中相对顺序不变的节点，这些节点可以不移动，只移动剩下的节点，从而减少真实 DOM 的移动次数。
>
> 另外，Vue3 的 diff 不只是运行时优化，它还结合了编译优化，比如 `patchFlag`、静态提升和 `block tree`。编译阶段会标记动态节点，更新时 Vue 可以直接定位动态部分，而不是整棵树都递归 diff。
>
> 所以可以总结为：**Vue3 diff 的核心是同层比较、相同节点复用、不同节点重建；列表 diff 通过头尾比较、key 映射和最长递增子序列减少 DOM 操作；再结合编译阶段的 patchFlag 和静态提升，让更新更加精准。**

## 组件与组件通信

### 对组件的理解

+ **封装**：组件将一个独立的功能模块封装在一起，包括其**模板 (HTML)**、**行为 (JavaScript)** 和**样式 (CSS)**。这意味着组件拥有自己的逻辑和视图，可以独立于应用的其它部分进行开发、测试和维护
+ **复用**：一个封装好的组件可以像一个普通的 HTML 标签一样，在应用中的任何地方多次使用，减少重复代码，提高开发效率

:::info
组件是 Vue 应用的基础构建块，它将模板、逻辑和样式封装成一个独立、可复用的单元。组件之间通过单向数据流和明确的通信边界协作，复杂逻辑再由组合式函数抽取。
:::

### 组件通信方式有哪些，应该怎么选

组件通信先看状态属于谁，再决定传递方式。父组件拥有的数据通过 `props` 向下传，子组件只能通过事件请求父组件修改；跨层但局部的依赖使用 `provide/inject`；跨页面、跨功能域的共享状态才进入 Pinia。不要因为"传了两层 props"就立刻上全局状态。

| 场景 | 方式 | 边界 |
| --- | --- | --- |
| 父组件给子组件传数据 | `props` | 子组件只读，不直接修改 |
| 子组件通知父组件 | `emit` | 由父组件决定怎样更新状态 |
| 父子双向绑定 | `v-model` | 本质仍是 prop 向下、事件向上 |
| 祖先向深层后代提供局部能力 | `provide/inject` | 主题、表单上下文、组件库上下文 |
| 父组件命令式调用子组件 | template ref + `defineExpose` | 只暴露聚焦、重置、提交等明确动作 |
| 无直接父子关系的页面共享状态 | Pinia | 登录用户、权限、购物车、全局筛选条件 |
| 临时的跨模块通知 | `mitt` 等事件总线 | 必须有统一注册和销毁，不能承载核心状态 |

最常见的父子组件写法如下。`props` 是单向只读的，点击后的状态变更仍然回到父组件完成：

```vue
<!-- Counter.vue -->
<script setup lang="ts">
const props = defineProps<{ count: number }>()
const emit = defineEmits<{ increment: [] }>()
</script>

<template>
  <button @click="emit('increment')">
    count: {{ props.count }}
  </button>
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

`provide/inject` 适合"后代需要同一份上下文，但中间组件不关心"的情况，例如表单项拿到表单实例。它不应替代所有 props：依赖变得隐式后，组件脱离当前树就不容易复用。提供响应式值时直接提供 `ref` 或 `readonly(ref)`，不要提供某一刻的普通值。

```typescript
type FormState = {
  name: string
  email: string
}

// Form.vue
const formState = reactive<FormState>({ name: '', email: '' })
provide('formState', readonly(formState))

// FormItem.vue
const formState = inject<Readonly<FormState>>('formState')
if (!formState) throw new Error('FormItem must be used inside Form')
```

template ref 是命令式 escape hatch，不用它传业务数据。Vue 3 默认不会让父组件访问 `<script setup>` 子组件内部变量，子组件需要显式声明可用能力：

```vue
<!-- SearchInput.vue -->
<script setup lang="ts">
const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })
</script>
```

> 我会先判断状态归属。父组件拥有的数据用 props 下发，子组件通过 emit 表达意图，这样数据来源唯一、更新路径可追踪。深层但局部的上下文，例如表单或主题，用 provide/inject；用户信息、权限、购物车这类跨页面状态才放 Pinia。ref 暴露只用于 focus、reset 这类命令式能力，事件总线只处理临时通知，不保存核心业务状态，否则很难追踪谁在修改数据。

### 单向数据流与组件设计

Vue 的单向数据流是 `父组件 state -> props -> 子组件 view`。子组件不能直接改 prop，因为 prop 的真实所有者在父组件，子组件修改即使暂时生效，也会在父组件下一次重新渲染时被覆盖。Vue 对直接修改 prop 会给出警告。

子组件如果需要根据 prop 做本地编辑，应区分两种情况：

+ 只是展示转换，使用 `computed` 派生，不复制状态
+ 用户需要编辑草稿，复制一份本地状态，并在提交时 `emit` 结果；prop 更新时再明确地同步或重置草稿

```vue
<script setup lang="ts">
const props = defineProps<{ initialName: string }>()
const emit = defineEmits<{ save: [name: string] }>()

const draftName = ref(props.initialName)
watch(() => props.initialName, value => {
  draftName.value = value
})
</script>

<template>
  <input v-model="draftName" />
  <button @click="emit('save', draftName)">保存</button>
</template>
```

组件设计时，让一个组件只解决一个稳定的问题，并把 API 设计成"输入、事件、插槽"三部分：

+ `props` 描述输入和展示配置，避免让通用组件直接读取 Pinia 或路由
+ `emit` 描述用户意图，如 `submit`、`change`、`close`，不把内部实现细节暴露给父组件
+ slot 让调用方定制内容和布局；只有结构确实需要开放时才提供，避免插槽泛滥
+ 异步请求、权限、埋点等业务编排放容器组件或 composable；基础组件保持无业务依赖

例如 `UserTable` 不应该内部请求 `/api/users` 并绑定某个 store。更可复用的做法是由页面负责获取数据，表格只接收 `rows`、`loading`，通过 `page-change`、`sort-change` 把用户意图抛出。这样接口替换、单测和复用都更简单。

> 单向数据流的价值不是限制写法，而是让状态只有一个可信来源。组件收到 props 只负责展示或派生，想修改就 emit 给状态拥有者。实际拆组件时，我会把请求、权限和页面状态放在容器或 composable，把表格、弹窗、输入框做成接收 props、发出事件的展示组件；这样复用时不会把某个页面的 store 和接口一起带进去。

### v-model 的原理与演进

`v-model` 不是魔法双向绑定，它是"值通过 prop 或 DOM 属性向下传，变化通过事件向上通知"的语法糖。原生文本输入框可以理解为：

```vue
<input :value="name" @input="name = $event.target.value" />
```

复选框、单选框和 `select` 会根据控件使用 `checked`、`change` 等不同的属性和事件，不能把所有原生 `v-model` 都机械理解成 `value + input`。

Vue2 中，组件上的默认约定是 `value` prop 加 `input` 事件；自定义名称需要用 `model` 选项。多个双向绑定通常写成 `:title` 加 `@update:title`，或者借助 `.sync`。

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

Vue3 统一成 `modelValue` prop 和 `update:modelValue` 事件，天然支持多个具名 `v-model`，`.sync` 被移除。Vue 3.4 起还可以用 `defineModel` 减少样板代码。

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

不用 `defineModel` 时，Vue3 组件的等价实现是声明 `modelValue` prop，再 `emit('update:modelValue', nextValue)`。这样子组件没有直接修改父组件传入的 prop，数据流仍然可追踪。

> 我把 v-model 理解为 prop 加更新事件的语法糖。Vue2 组件默认是 value 和 input，Vue3 改成 modelValue 和 update:modelValue，并且支持多个具名 v-model，`.sync` 也不再需要。做表单组件时我不会直接改 prop，而是 emit 更新事件，父组件决定是否更新状态；这样校验、回滚和状态追踪都在父组件可控范围内。

## 响应式 API 与侦听

### watch 和 computed 的区别

对于 `computed`：

+ 支持缓存，**只有依赖的数据发生了变化，才会重新计算（惰性求值）**
+ 不支持异步，当 `computed` 有异步操作时，无法监听到数据变化
+ 必须返回一个值
+ 使用场景
    - 派生新数据：从一个或多个响应式数据得到一个新的值（例如购物车商品求和）
    - 简化模板中的复杂逻辑
    - 缓存计算结果：当一个计算过程开销较大，且依赖数据不经常变化时，`computed` 的缓存机制可以避免重复计算，提高性能

对于 `watch`：

`watch` 用于侦听一个或多个响应式数据源的变化，并在变化时执行一个**副作用函数**。

+ 它不支持缓存，数据变化时就会触发相应的操作
+ 支持异步监听，可以在回调中发送网络请求
+ `watch` 的核心是执行副作用函数，监听回调接收两个参数，第一个是最新的值，第二个是变化之前的值
+ 使用场景
    - 执行副作用
    - 异步操作
    - 深度监听

| 特性 | `computed`（计算属性） | `watch`（侦听器） |
| --- | --- | --- |
| **设计目的** | **派生**一个新值，具有**缓存**功能 | **侦听**数据的变化，并执行**副作用** |
| **工作方式** | **声明式**，只关心返回值 | **命令式**，关心执行过程 |
| **返回值** | 必须返回一个值 | 没有返回值 |
| **缓存** | **有缓存**，依赖不变，值不变 | **没有缓存**，每次变化都执行 |
| **执行时机** | **惰性求值**，只在被访问时计算 | 数据变化时执行回调，可用 `immediate` 让回调立即执行一次 |
| **异步** | **同步**执行 | 支持**异步**操作 |
| **使用场景** | 依赖多个状态得到一个新值 | 状态变化后执行异步操作、DOM 操作等 |

+ **简单判断**：需要的只是一个**新值**，用 `computed`；需要**做点什么**，用 `watch`

### ref 和 reactive 应该怎么选

`ref` 用一个带 `.value` 的包装对象保存值，基本类型和对象都能使用；传入对象时，对象内部同样会转为响应式。`reactive` 直接返回对象的 Proxy，只能代理对象、数组、Map、Set，不能代理基本类型。

业务代码中通常默认使用 `ref`：变量可以整体替换，传给函数或解构时也更容易保持语义清晰。表单、筛选条件这类字段很多且主要是原地修改的对象，使用 `reactive` 更自然。

```typescript
const page = ref(1)
const user = ref({ name: 'Tom' })

const form = reactive({ name: '', departmentId: undefined as string | undefined })

// reactive 的引用不能整体替换，否则模板和其他引用仍指向旧 Proxy
Object.assign(form, { name: '', departmentId: undefined })
```

### 响应式 API 的常见踩坑

**不要直接解构 `reactive` 对象**。解构得到的是当时的普通值，后续不会随原对象更新；需要暴露字段时用 `toRefs`，只取单个字段用 `toRef`。

```typescript
const state = reactive({ page: 1, pageSize: 20 })
const { page, pageSize } = toRefs(state)
const currentPage = toRef(state, 'page')
```

`shallowRef` 只追踪 `.value` 整体替换，不递归代理内部对象，适合 ECharts 实例、地图实例、大型不可变数据等。第三方类实例不希望被 Proxy 时用 `markRaw`。这不是默认优化手段，只有确认深层响应式带来额外开销或兼容问题时再使用。

侦听时也要传对 source：`watch(() => route.params.id, loadUser)` 能精确监听 ID；`watch(form, callback)` 会隐式深度监听，表单很大时可能造成不必要的触发。异步请求需要在 watcher 失效时取消旧请求，避免慢请求覆盖新结果。

`onWatcherCleanup` 是 Vue 3.5 提供的 API；若项目版本较低，可以使用 `watch` 回调的第三个参数 `onCleanup` 完成同样的取消逻辑。

```typescript
watch(keyword, async (value, _oldValue, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())

  const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
    signal: controller.signal
  })
  results.value = await response.json()
})
```

Vue 3.5 也可以把 `onCleanup(() => controller.abort())` 改为 `onWatcherCleanup(() => controller.abort())`，但必须在 `await` 前同步调用。

> `ref` 和 `reactive` 都能做响应式，区别不只是基本类型和对象：ref 适合可整体替换的状态，reactive 适合原地维护的对象状态。我一般用 ref 管单值和可替换对象，用 reactive 管表单或筛选对象；重置 reactive 时用 Object.assign，不能直接重新赋值。实际容易出问题的是解构 reactive 丢响应式，以及搜索这类 watch 异步竞态，我会用 toRefs 保持字段响应式、用 cleanup 或 AbortController 取消旧请求。

## 生命周期与内置组件

### v-show 和 v-if 的区别

控制手段不同：

+ `v-show` 隐藏是为该元素添加 css `display:none`，DOM 元素依旧还在
+ `v-if` 的显示隐藏是将 DOM 元素整个添加或删除

编译过程不同：

+ `v-if` 的切换包含**局部编译/卸载**的过程，切换过程中会合适地销毁和重建内部的事件监听和子组件
+ `v-show` 只是简单的 css 切换

生命周期触发不同：

+ `v-show` 由 false 变为 true 不会触发组件的生命周期
+ `v-if` 由 false 变为 true 时，元素/组件被创建并挂载，触发 `onBeforeMount`、`onMounted`；由 true 变为 false 时卸载，触发 `onBeforeUnmount`、`onUnmounted`

性能消耗：

+ `v-if` 有更高的切换消耗；`v-show` 有更高的初始渲染消耗

使用场景：

+ `v-if` 适合不经常切换的场景
    - **权限控制**：根据角色或权限来决定某个模块或按钮是否存在
    - **条件性加载**：例如一个模态框只有在需要的时候才渲染
    - **确保组件的全新状态**：例如需要每次显示的时候重置组件的内部状态（表单输入）
+ `v-show` 适合频繁切换的场景
    - **频繁切换**：例如选项卡切换、菜单的展开/收起
    - **性能敏感**：元素内容比较大或包含很多子组件，且需要频繁显示/隐藏，用 `v-show` 可以避免不必要的 DOM 操作
    - **初始状态通常是显示的**：大多数情况下可见，只在特定条件下隐藏

### Vue3 生命周期

+ Vue3 的生命周期可以分为**创建、挂载、更新、卸载**几个阶段
+ Composition API 常用的生命周期：`setup`、`onBeforeMount`、`onMounted`、`onBeforeUpdate`、`onUpdated`、`onBeforeUnmount`、`onUnmounted`，另外还有 keep-alive 相关的 `onActivated`、`onDeactivated`，错误捕获的 `onErrorCaptured`，以及调试用的 `onRenderTracked`、`onRenderTriggered`
+ `setup` 是 Composition API 的入口，执行时机很早，通常用来定义响应式数据、方法、computed、watch，或者调用 composable
+ `onMounted` 表示组件 DOM 挂载完成，适合请求接口、访问 DOM、初始化图表、地图、第三方插件等
+ `onBeforeUpdate` 是数据变化后、DOM 更新前执行，适合保存旧的 DOM 状态，比如滚动位置；`onUpdated` 是 DOM 更新完成后执行，适合基于最新 DOM 做操作，但要避免在里面频繁修改响应式数据，防止循环更新
+ 卸载阶段主要是 `onBeforeUnmount` 和 `onUnmounted`。实际开发中，清除定时器、解绑事件、取消请求、销毁第三方实例，一般会放在 `onBeforeUnmount`
+ 如果组件被 `keep-alive` 缓存，则不会频繁走 mounted 和 unmounted，而是通过 `onActivated` 和 `onDeactivated` 处理激活和失活，比如缓存页面滚动位置、恢复页面状态
+ Vue3 相比 Vue2 更语义化的地方主要是销毁阶段命名变化：Vue2 是 `beforeDestroy` 和 `destroyed`，Vue3 改成了 `beforeUnmount` 和 `unmounted`。因为组件从页面中移除，本质上更准确地说是"卸载"，不是"销毁"，而且和 `beforeMount / mounted` 形成了对应关系，语义更统一
+ 总结：初始化逻辑放 `setup`，DOM 相关逻辑放 `onMounted`，更新前后分别用 `onBeforeUpdate / onUpdated`，资源清理放 `onBeforeUnmount / onUnmounted`，页面缓存场景用 `onActivated / onDeactivated`

### KeepAlive 缓存组件

KeepAlive 是 Vue 的内置组件，主要作用是**缓存动态组件**：当组件在 `<KeepAlive>` 内切换的时候，不会被销毁，而是被缓存起来，再次渲染时从缓存中直接激活，而不是重新创建组件实例。

+ KeepAlive 的核心作用是**性能优化**和**提升用户体验**，特别是频繁切换的动态组件场景

组件首次创建时仍会触发 `onBeforeMount` 和 `onMounted`；缓存实例最终被清除时仍会触发卸载钩子。区别在于普通切换不会卸载实例，而会触发下面两个钩子：

+ `onActivated()`：组件从缓存中重新插入 DOM 时调用，适合恢复滚动位置或按需刷新数据
+ `onDeactivated()`：组件从 DOM 移除并进入缓存时调用，适合暂停轮询、视频或订阅

```html
<!-- KeepAlive 用于缓存动态组件或组件树的实例，避免重复渲染的性能开销 -->
<!-- :include 缓存指定组件，:exclude 不缓存指定组件 -->
<!-- 会新增 onActivated / onDeactivated 两个生命周期 -->
<keep-alive>
  <A v-if="flag"></A>
  <B v-else></B>
</keep-alive>

<!-- 通过 include 和 exclude 属性来控制哪些组件被缓存 -->
<KeepAlive include="MyComponent">
  <component :is="currentComponent"></component>
</KeepAlive>

<KeepAlive exclude="SpecialComponent">
  <component :is="currentComponent"></component>
</KeepAlive>
```

## Vuex 与 Pinia

Vuex 写法，Options API 风格：

```javascript
import { createStore } from 'vuex'

export default createStore({
  state() {
    return {
      count: 0
    }
  },
  // 可以理解为 computed
  getters: {
    doubleCount(state) {
      return state.count * 2
    }
  },
  // 重点：修改 state 只能通过 mutations，action 也不例外
  mutations: {
    increment(state) {
      state.count++
    }
  },

  actions: {
    async incrementAsync({ commit }) {
      await Promise.resolve()
      commit('increment') // 修改 state 通过 commit
    }
  }
})
```

Pinia 写法，支持 Composition API 和 Options API 两种写法，更推荐前者：

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)

  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++ // 可以直接修改 state
  }

  async function incrementAsync() {
    await Promise.resolve()
    count.value++
  }

  return {
    count,
    doubleCount,
    increment,
    incrementAsync
  }
})
```

最核心区别：

+ Vuex 有 `mutations`，Pinia 没有 mutations，换句话说
    - Vuex 状态修改：同步直接 `commit -> mutation -> state`，异步走 `dispatch -> action -> commit -> mutation -> state`，`mutations` 必须有
    - Pinia 可以直接修改状态，无需 `mutations`：`action -> state`

```
Vuex 更像 Redux 风格：
状态修改流程严格，action 处理异步，mutation 专门改 state。

Pinia 更像 Vue3 风格：
没有 mutation，store 更轻量，直接调用 action，直接修改 state，TS 和 Composition API 体验更好。
```

> Pinia 和 Vuex 都是 Vue 里的状态管理方案，但现在 Vue3 新项目更推荐 Pinia。
>
> Vuex 的核心结构是 `state、getters、mutations、actions、modules`，它要求修改 state 必须通过 `commit mutation`，所以常见流程是组件 `dispatch action`，action 里处理异步逻辑，然后 `commit mutation` 去修改 state。这个流程比较严格，但写法也会偏重，模板代码比较多。
>
> Pinia 可以理解成更适合 Vue3 的状态管理库。它没有 `mutations`，只有 `state、getters、actions`，action 可以同步也可以异步，并且可以直接修改 state。比如 Vuex 里同步要 `commit -> mutation -> state`、异步要 `dispatch -> action -> commit -> mutation -> state`，Pinia 里通常就是直接调用 action，然后在 action 里改 state，所以写法更简洁。
>
> 另外，Vuex 通常是一个根 store 加 modules，模块复杂时还要处理 namespace；Pinia 天然就是多个独立 store，每个 store 通过 `defineStore` 定义，使用时直接引入对应的 `useXxxStore`。所以整体来说，Vuex 更偏传统集中式和严格流程，Pinia 更轻量、更模块化、更贴合 Vue3 Composition API。

## Vue Router：路由模式与权限控制

### hash 和 history 模式的区别

Hash 模式把路径放在 `#` 后面，浏览器切换时触发 `hashchange`。`#` 后的内容不会随 HTTP 请求发送给服务器，因此刷新通常不需要服务端额外配置，但 URL 不够自然。

History 模式使用 `history.pushState()` 和 `replaceState()` 修改地址，通过 `popstate` 响应浏览器前进后退。它的 URL 与普通站点一致，但刷新 `/user/1` 时浏览器会真的请求该路径；Nginx 或服务端必须把非静态资源请求回退到 `index.html`，再由前端路由匹配，否则会得到 404。History 模式不是天然更利于 SEO，SPA 的内容仍需要 SSR 或预渲染才能被稳定抓取。

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 路由权限怎么做

路由守卫不应只写成"没有 token 就跳登录"。真实项目至少要区分：未登录、已登录但权限未加载、无权限、登录页回跳和接口 token 已失效。动态路由一般在拿到用户信息和权限码后调用 `router.addRoute()` 注册；刷新后路由表会丢失，因此守卫中要先恢复权限和路由，再 `replace` 进入原目标地址。

```typescript
router.beforeEach(async to => {
  const auth = useAuthStore()

  if (!auth.token && to.meta.requiresAuth) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (auth.token && !auth.routesReady) {
    await auth.loadProfileAndRoutes()
    return { ...to, replace: true }
  }

  if (to.meta.permissions && !auth.hasAll(to.meta.permissions)) {
    return { name: 'forbidden', replace: true }
  }
})
```

前端权限控制的作用是隐藏无权限菜单、避免无效跳转和改善体验，不能作为安全边界；接口必须由后端再次鉴权。路由组件用动态 `import()` 做分包，动态参数从 `/users/1` 切到 `/users/2` 时同一组件实例通常会复用，依赖参数重新请求数据时要 `watch(() => route.params.id)` 或使用组件内守卫，不能只依赖 `onMounted`。

> Hash 和 History 的核心区别是 URL 是否会真实请求服务端。Hash 不会，History 会，所以 History 刷新必须由 Nginx 回退到 `index.html`。权限路由上，我会在登录后拉用户和权限，再动态注册路由；刷新时在全局守卫恢复这份路由表，并 replace 回原目标页面。菜单、按钮和路由拦截是体验层，接口权限始终由后端兜底。

## MVVM、MVC 与 MVP

### MVVM

Vue 采用的架构模式。

+ model：数据模型
+ view：用户界面
+ viewModel：连接视图和模型的桥梁

MVVM 的核心特点是**数据绑定机制**，实现了视图和模型的自动同步。Vue 通过响应式系统和虚拟 DOM 实现了这一机制。

MVVM 工作流程：

+ 视图层通过声明式绑定与 `viewmodel` 关联
+ 用户与视图交互时，`viewmodel` 自动更新模型
+ 模型更新后，`viewmodel` 自动更新视图

Vue 中的 MVVM 实现：

+ Model：Vue 中的 **data** 数据对象
+ View：**模板**或渲染函数生成的 **DOM**
+ ViewModel：**Vue 实例本身**，包含响应式系统

```javascript
// Vue MVVM 示例
const vm = new Vue({
  // Model
  data: {
    message: 'Hello'
  },
  // View 相关（模板）
  template: '<div>{{ message }}</div>'
})
```

### MVC

MVC 将应用分为三个部分：

+ Model（模型）：负责数据管理
+ View（视图）：负责用户界面
+ Controller（控制器）：负责业务逻辑，连接模型和视图

在 MVC 中，控制器接收用户输入，操作模型数据，然后更新视图。视图和模型之间可能存在直接通信。

### MVP

MVP 是 MVC 的改进版：

+ Model（模型）：负责数据管理
+ View（视图）：负责用户界面
+ Presenter（展示器）：作为视图和模型的中间人

在 MVP 中，视图和模型完全分离，所有交互都通过 Presenter 进行。视图只负责显示，不包含业务逻辑。

三种模式对比：

![](https://cdn.nlark.com/yuque/0/2025/png/55783515/1753853080861-2f492c02-c7e6-474e-ab7d-5f537014c323.png)

## SPA 与性能优化

### SPA 与 MPA 的区别

SPA（single-page application）**单页面应用**：通过动态重写当前页面（Vue 中利用前端路由切换和组件渲染实现）来完成用户交互，避免页面之间切换打断用户体验。

SPA 和 MPA 的区别：

| 对比项 | 单页面应用（SPA） | 多页面应用（MPA） |
| :--- | :--- | :--- |
| 组成 | 一个主页面和多个页面片段 | 多个主页面 |
| 刷新方式 | 局部刷新 | 整页刷新 |
| URL 模式 | 前端路由（hash / history） | 真实 URL，整页跳转 |
| SEO 搜索引擎优化 | 难实现，可使用 SSR 方式改善 | 容易实现 |
| 数据传递 | 容易（内存中共享） | 通过 url、cookie、localStorage 等传递 |
| 页面切换 | 速度快，用户体验良好 | 切换需加载资源，速度慢 |
| 维护成本 | 相对容易 | 相对复杂 |

SPA 的缺点：

+ SEO 搜索引擎优化难：页面是动态生成的，搜索引擎爬虫无法完全收录所有内容
+ 首次加载时间较长
+ 内存消耗：应用变得复杂后，JavaScript 代码占用较多内存

### 手写一个最小的 SPA

```javascript
// 获取页面内容容器
const appDiv = document.getElementById("app");

// 定义路由表 (路径 -> 对应的页面内容或生成函数)
const routes = {
  "/home": () => `
        <h2>欢迎来到首页！</h2>
        <p>这是我们 SPA 的主页内容。</p>
    `,
  "/about": () => `
        <h2>关于我们</h2>
        <p>我们致力于提供优质的服务和产品。</p>
        <p>我们的团队由一群充满激情的人组成。</p>
    `,
  "/contact": () => `
        <h2>联系我们</h2>
        <p>如果您有任何疑问，请随时联系我们。</p>
        <p>邮箱：example@example.com</p>
    `,
  "/404": () => `
        <h2>404 - 页面未找到</h2>
        <p>抱歉，您访问的页面不存在。</p>
    `,
};

// 渲染函数：根据当前哈希值渲染对应的页面内容
function renderContent() {
  // 获取当前 URL 的哈希部分，并移除开头的 '#'
  let path = window.location.hash.slice(1);

  // 如果哈希为空，则默认显示首页
  if (!path) {
    path = "/home";
  }

  // 根据路径查找对应的渲染函数
  const contentFn = routes[path] || routes["/404"];

  // 将生成的内容插入到页面容器中
  appDiv.innerHTML = contentFn();
}

// 首次加载时渲染内容
renderContent();

// 监听 hashchange 事件，当 URL 哈希改变时重新渲染内容
window.addEventListener("hashchange", renderContent);

console.log("SPA 应用已启动，使用 Hash 模式进行路由管理。");
```

### SPA 首屏加载慢怎么解决

+ 减小入口文件体积
    - vue-router 配置路由采用路由懒加载

```javascript
routes: [
  {
    path: 'Blogs',
    name: 'ShowBlogs',
    component: () => import('./components/ShowBlogs.vue')
  }
]
```

+ 静态资源本地缓存
    - 采用 HTTP 缓存，设置 `Cache-Control`、`Last-Modified`、`Etag` 等响应头
+ UI 框架按需加载
+ 公共代码抽离，避免重复打包
    - 假设 `A.js` 是一个常用库，多个路由都使用了它，会造成重复下载
    - 解决方案：在 webpack 4+ 中配置 `optimization.splitChunks`，把被多个入口/路由引用的模块（如 `minChunks: 3`）抽离成公共 chunk，避免重复加载（webpack 3 的 `CommonsChunkPlugin` 已被移除，用 SplitChunksPlugin 替代）
+ 图片资源处理
    - 图片压缩：如 TinyPNG、ImageOptim 或构建工具的图片压缩插件
    - 图片懒加载：使用 `loading="lazy"` 属性（现代浏览器支持），或使用 Intersection Observer API 自行实现，或使用第三方懒加载插件

```html
<img src="placeholder.jpg" data-src="actual-image.jpg" loading="lazy">
```

+ 服务器端渲染（SSR）或者预渲染
    - **SSR**：在服务器端生成 Vue 应用的 HTML 发送给浏览器，用户可以立即看到内容，然后 Vue 在客户端进行"注水"（hydration），使其变为完全可交互的 SPA

### Vue3 性能优化实践

Vue3 的性能提升分两层。编译阶段，模板会被分析：静态节点会被提升，动态内容会带上 Patch Flag，Block Tree 会收集动态子节点。运行时更新时，Vue 不必递归比较整棵树，而是优先更新已标记的动态部分。列表乱序时仍会利用 `key` 和最长递增子序列减少 DOM 移动。

运行时层面，组件渲染是 effect；同一轮同步代码中多次修改响应式状态会进入调度队列并批量刷新，所以需要拿更新后的 DOM 时使用 `await nextTick()`，不要假设赋值后 DOM 已同步变化。

实际优化先定位再处理：

+ 列表必须使用稳定业务 ID 作为 `key`；大量数据用虚拟列表，不能期待 Diff 解决几万行 DOM 的渲染成本
+ 不常切换的内容用 `v-if`，频繁显示隐藏且初始成本可接受时用 `v-show`
+ 不再变化的区域可用 `v-once`；`v-memo` 只用于确认有大量重复列表渲染且依赖可明确声明的场景，不能作为默认写法
+ 路由和大组件使用动态 `import()` 或 `defineAsyncComponent` 分包，首屏只加载当前需要的代码
+ ECharts、地图等第三方实例用 `shallowRef` 或 `markRaw` 保存，并在卸载时销毁；不要把实例深度放入响应式对象

```typescript
const ReportPanel = defineAsyncComponent(() => import('./ReportPanel.vue'))

const chart = shallowRef<echarts.ECharts>()
onBeforeUnmount(() => chart.value?.dispose())
```

> Vue3 的核心优化是编译期先标记动态节点，运行时减少无意义 diff；再配合批量调度避免同一轮多次改状态就多次渲染。项目里我不会为了"优化"到处加 memo，而是先用 Performance 和 Vue Devtools 找重渲染来源：大列表先虚拟化，路由和重组件先分包，第三方实例避免深度响应式并在卸载时释放。这样优化的是实际瓶颈，不会增加无意义复杂度。
