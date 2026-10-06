# Nuxt

原生 Vue SPA 的典型流程是：浏览器先拿到一个只有根节点的 HTML，再下载和执行 JavaScript，Vue Router 匹配路由，前端请求接口，最后渲染页面。它开发简单、前后端边界清晰，但首屏内容出现得晚，搜索引擎和社交平台拿到的初始 HTML 也缺少业务内容。

Nuxt 是 Vue 的全栈框架。它在 Vue 之上提供约定式路由、服务端渲染、预渲染、服务端 API、数据获取、SEO 管理和部署运行时。它不是要替代 Vue，而是解决 Vue SPA 在首屏、SEO、路由约定和 BFF 能力上的重复建设。

```latex
Vue SPA
浏览器拿到空壳 HTML
  -> 下载 JS
  -> 路由匹配
  -> 请求接口
  -> 渲染页面

Nuxt SSR
浏览器请求页面
  -> Nuxt 服务端请求数据并渲染 HTML
  -> 浏览器先展示内容
  -> 下载 JS 并 hydration
  -> 页面可交互
```

| 对比项 | 原生 Vue SPA | Nuxt |
| --- | --- | --- |
| 路由 | 手动维护 `vue-router` 配置 | `pages/` 文件约定生成路由，也可扩展路由规则 |
| 首屏 HTML | 通常只有应用根节点 | 可在服务端输出实际页面内容 |
| 数据获取 | 通常在组件挂载后请求 | 可在服务端请求并把结果传给客户端 |
| SEO | 依赖爬虫执行 JS，稳定性较低 | 可输出标题、描述和正文 HTML |
| 服务端能力 | 需要另建 BFF 或后端 | 可用 Nitro 写 `server/api`、中间件和服务端逻辑 |
| 部署 | 静态资源即可 | SSR 需要服务端或边缘运行时；SSG 可以静态部署 |

Nuxt 的代价也很明确：SSR 增加了服务端 CPU、TTFB、缓存、部署和排障复杂度；同一段代码需要同时考虑服务端和浏览器环境。后台管理、强登录态页面、内部系统不因为使用 Nuxt 就一定更好，纯 CSR 往往更省事。内容站、商品详情、官网、文档站等需要首屏内容和 SEO 的页面更适合 Nuxt。

> 我引入 Nuxt 主要是为了解决 Vue SPA 的首屏和 SEO 问题，同时减少路由、数据获取、SEO 标签和 BFF 的重复搭建。Nuxt 会把首屏页面在服务端渲染成 HTML，浏览器先能看到内容，再 hydration 成可交互页面。但 SSR 有服务端成本和复杂度，所以我不会把所有页面都 SSR：内容页和落地页更适合，强登录态的后台页面通常保留 CSR 或做混合渲染。

## CSR、SSR、SSG 和混合渲染应该怎么选

CSR 是浏览器拿到 JavaScript 后再渲染；SSR 是每次请求由服务器根据当前请求渲染 HTML；SSG 是构建时提前生成静态 HTML；混合渲染是在同一 Nuxt 项目里按路由分别选择策略。

| 方式 | 适合页面 | 优点 | 代价 |
| --- | --- | --- | --- |
| CSR | 后台、编辑器、强交互工作台 | 服务端简单，客户端交互自由 | 首屏和 SEO 弱 |
| SSR | 商品详情、新闻详情、需要按请求个性化的公开页面 | 首屏内容完整，SEO 友好 | 每次请求消耗服务端资源，缓存更复杂 |
| SSG | 文档、帮助中心、更新频率低的官网页 | 静态文件可 CDN 缓存，访问快且成本低 | 内容更新需要重新构建或增量更新 |
| 混合渲染 | 同时有内容页和后台页的产品 | 为每类页面选合适策略 | 需要维护路由级缓存和渲染规则 |

登录态不是 SSR 的绝对禁区。服务端可以读取 HttpOnly Cookie 后渲染用户信息，但这类响应高度个性化，不能直接走公共 CDN 缓存，服务端压力和缓存泄露风险都更高。实际常见做法是公开骨架或公开内容走 SSR/SSG，用户私有数据在客户端补充；若确实需要服务端渲染私有数据，必须保证按用户隔离缓存，并且只从 Cookie 等服务端可信来源读取身份。

Nuxt 可通过 `routeRules` 按路径配置渲染和缓存策略。具体 `ISR`、边缘缓存的实现能力取决于部署平台和适配器，设计时不能只写框架配置，还要确认 Vercel、Node Server、Cloudflare 等目标环境是否真正支持对应缓存行为。

> CSR、SSR、SSG 不是谁先进的问题，而是数据新鲜度、个性化程度和访问量之间的取舍。文档、官网适合 SSG；商品和文章详情通常 SSR；后台和编辑器偏 CSR。登录态页面如果 SSR，要特别处理用户级缓存隔离，所以项目里经常把公共内容服务端输出、私有数据客户端再拉取。

## Nuxt SSR 从请求到页面可交互经历了什么

一次首屏 SSR 请求可以分成下面几步：

```latex
浏览器请求 /products/1
  -> Nitro 接收请求，执行 server middleware
  -> 匹配 pages/products/[id].vue 和路由 middleware
  -> useAsyncData / useFetch 在服务端请求数据
  -> Vue 服务端把页面渲染为 HTML
  -> 返回 HTML、CSS、JS 资源链接和 Nuxt payload
  -> 浏览器解析 HTML，先显示内容
  -> 浏览器下载并执行客户端 JS
  -> Vue 用同一份初始状态 hydration，绑定事件和响应式
  -> 后续导航转为客户端路由切换
```

服务端渲染阶段没有浏览器 DOM，所以不能直接使用 `window`、`document`、`localStorage`、`matchMedia` 等 API。`onMounted` 只在客户端执行；`setup`、`useAsyncData` 的逻辑则可能同时在服务端首屏和客户端导航时执行，因此代码要区分运行环境。

```typescript
if (import.meta.client) {
  const theme = localStorage.getItem('theme')
}

if (import.meta.server) {
  // 只能在服务端执行的逻辑
}
```

Nuxt 的服务端不是一个永久共享的浏览器环境。请求级数据必须按请求创建，不能把当前用户、Cookie、语言等信息放在模块顶层的可变变量里，否则并发请求可能串数据。需要跨 SSR 到客户端传递的轻量状态可用 `useState`，复杂客户端交互状态可用 Pinia，但都要保证初始化不会把 A 用户的数据复用给 B 用户。

> SSR 的关键不是“服务端生成了一次 HTML”，而是服务端和客户端要用同一份初始数据渲染同一棵结构。Nuxt 服务端请求数据、输出 HTML 和 payload，浏览器先展示 HTML，再用 payload hydration 绑定事件。SSR 代码必须避免直接访问 window 和 localStorage，并且用户相关状态必须按请求隔离，不能放在服务端全局变量里。

## 什么是 hydration，为什么会出现 hydration mismatch

hydration 不是重新渲染页面。浏览器已经拿到了服务端输出的 HTML，Vue 客户端运行后会根据同样的 VNode 结构复用现有 DOM，并绑定事件、响应式更新能力。如果客户端首轮渲染的结果与服务端 HTML 不一致，就会出现 hydration mismatch；Vue 可能警告并局部重新创建 DOM，造成闪烁、性能下降，严重时事件或状态异常。

常见原因和处理方式：

| 原因 | 为什么不一致 | 处理方式 |
| --- | --- | --- |
| `Date.now()`、`Math.random()` | 服务端和客户端值不同 | 服务端生成后写入 payload，或使用固定 seed |
| 时区、语言、屏幕尺寸 | 两端环境不同 | 统一服务端 locale，客户端能力在挂载后再判断 |
| `window`、`localStorage`、Cookie 使用不当 | 服务端没有浏览器环境，或身份来源不一致 | 服务端读取请求 Cookie；浏览器 API 放 `onMounted` |
| 首屏异步数据不同步 | 两端各自请求，结果或时机不同 | 首屏数据使用 `useAsyncData` / `useFetch` |
| HTML 结构不合法 | 浏览器会自动修正 DOM | 保证标签嵌套合法，例如不要在 `<p>` 内放块级元素 |
| 第三方只支持浏览器的组件 | 服务端和客户端渲染结果不同 | `ClientOnly` 包裹，或改为客户端动态加载 |

```vue
<script setup lang="ts">
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <ClientOnly>
    <MapPanel />
    <template #fallback>
      <div class="map-placeholder" />
    </template>
  </ClientOnly>

  <p v-if="mounted">只在客户端读取的能力</p>
</template>
```

`ClientOnly` 是处理浏览器专属组件的工具，不应该用它把整个首屏正文包起来，否则 SSR 和 SEO 的收益就被抵消。正确做法是尽量让公共正文在两端稳定一致，仅隔离地图、图表、编辑器、广告 SDK 之类无法服务端渲染的局部区域。

> hydration 就是客户端接管服务端已经生成的 DOM，而不是再生成一份页面。它要求两端第一次渲染的结构和数据一致。排查 mismatch 时我优先查随机数、时间、时区、localStorage、接口是否两端重复请求、以及非法 HTML；浏览器专属组件只用 ClientOnly 隔离局部，不能把整个页面都退化成客户端渲染。

## Nuxt 中 `useFetch`、`useAsyncData` 和 `$fetch` 有什么区别，如何避免 SSR 后重复请求

`$fetch` 是基于 ofetch 的请求工具，适合事件处理器、普通工具函数或点击事件。它本身不负责把服务端请求结果序列化到 Nuxt payload。

`useAsyncData` 是 Nuxt 的异步数据状态容器，负责 key、pending、error、缓存与 SSR/客户端状态传递。`useFetch` 是建立在 `useAsyncData` 上的便捷封装，适合直接请求 URL。

```vue
<script setup lang="ts">
const route = useRoute()

const { data: product, pending, error } = await useFetch(
  () => `/api/products/${route.params.id}`,
  { key: () => `product:${route.params.id}` }
)
</script>
```

上面的 `useFetch` 在首屏由服务端执行，结果进入 Nuxt payload；浏览器 hydration 时会复用 payload，避免立刻再请求同一份数据。反过来，若在页面 `setup` 里直接 `await $fetch('/api/products/1')`，服务端渲染时会请求一次，客户端 hydration 又可能执行一次，因此容易双请求。

请求 key 必须能区分真正影响结果的参数，例如商品 ID、语言、筛选条件和当前用户维度。不同请求共用一个 key 会读到错误缓存；同一数据使用不同 key 则失去去重。对于用户私有接口，还要在服务端转发必要的 Cookie 或 Authorization，且不能把带用户数据的结果缓存为公共数据。

> `useAsyncData` 管 Nuxt 的异步状态和 SSR 数据传递，`useFetch` 是它的 URL 请求封装，`$fetch` 只是请求工具。首屏页面数据我会用 useFetch 或 useAsyncData，并设计包含关键参数的 key，让服务端结果写进 payload，客户端 hydration 直接复用；只有点击保存、轮询、事件处理这些非首屏请求才直接用 $fetch。

## Nuxt 的路由、中间件和服务端 API 如何组织

Nuxt 根据 `pages/` 自动生成 Vue Router 路由：`pages/users/[id].vue` 对应 `/users/:id`，`pages/blog/[...slug].vue` 对应捕获路由。页面元信息通过 `definePageMeta` 配置，页面级中间件可用于登录校验、权限校验或数据前置条件。

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(to => {
  const token = useCookie('access_token')

  if (!token.value && to.meta.requiresAuth) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
```

服务端 API 放在 `server/api/`，例如 `server/api/users/[id].get.ts` 会生成 `/api/users/:id`。它适合聚合后端接口、隐藏服务端密钥、处理 Cookie、裁剪前端需要的数据和做同源 BFF；但复杂领域逻辑、数据库事务和长期任务仍应在专门的后端服务中维护，不应因为 Nuxt 能写 API 就全部塞入前端仓库。

路由中间件只保护前端页面导航，不能保护真正的数据安全。服务端 API 和下游业务接口必须独立校验用户身份与权限。客户端跳过路由、直接调用 API 或伪造参数时，安全边界仍然在服务端。

> Nuxt 用 pages 约定生成路由，路由 middleware 负责页面进入前的体验校验，server/api 则可以作为 BFF 聚合接口和隐藏密钥。我的边界是：路由守卫不承担安全，API 仍然要鉴权；Nuxt API 处理贴近页面的聚合和转换，复杂业务和事务保持在独立后端服务。

## Nuxt SSR 页面性能应该怎么优化

SSR 改善的是浏览器拿到内容的时间，不保证整体一定更快。服务端串行请求、未缓存的接口、过大的 payload 都会抬高 TTFB，反而让首屏变慢。

我会先区分瓶颈在服务端还是浏览器：服务端看接口耗时、渲染耗时、缓存命中率和 TTFB；客户端看 HTML 解析、关键 CSS、JS 体积、LCP 和 hydration 耗时。常见做法是：

- 独立数据请求尽量并行，不要在 `setup` 中形成无意义的 `await` 串行链路。
- 公开且变化不频繁的页面使用 SSG 或 CDN 缓存；个性化页面做私有缓存或不缓存，避免串用户数据。
- 只把首屏必需数据放进 payload，列表分页和非首屏模块按需加载。
- 大型图表、编辑器和非关键交互组件动态加载，避免占用首屏 hydration。
- 使用 `useSeoMeta` 输出稳定的服务端标题、描述和社交卡片信息，而不是在 `onMounted` 后再修改。

> SSR 优化不能只看浏览器指标。服务端接口慢或 payload 太大时，TTFB 会先变差，用户依然看不到页面。我会分别看服务端请求和渲染耗时、缓存命中率、客户端 LCP 与 hydration；公开内容优先静态化或 CDN 缓存，首屏只传必要数据，重组件延迟加载。
