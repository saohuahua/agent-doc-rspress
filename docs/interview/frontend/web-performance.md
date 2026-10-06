# 前端性能优化

## 前端常见的性能指标有哪些

1. `FP`(first paint)**首次绘制**
+ FP表示浏览器第一次把像素绘制到屏幕上的时间
+ 不一定代表有内容，可能是背景色，边框，容器等等，只能说明有反应
2. `FCP`(first contentful paint) **首次内容绘制**
+ `FCP`代表第一次绘制有实际内容的元素，比如文本，图片，svg等，比`FP`更加有参考价值
+ `FCP`优化通常几个方面
    - 减少首屏HTML,CSS,JS的阻塞
    - CSS 预加载，JS延迟进行
    - 减少首屏资源体积
    - 使用SSR/SSG提前输出HTML
3. `LCP`（largest contentful paint）：**最大内容绘制**。
+ LCP 表示视口内最大的内容元素完成渲染的时间，通常是首屏大图、标题、banner、主内容区域。它是 Core Web Vitals 的核心指标之一
+ 优化LCP的方式
    - 首屏大图`preload`
    - 图片压缩，使用webp、AVIF
    - 减少首屏的JS阻塞
    - SSR提前输出关键内容
    - CDN静态资源加速
    - 优化接口响应
4. `TTFB` (time to first byte) **首字节时间**
+  它更偏向服务端和网络层，但前端也需要关注，因为 TTFB 会影响 FCP 和 LCP。比如 SSR 页面，如果服务端渲染慢，`TTFB` 高，首屏自然也会慢  
+ 前端相关优化包括：
    - CDN 缓存 HTML 或静态资源
    - 减少 SSR 数据请求耗时
    - 使用边缘渲染 / 边缘缓存
    - 接口聚合，减少首屏等待

**交互类相关**

5. `FID` (first input delay) **首次输入延迟**
+ **现在逐渐被INP替代，因为这个FID只关注第一次交互，不够全面**
6. `INP`：Interaction to Next Paint，**交互到下一次绘制**
+ `INP` 表示用户交互后，到页面完成下一次视觉更新的耗时。它衡量的是整个页面生命周期内的交互响应能力，是当前 Core Web Vitals 的核心指标之一。  

**视觉稳定性指标**

7. `CLS`（cumulative layout shift）：**累计布局偏移**。
+ 衡量页面在加载过程中，元素异步加载等原因造成的意外位移， 一个高 `CLS` 值意味着用户可能在阅读文章时，文字突然被上方的广告挤压下去，这种意外的抖动会严重影响用户体验  

>  前端常见性能指标可以按加载、交互、稳定性和资源几个维度来看。加载类比较常见的是 `FP`、`FCP`、`LCP`、`TTFB`，其中 `LCP` 最重要，表示首屏最大内容什么时候渲染出来，通常受首屏图片、接口、JS 阻塞和服务端响应影响。交互类以前看 FID，现在更关注 `INP`，它衡量用户交互到页面下一次绘制的耗时，核心优化方向是减少主线程长任务、拆分 JS、减少框架不必要重渲染。视觉稳定性主要看 `CLS`，关注页面加载过程中是否发生布局偏移，常见优化是图片设置宽高、广告和动态模块提前占位。除此之外还有 DCL、Load、Long Task、Resource Timing 等辅助指标。实际项目里重点关注 LCP、INP、CLS，再结合 Performance API 和业务自定义指标，比如首屏接口耗时、路由切换耗时、组件渲染耗时，来定位具体性能瓶颈。  
>

**Core Web Vitals 与阈值速查**

| 指标 | 含义 | 良好阈值 | 维度 |
| --- | --- | --- | --- |
| LCP | 最大内容绘制 | < 2.5s | 加载 |
| INP | 交互到下一次绘制 | < 200ms | 交互 |
| CLS | 累计布局偏移 | < 0.1 | 视觉稳定 |
| FCP | 首次内容绘制 | < 1.8s | 加载（辅助） |
| TTFB | 首字节时间 | < 800ms | 网络（辅助） |

> 阈值指的是第 75 百分位（p75）的体验，也就是说至少 75% 的访问要达到这个水平才算合格。

## 平时怎么做性能测量？说说你对 Performance API 的了解

核心结论：面试里真正要掌握的是四件事——**精确计时（`performance.now`）、自定义打点（`mark`/`measure`）、订阅指标（`PerformanceObserver`）、读懂导航各阶段耗时（Navigation Timing）**。

```latex
performance.now()
  -> 高精度相对时间戳（相对页面导航起点），不受系统时间调整影响，用来算耗时

performance.mark / measure
  -> mark 记录一个时刻，measure 算两点之间的耗时
  -> 业务自定义指标（首屏、路由切换、接口耗时）的基础

PerformanceObserver
  -> 异步订阅性能条目，能拿到 paint / LCP / layout-shift / event / longtask / resource
  -> 这些指标"只有发生才知道"，只能靠它观测，不能靠轮询

Navigation Timing
  -> performance.getEntriesByType('navigation')[0]
  -> 描述一次页面导航各阶段：DNS、TCP、TTFB、DOMContentLoaded、Load
```

```js
// 1. 精确计时
const t0 = performance.now()
doSomething()
console.log(performance.now() - t0)

// 2. 自定义打点
performance.mark('list-render-start')
renderList()
performance.mark('list-render-end')
performance.measure('list-render', 'list-render-start', 'list-render-end')

const [m] = performance.getEntriesByName('list-render')
console.log(m.duration) // 这段逻辑的耗时

// 3. 用 PerformanceObserver 采集核心指标
new PerformanceObserver((list) => {
  const entries = list.getEntries()
  const lcp = entries[entries.length - 1]
  console.log('LCP', lcp.startTime, lcp.element)
}).observe({ type: 'largest-contentful-paint', buffered: true })

new PerformanceObserver((list) => {
  let cls = 0
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value // 排除用户主动操作引起的偏移
  }
  console.log('CLS', cls)
}).observe({ type: 'layout-shift', buffered: true })

// 4. 导航各阶段耗时
const nav = performance.getEntriesByType('navigation')[0]
console.log(nav.responseStart)            // 服务端首字节（TTFB 结束点）
console.log(nav.domContentLoadedEventEnd) // DOMContentLoaded
console.log(nav.loadEventEnd)             // Load
```

**自定义计算首屏时间**

`FCP`/`LCP` 只是浏览器口径，业务上的「首屏」通常指**首屏最后一块内容渲染完成**，所以要自己打点。关键点：性能条目的 `startTime` 本身就是相对导航起点的时间，拿到最后一个关键节点的 `startTime` 就是首屏时间。

```js
// 约定首屏的关键元素：banner 和 主列表 都出现，才算首屏完整
const observer = new MutationObserver(() => {
  const banner = document.querySelector('#banner')
  const list = document.querySelector('#main-list')
  if (banner && list) {
    performance.mark('first-screen-end')
    observer.disconnect()
    // entry.startTime 相对导航起点，直接就是首屏时间
    const firstScreen = performance.getEntriesByName('first-screen-end')[0].startTime
    report('first-screen', firstScreen)
  }
})

observer.observe(document.body, { childList: true, subtree: true })
```

> 聊性能测量，先要说清楚一个前提：浏览器给的指标和业务关心的指标不是一回事，`FCP`、`LCP` 是浏览器口径，业务首屏、路由切换、接口耗时得自己打点。所以 Performance API 是分两层用的。
>
> 通用层用 `PerformanceObserver` 订阅 `paint`、`largest-contentful-paint`、`layout-shift`、`event`、`longtask`，这些是"发生才知道"的指标，只能靠订阅，而且比轮询开销小。导航耗时读 `performance.getEntriesByType('navigation')[0]`，能拿到 DNS、TCP、TTFB、DOMContentLoaded、Load 各阶段。业务层用 `mark` / `measure` 自己定义起止点，比如首屏可以用 `MutationObserver` 监听约定的几个关键元素，都出现后 `mark` 一下，条目的 `startTime` 本身就是相对导航起点的时间，直接就是首屏时间。日常算耗时推荐 `performance.now()` 而不是 `Date.now()`，因为它不受系统时间校准影响。
>
> 这里有一个特别容易被忽略的点：LCP 不是 load 时就固定的，后面出现更大的元素还会更新，所以在 `load` 时上报拿到的往往是个偏小的中间值，必须在页面隐藏时才取最终值，否则指标会一直偏乐观。

## 线上性能指标是怎么采集和上报的？

核心结论：指标采集的三个关键是 **上报时机、上报方式、降噪**。

```latex
上报时机
  -> LCP 会被后续更大的元素更新；CLS、INP 是随整个生命周期累积的
  -> 不能在 load 就上报，要等 visibilitychange -> hidden（或 pagehide）取最终值

上报方式
  -> navigator.sendBeacon()：页面卸载时也能可靠发出，不阻塞卸载，最常用
  -> fetch(url, { keepalive: true })：同样支持卸载后发送，可带自定义头
  -> 1x1 GIF：兼容性最好、最简单，但能带的信息有限

降噪
  -> 按比例抽样上报、只上报超过阈值的、批量合并，避免监控本身变成性能负担

上报维度
  -> 设备、网络类型、页面版本、地区、是否首屏
```

```js
let lcp = 0
new PerformanceObserver((list) => {
  const entries = list.getEntries()
  lcp = entries[entries.length - 1].startTime // 先存着，后面可能还有更大的元素
}).observe({ type: 'largest-contentful-paint', buffered: true })

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return

  const nav = performance.getEntriesByType('navigation')[0]
  navigator.sendBeacon(
    '/api/perf',
    JSON.stringify({
      lcp,
      ttfb: nav.responseStart,
      dcl: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
      url: location.href,
      ua: navigator.userAgent,
    })
  )
})
```

**错误与白屏监控的配套采集**

性能埋点通常和错误监控一起做。这里有个高频细节：`window.onerror` **抓不到资源加载失败**，资源错误不会冒泡，必须用捕获阶段监听。

```js
window.addEventListener(
  'error',
  (e) => {
    if (e.target && (e.target.src || e.target.href)) {
      // 资源加载失败（img / script / link），target 是具体元素
      report('resource-error', e.target.src || e.target.href)
    } else {
      // JS 运行时错误
      report('js-error', e.message, e.filename, e.lineno)
    }
  },
  true // 关键：捕获阶段，否则拿不到资源错误
)

window.addEventListener('unhandledrejection', (e) => {
  report('promise-error', e.reason)
})
```

**业务自定义指标**：首屏时间、路由切换耗时、接口耗时与慢接口、组件渲染耗时。这些是通用指标之外最能体现排查能力的数据。

**上报维度与告警**：按设备、网络、版本、地区拆分看，只看均值会掩盖问题；对 LCP/INP/CLS 设阈值告警，关注 p75。工程上一般用 RUM 方案或 Sentry、ARMS、Slardar 这类平台。

> 性能埋点可以按"定指标 → 定上报方式 → 定上报时机 → 降噪"这个顺序来设计。
>
> 定指标要区分通用和业务：通用的 LCP、INP、CLS 直接拿，业务的首屏、路由切换、慢接口按需打点。上报方式上，卸载阶段优先用 `navigator.sendBeacon`，因为它不阻塞页面卸载、页面关了也能发出去；需要带自定义头就用 `fetch` 加 `keepalive`。上报时机是最容易出错的地方，LCP 会被后续元素更新、CLS 和 INP 是累积的，所以不能 `load` 就报，统一在 `visibilitychange` 变成 hidden 时取最终值上报。最后是降噪，抽样、只报超阈值的、批量合并——监控本身也是性能开销，如果埋点把页面拖慢了就本末倒置了。
>
> 另外性能埋点通常和错误监控一起做，尤其是资源加载失败，这个 `window.onerror` 抓不到，必须用捕获阶段监听，很容易漏。数据也要按设备、网络、版本拆开看，只看平均值会掩盖掉特定机型或网络下的问题。

## 首屏加载慢怎么优化？

核心结论：首屏优化要先分清「首屏时间、FCP、LCP」这三个口径，再从**资源、渲染、数据、图片**四层入手。

```latex
首屏时间
  -> 业务口径：首屏最后一块内容渲染完成，需要自己打点

FCP
  -> 浏览器第一次渲染出文本 / 图片 / SVG 等实际内容
  -> 只说明"开始了"，不代表首屏完整

LCP
  -> 视口内最大内容元素渲染完成
  -> 更接近"主要内容可见"，但和业务首屏仍有差异
```

**1. 资源层（减少阻塞、减少体积）**

- 关键 CSS 内联到 HTML，非关键 CSS 异步加载
- JS 用 `defer` / `async`，路由和组件懒加载，按需引入
- Tree Shaking 去掉无用代码，检查依赖体积
- gzip / brotli 压缩，CDN 分发
- 关键资源用 `preconnect` / `preload`

```html
<!-- 关键 CSS 内联，避免渲染阻塞 -->
<style>/* 首屏必须的样式 */</style>

<!-- 非关键 CSS 异步加载 -->
<link rel="stylesheet" href="/non-critical.css" media="print" onload="this.media='all'" />

<!-- JS 延迟执行 -->
<script src="/app.js" defer></script>
```

**2. 渲染层（尽快出内容）**

- SSR / SSG 直出 HTML，减少白屏
- 骨架屏占位，让用户感知到"在加载"
- 避免首屏加载大段同步 JS 后再渲染

**3. 数据层（减少等待）**

- 接口聚合，用 BFF 把首屏多个请求合成一个
- SSR 数据直出，避免客户端拿到 HTML 后再请求一次
- 本地缓存 / Service Worker 兜底
- 首屏接口提前发起、能并行的并行

**4. 图片层**

- webp / avif 格式，CDN 压缩与裁剪
- 首屏大图 `preload`，并设置宽高避免 CLS
- 非首屏图片懒加载

**量化验证**：优化前后用 Performance API 对比首屏时间、LCP、TTFB，而不是只凭感觉。

> 首屏优化不要上来就背优化手段，先做个判断：瓶颈到底在网络上还是在渲染上，因为这两类解法完全不同。判断方法很简单，看 TTFB 和 LCP 的差值——如果 TTFB 本身就很高，那是服务端和网络的问题，优先做 CDN、接口聚合、SSR 数据直出；如果 TTFB 正常但 LCP 高，那多半是首屏资源阻塞了渲染，优先做关键 CSS 内联、JS defer、代码分割、图片压缩。
>
> 然后才按资源、渲染、数据、图片四层去做：资源层关键 CSS 内联、JS defer/async、路由和组件懒加载、Tree Shaking、gzip/brotli、CDN；渲染层用 SSR/SSG 直出加骨架屏；数据层用 BFF 聚合接口、SSR 数据直出、本地缓存，避免客户端拿到 HTML 后再请求一次；图片层用 webp/avif、CDN 裁剪、首屏大图 preload 并设宽高。
>
> 取舍上，不建议一上来就上 SSR，因为 SSR 有服务端成本和缓存、水合问题，如果首屏不是 SEO 强需求、数据也不复杂，先做资源层优化加骨架屏性价比更高。最后一定要用 Performance API 量化前后对比，因为优化得有数据支撑，不然说不清收益，也不知道方向对不对。

## 图片怎么优化？说说渐进式加载和图片格式的选型

核心结论：图片优化分三层——**体积（格式 + 压缩 + 按需尺寸）、时机（懒加载 / 预加载 / 优先级）、体验（占位与渐进式加载）**。

```latex
体积
  -> 格式选对：WebP / AVIF 比 JPEG、PNG 小很多
  -> 压缩 + CDN 裁剪，按真实渲染尺寸下发
  -> 按 DPR 给多倍图，避免大图小用

时机
  -> 首屏图：preload + fetchpriority="high"，不能被懒加载
  -> 非首屏图：loading="lazy" 或 IntersectionObserver
  -> 写死宽高，避免图片加载完把内容顶下去（CLS）

体验
  -> 占位：纯色 / 骨架 / 低清图
  -> 渐进式加载：先模糊后清晰，避免大图区域一直空白
```

**格式选型**

| 格式 | 特点 | 适用场景 |
| --- | --- | --- |
| JPEG | 有损、体积小、不支持透明 | 照片 |
| PNG | 无损、支持透明、体积大 | 图标、需要透明 |
| WebP | 有损 / 无损 / 透明 / 动图，比 JPEG 小 25%~35% | 通用首选 |
| AVIF | 压缩率最好，编码慢、兼容性略差 | 大图，配降级 |
| SVG | 矢量、可无限缩放、可改色 | 图标、简单图形 |

```html
<!-- 格式降级：支持 AVIF 用 AVIF，否则 WebP，再否则 JPEG -->
<picture>
  <source type="image/avif" srcset="/hero.avif" />
  <source type="image/webp" srcset="/hero.webp" />
  <img src="/hero.jpg" width="800" height="450" alt="" />
</picture>

<!-- 按 DPR 给多倍图，避免大图小用 -->
<img src="/logo.png" srcset="/logo.png 1x, /logo@2x.png 2x" width="120" height="120" alt="" />
```

**渐进式加载的三种做法**

| 方案 | 原理 | 说明 |
| --- | --- | --- |
| 渐进式 JPEG | 同一张图由模糊到清晰分多次扫描 | 浏览器原生，只需改编码方式 |
| LQIP / blur-up | 先显示几 KB 的低清版模糊放大，高清图加载完替换 | 最常用 |
| 纯色 / 骨架占位 | 用主色或固定模板占位 | 成本最低 |

两个容易答错的点：

- **低清占位图通常不是另一张图**，而是同一张图压到极小尺寸（构建期或服务端生成），所以不会出现「第一帧和后面内容对不上」；固定模板占位只适合列表这种图源不确定的场景。
- 换图**不能直接改 `src`**，中间会闪一下空白，要两层叠放 + `opacity` 过渡。

```html
<div class="img-wrap">
  <img class="thumb" src="/hero-tiny.jpg" alt="" />
  <img class="full" src="/hero.jpg" alt="" onload="this.style.opacity = 1" />
</div>
```

```css
.img-wrap { position: relative; }
.img-wrap .thumb { filter: blur(12px); }
.img-wrap .full { position: absolute; inset: 0; opacity: 0; transition: opacity .3s; }
```

**两个偏业务的图片题**

- **用户一次传 100 张图怎么展示**：不要 100 张原图直出。先在本地生成缩略图（`canvas` 或 `createObjectURL`）再渲染，列表用虚拟滚动；上传走**并发受控的队列**（比如 3~5 个并发），配失败重试和进度；大图先压缩再传。
- **图片加载进度条怎么做**：单张图在浏览器侧拿不到真实下载进度，只有上传（`xhr.upload.onprogress` / `axios onUploadProgress`）才有；单图场景用占位图 + `onload` 淡入就够，不要硬做进度条。

**怎么衡量**：优化前后看 LCP 条目里的 `element` 是不是那张图，再结合 Network 的 Size / Timing 和 p75 的 RUM 数据，而不是只看自己单次打开的体感。

> 图片优化按体积、时机、体验三层来讲。体积上，格式首选 WebP，压缩率要求更高可以用 AVIF 并配 `<picture>` 做降级，再配合 CDN 按实际渲染尺寸裁剪、按 DPR 给多倍图，避免大图小用。时机上，首屏大图要 `preload` 加 `fetchpriority="high"`，不能被懒加载坑到 LCP；非首屏图用原生 `loading="lazy"` 或 IntersectionObserver；同时写死宽高避免 CLS。体验上就是渐进式加载，常见三种做法：渐进式 JPEG 是同一张图分多次扫描，浏览器原生；LQIP 是先放一张几 KB 的低清图模糊放大，高清图加载完淡入，这个低清图通常是同一张图压出来的，不是另一张图；再简单点就是纯色或骨架占位。有两个细节容易被追问：换图不能直接改 `src`，要两层叠放加过渡，否则会闪；单张图拿不到真实下载进度，进度条只在上传场景有意义。业务上问得比较多的是上传 100 张图怎么展示，思路是先生成缩略图、虚拟滚动、并发受控上传。最后用 LCP 和 RUM 数据验证效果。

## 线上页面白屏了，你会怎么排查？

核心结论：白屏本质是「首屏该出现的内容没出现」，排查要先**分类原因**，再**抓错误 + 看网络 + 对比版本**。

```latex
常见原因
  -> JS 报错中断了渲染：最常见，一个致命错误整棵渲染树都挂不上
  -> 静态资源加载失败：JS / CSS 404、CDN 挂掉、被拦截
  -> 路由 / 权限逻辑：跳转循环、守卫卡住、鉴权失败
  -> 接口失败或数据异常：拿不到数据又没兜底，渲染空内容
  -> SSR 水合失败：服务端 HTML 和客户端不一致，直接崩
  -> 兼容性：低版本浏览器不支持打包后的新语法
  -> 内存溢出：页面崩溃
```

**排查手段**

- 抓错误：`window.onerror` + `unhandledrejection` + 资源错误（捕获阶段），配合 **sourcemap 还原**压缩后的堆栈
- 看网络：Network 面板确认资源是否 404 / 超时 / 被 CSP 拦截 / CDN 异常
- 看 DOM：Elements 里根节点是否为空、是否一直卡在 loading 占位
- 对比版本：是否某个灰度版本 / 某次发布后才出现，能否回滚验证
- 采集现场：用户 UA、网络、页面版本、地区，线上白屏往往只在特定环境复现

**白屏监控方案**

- **关键元素探针**：约定首屏关键 DOM，超时仍未出现就上报白屏
- `MutationObserver` 监听根节点是否真的渲染出内容
- 截图对比：更准确但成本高，一般只做少量采样

```js
// 白屏探针：约定 #app 是根节点，3s 后仍无子节点则上报
window.addEventListener('load', () => {
  setTimeout(() => {
    const root = document.querySelector('#app')
    if (!root || root.children.length === 0) {
      navigator.sendBeacon(
        '/api/blank',
        JSON.stringify({ url: location.href, ua: navigator.userAgent })
      )
    }
  }, 3000)
})
```

**预防**

- Vue 用 `onErrorCaptured` 或 `app.config.errorHandler` 兜住渲染错误，避免整页崩
- 关键模块失败时降级（例如图表加载失败显示占位）
- 骨架屏 / loading 兜底，不要让用户看到纯白

```ts
// 全局兜底：未捕获的组件渲染 / 生命周期错误
app.config.errorHandler = (err, instance, info) => {
  report('vue-error', { err, info })
}

// 组件级兜底：捕获子组件错误并做降级渲染
onErrorCaptured((err, instance, info) => {
  report('component-error', { err, info })
  degraded.value = true
  return false // 阻止继续向上冒泡
})
```

> 白屏先分成两大类来看：是"代码挂了"还是"资源没到"。实际经验里最常见的还是 JS 报错中断了渲染，或者某个静态资源 404、CDN 挂掉。
>
> 定位顺序上：先看监控里的 JS 错误和资源错误，配合 sourcemap 还原堆栈，这一步能解决大部分问题；如果没抓到错误，再看接口是不是失败、路由守卫是不是卡住、是不是只在某个低版本浏览器复现。
>
> 线上问题最难的是复现，所以要特别关注采集上来的 UA、网络、版本、地区这些环境信息，白屏往往只在特定环境出现，有这些维度才能圈定范围，也能判断要不要回滚。监控方案上，关键元素探针最实用——约定首屏几个关键 DOM，超时没出现就上报，比截图对比成本低很多，也更容易常态化跑。预防方面，Vue 可以用 `onErrorCaptured` 或 `app.config.errorHandler` 兜住渲染错误，关键模块做降级，底线是不能让用户看到纯白。

## 懒加载怎么实现？preload 和 prefetch 有什么区别？

核心结论：懒加载解决「**不该现在加载的不要加载**」，preload / prefetch 解决「**该用的资源怎么更早准备**」，两者是配合关系。

**懒加载**

```js
// 图片懒加载：进入视口附近才真正加载
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const img = entry.target
      img.src = img.dataset.src
      io.unobserve(img) // 加载后取消观察，避免重复触发
    })
  },
  { rootMargin: '200px' } // 提前 200px 开始加载，滚动更顺滑
)

document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img))
```

```ts
// 组件异步加载（Vue 3 + TS）
const Detail = defineAsyncComponent(() => import('./Detail.vue'))

// 路由级懒加载（vue-router）
const routes: RouteRecordRaw[] = [
  { path: '/detail', component: () => import('@/views/Detail.vue') },
]
```

**懒加载如何防止无限请求**（高频追问）：

- 加载完成后 `unobserve`，或加 `loaded` 标记，避免同一元素反复触发
- `rootMargin` 提前一段距离加载，避免用户滚到底才开始请求造成抖动
- 回调里做节流，滚动的 IntersectionObserver 触发本身已经很轻，但要避免回调里做重活
- **失败要有重试次数上限**，否则加载失败会被反复触发，形成请求风暴

**四个指令对比**

| 指令 | 作用 | 时机与优先级 | 典型场景 |
| --- | --- | --- | --- |
| `dns-prefetch` | 只做 DNS 解析 | 很早、开销极小 | 第三方域名 |
| `preconnect` | DNS + TCP + TLS 建连 | 早、开销中等 | 确定会用到的第三方域名（CDN、字体） |
| `preload` | 提前加载**当前页面必需**的资源 | 高优先级，与主资源并行 | 首屏大图、字体、关键 JS/CSS |
| `prefetch` | 预取**将来可能用**的资源 | 空闲时、低优先级，存入 HTTP 缓存 | 下一个路由的 chunk |

```html
<link rel="dns-prefetch" href="//cdn.example.com" />
<link rel="preconnect" href="https://cdn.example.com" crossorigin />
<link rel="preload" as="image" href="/hero.webp" />
<link rel="preload" as="font" href="/font.woff2" type="font/woff2" crossorigin />
<link rel="prefetch" href="/next-page.chunk.js" />
```

**两个易追问的细节**

- `preload` 的资源必须**当前页面真的会用**，Chrome 里如果在 3 秒内没被使用，控制台会报警告
- 如何验证 `prefetch` 生效：Network 面板看该请求优先级是 Lowest、发生在空闲时段；真正用到时 Size 列会显示来自 `prefetch cache`（或 disk cache），说明命中了预取

> 懒加载按资源类型选方案：图片用 `IntersectionObserver`，进视口附近才把 `data-src` 赋给 `src`；组件和路由用 Vue 自带的 `defineAsyncComponent` 或 `() => import()`，不用自己造。
>
> 一个常见的坑是懒加载很容易变成"无限请求"，所以要做三件事：加载后立刻 `unobserve`、用 `rootMargin` 提前一段距离加载避免滚到底才请求造成抖动、失败的重试要设上限，否则一个加载失败的图会被反复触发。核心是"同一个资源只请求一次"这个意识。
>
> preload 和 prefetch 可以从"资源什么时候用"来区分：`preload` 是当前页面马上就要用的，高优先级、和主资源并行，比如首屏大图和字体；`prefetch` 是将来可能用的，浏览器空闲时低优先级预取，比如下一个路由的 chunk。`dns-prefetch` 只解析 DNS，`preconnect` 还会把 TCP、TLS 建连也做了，第三方域名提前建连能省不少时间。
>
> 取舍上，preload 不要滥用，它会抢主资源的带宽，用不上还会被 Chrome 警告；prefetch 也不要预取太多，不然浪费用户流量。验证就看 Network 面板的优先级和 Size 列，prefetch 命中的会显示来自 prefetch cache。

## 长列表渲染卡顿怎么优化？说说虚拟列表的实现

核心结论：虚拟列表的本质是「**总高度占位 + 只渲染可视区那一小段 DOM + 偏移到正确位置**」，用少量 DOM 换来长列表的流畅滚动。

```latex
核心思路
  -> 数据总量不变，但只渲染「可视区 + 缓冲」的少量 DOM
  -> 用 scrollTop 和 itemHeight 算出起始下标 startIndex 和可见数量
  -> 用一个撑满「总高度」的容器占位，保证滚动条长度正确
  -> 真正渲染的每一项用 top / translateY 偏移到它该在的位置

关键参数
  -> itemHeight：定高最省事；不定高需要估算 + 实测 + 缓存修正
  -> overscan：上下各多渲染几项做缓冲，避免快速滚动出现白边
```

**定高虚拟列表核心代码**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  list: string[]
  itemHeight: number
  height: number
}>()

const scrollTop = ref(0)
let ticking = false

// 可视区对应的起止下标（上下各多渲染 1 项做缓冲）
const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - 1)
)
const endIndex = computed(() =>
  Math.min(props.list.length, Math.ceil((scrollTop.value + props.height) / props.itemHeight) + 1)
)
const visible = computed(() => props.list.slice(startIndex.value, endIndex.value))

// 滚动用 rAF 节流，避免高频滚动触发高频响应式更新
function onScroll(e: Event) {
  const top = (e.currentTarget as HTMLElement).scrollTop
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrollTop.value = top
    ticking = false
  })
}
</script>

<template>
  <!-- 外层滚动容器 -->
  <div :style="{ height: `${height}px`, overflowY: 'auto' }" @scroll="onScroll">
    <!-- 占位容器：撑满总高度，让滚动条正确 -->
    <div :style="{ height: `${list.length * itemHeight}px`, position: 'relative' }">
      <div
        v-for="(item, i) in visible"
        :key="startIndex + i"
        :style="{
          position: 'absolute',
          top: `${(startIndex + i) * itemHeight}px`,
          height: `${itemHeight}px`,
          width: '100%',
        }"
      >
        {{ item }}
      </div>
    </div>
  </div>
</template>
```

**不定高怎么办**：先用一个估算高度渲染，再用 `ResizeObserver` 或 DOM 测量拿到真实高度，缓存到高度数组里，同时修正总高度和偏移。已经测过的项直接复用缓存，避免每次滚动都重新测量。

**虚拟列表 vs 分页 vs 无限滚动**

| 方案 | 优点 | 缺点 | 适用 |
| --- | --- | --- | --- |
| 虚拟列表 | 滚动无缝、DOM 少、性能好 | 不能深链接、SEO 差、实现复杂 | 信息流、大表格 |
| 分页 | 请求可控、易缓存、可定位 | 交互割裂、每页都要请求 | 后台表格、数据查询 |
| 无限滚动 | 体验流畅 | 数据越滚越多、难回到某位置 | 内容流 |

实践中大表格常把「分页 + 虚拟滚动」结合：分页控制单次数据量，虚拟滚动控制 DOM 数量。

**海量数据一次加载如何避免卡顿**（高频追问）：

- 时间分片：`requestIdleCallback` 或 `setTimeout` 分批渲染，不要一次性同步插入上万 DOM
- Web Worker 处理数据：排序、过滤、格式化这些 CPU 密集操作放到 Worker，不阻塞主线程
- 虚拟化：不管数据多少，DOM 数量都固定

> 虚拟列表先从"为什么卡"讲起：一次渲染几千上万个 DOM，内存和渲染开销都很大，滚动时还要频繁重排。解法就是把 DOM 数量固定下来，只渲染可视区加缓冲的那一小段。
>
> 实现上分两种。定高的最简单，`scrollTop` 除以 `itemHeight` 算出起始下标，外面套一个撑满总高度的占位容器保证滚动条正确，每一项绝对定位或 `translateY` 到对应位置。不定高的要复杂一些，先估算高度渲染，再用 `ResizeObserver` 实测并缓存，滚动时修正偏移，这部分最容易出 bug，可以用单测兜住。
>
> 几个实践坑：滚动监听要用 `requestAnimationFrame` 节流，不然高频滚动会触发高频响应式更新；上下要多渲染几项做缓冲，否则快速滚动会白边；如果数据量极大，排序、过滤这些计算可以放 Web Worker，避免主线程长任务。
>
> 结论上，虚拟列表不是银弹，它不能深链接、SEO 也差，所以后台表格更倾向分页加虚拟滚动结合，而不是无脑全量虚拟列表。

## 什么是重排和重绘？怎么减少重排？

核心结论：**重排（回流）改的是布局，代价最大；重绘改的是外观，代价较小；只走合成的属性（transform、opacity）代价最小。** 优化的核心是「少改布局、批量改、把改动交给合成层」。

```latex
渲染流水线
  JS -> Style(计算样式) -> Layout(重排/回流) -> Paint(重绘) -> Composite(合成)

重排 Layout
  -> 几何属性变化（位置、大小、显隐），需要重新计算布局
  -> 代价最大，而且会连带重绘

重绘 Paint
  -> 只改外观（颜色、背景、阴影），不影响布局
  -> 代价比重排小

合成 Composite
  -> transform / opacity 这类可以交给 GPU 在合成层处理
  -> 跳过 Layout 和 Paint，代价最小
```

**减少重排的常用手段**

- 合并 DOM 操作：用 `documentFragment` 批量插入、先 `display: none` 改完再显示、`cloneNode` 在离线节点上改
- 批量改样式：用 `cssText` 或切换类名，别一条条改 `style.xxx`
- 避免「读写交替」：读取 `offsetWidth`、`scrollTop`、`getComputedStyle` 会强制浏览器立刻重排
- 动画用 `transform` / `opacity`，不要用 `top` / `left` / `width` / `height`
- 脱离文档流的元素（`position: absolute / fixed`）改尺寸对整体布局影响小
- 缓存布局属性读取结果，别重复读

**强制同步布局（layout thrashing）**

这是最容易被追问的点：读写交替会让浏览器被迫立刻执行一次布局，导致同一帧内多次重排。

```js
// 坏：读 offsetWidth 和写 style 交替，每次写之前都被迫重排
for (let i = 0; i < items.length; i++) {
  items[i].style.width = box.offsetWidth + 'px' // 读一次 offsetWidth 就触发一次重排
}

// 好：先集中读，再集中写
const width = box.offsetWidth // 只读一次
for (let i = 0; i < items.length; i++) {
  items[i].style.width = width + 'px'
}
```

**合成层与 GPU 加速**

`transform`、`opacity`、`will-change`、`<video>`、`<canvas>` 等可以让元素提升为独立合成层，动画时只走合成，不触发重排重绘。

```css
/* 用 transform 做位移和缩放动画，走合成层 */
.move {
  transform: translateX(100px);
  transition: transform 0.3s;
}
.card {
  will-change: transform; /* 提前告诉浏览器，但别滥用 */
}
```

注意：合成层不是越多越好，每个层都占显存，滥用 `will-change` 会导致「层爆炸」，反而拖慢渲染，要按需使用、用完移除。

> 重排重绘要放在渲染流水线里讲：JS 改样式后触发 Style 计算，几何属性变了就重排，重排一定连带重绘；只改颜色这类外观就只重绘；只改 `transform`、`opacity` 可以直接走合成，代价最小。所以优化方向可以概括成一句话：能走合成就别重绘，能重绘就别重排。
>
> 落实到代码上：批量操作 DOM，用 `documentFragment` 或者先 `display:none` 改完再显示；样式用 `cssText` 或类名切换，不逐条改；动画一律用 `transform`，不用 `top`/`left`。
>
> 这里最值得展开的是强制同步布局，也就是读写交替。比如循环里每次都读 `offsetWidth` 再写 `width`，浏览器会被迫每次都立刻重排。正确做法是先把要读的值集中读出来，再集中写。这类问题不会报错，只在数据量大时才表现出来，属于 code review 里最常抓的一类。
>
> 合成层能提升动画性能，但 `will-change` 不能随便加，层太多会占显存、反而更慢，一般只对确实在动的元素加，动画结束就移除。

## 强缓存和协商缓存有什么区别？线上怎么做缓存策略？

核心结论：**强缓存不发请求直接用本地缓存，协商缓存会发请求问服务器资源变没变（没变返回 304）。** 命中顺序是先强缓存，过期后再协商缓存。

```latex
强缓存
  -> 不发请求，直接读本地缓存，状态码 200 (from disk/memory cache)
  -> 响应头：Expires（绝对时间）/ Cache-Control（相对时间，优先）

协商缓存
  -> 发请求问服务器资源是否更新，没变返回 304，继续用本地缓存
  -> 响应头：Last-Modified / ETag
  -> 请求头：If-Modified-Since / If-None-Match

命中顺序：先查强缓存 -> 命中直接用；过期 -> 走协商缓存 -> 304 用本地 / 200 用新的
```

**强缓存**

- `Expires`：HTTP/1.0，绝对时间，依赖客户端时间，客户端时间不准就会失效，不可靠
- `Cache-Control`：HTTP/1.1，相对时间，**优先级高于 `Expires`**
  - `max-age=31536000`：多久内直接用缓存
  - `no-cache`：**可以缓存，但每次使用前都要向服务器协商**（注意不是不缓存）
  - `no-store`：完全不允许缓存
  - `public` / `private`：能否被代理 / CDN 缓存
  - `immutable`：有效期内即使用户刷新也不发请求

**协商缓存**

- `Last-Modified` / `If-Modified-Since`：精确到秒，一秒内改多次会漏判；文件内容没变但修改时间变了会误判；分布式部署时间可能不一致
- `ETag` / `If-None-Match`：内容指纹，判断更精确；代价是服务端要计算，分布式生成策略不同也可能不一致
- 优先级：`ETag` > `Last-Modified`（两者同时存在时，服务器以 `If-None-Match` 为准）

**前端实践策略**

- HTML 入口文件：`Cache-Control: no-cache`，保证每次发布后用户都能拿到新版本
- JS / CSS 等静态资源：文件名带 contenthash + `Cache-Control: max-age=31536000, immutable`
- 内容变了 hash 变、URL 变，天然绕过旧缓存，所以静态资源可以放心长缓存

```nginx
# HTML：协商缓存
location ~* \.html$ {
  add_header Cache-Control "no-cache";
}

# 带 hash 的静态资源：一年强缓存 + immutable
location ~* \.(js|css|woff2|png|webp)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**不同刷新方式对缓存的影响**

| 操作 | 对缓存的影响 |
| --- | --- |
| 地址栏回车 / 页面跳转 | 正常查缓存，强缓存有效就直接用 |
| F5 普通刷新 | 跳过强缓存，请求带 `Cache-Control: max-age=0`，走协商校验（返回 304 则继续用本地）；带 `immutable` 的资源才不会重新校验 |
| Ctrl + F5 强制刷新 | 完全跳过缓存，所有资源重新下载 |

浏览器本地还有 **memory cache**（内存，快、当前会话）、**disk cache**（磁盘，持久），以及 **Service Worker** 可以完全接管缓存策略。

> 缓存先讲命中顺序：先查强缓存，命中就直接用、不发请求；过期了再走协商缓存，发请求问服务器，没变就 304 继续用本地的。强缓存里 `Expires` 是绝对时间、依赖客户端时间不可靠，`Cache-Control` 是相对时间且优先级更高。
>
> 这里特别容易答错的是 `no-cache` 和 `no-store` 的区别：`no-cache` 不是不缓存，而是可以缓存但每次用之前都要协商；`no-store` 才是完全不缓存。协商缓存里 `Last-Modified` 精确到秒、还可能因为修改时间变了误判，`ETag` 是内容指纹更准但服务端要算，同时存在时以 `ETag` 为准。
>
> 工程策略上：HTML 用 `no-cache`，保证发布后用户能拿到新版本；JS/CSS 这些带 contenthash 的文件名加一年强缓存和 `immutable`，内容变了 URL 就变，天然绕过旧缓存。这套组合既保证更新及时，又把静态资源的缓存用到了极致。还有一个常见事故是 HTML 也被强缓存了，发版后用户一直停在旧版本，而且旧 HTML 引用的旧 chunk 可能已经被清掉，直接白屏，所以入口文件一定不能长强缓存。

## CDN 在前端性能优化里怎么用？

核心结论：CDN 的价值是**就近访问 + 缓存复用**（原理见 [计网.md 的 CDN 一节](network)）。前端真正要做的是三件事：**资源前缀配对、缓存策略配好、发布顺序保证不出白屏**。

```latex
前端侧要做的三件事
  1. 资源前缀：publicPath / base 指向 CDN 域名，多环境隔离
  2. 缓存策略：hash 文件名 + 长强缓存，HTML 走协商缓存
  3. 发布顺序：先传静态资源，再传 HTML

CDN 特有的缓存指令
  -> s-maxage：只对共享缓存（CDN / 代理）生效，优先级高于 max-age
  -> stale-while-revalidate：先返回旧内容，后台异步回源更新
```

**配置资源前缀**

```ts
// vite.config.ts
export default defineConfig({
  base: 'https://cdn.example.com/static/', // 生产指向 CDN
})

// webpack：通过 publicPath 注入，务必按环境区分
// dev 环境不能写生产 CDN 域名，否则测试资源会污染线上
```

**命中率与回源**（高频追问）

- 会拉低命中率的因素：资源上带了变化的 query、响应带 `Cookie` / `Vary`、缓存 key 配置不合理、新版本没预热
- `s-maxage` 只作用于 CDN 这类共享缓存，和浏览器的 `max-age` 分开控制，适合「浏览器短缓存、CDN 长缓存」
- **私有数据不能走公共 CDN**：SSR 个性化页面如果被公共节点缓存，会出现 A 用户看到 B 用户数据的事故，必须 `private` 或不缓存，或按用户维度隔离缓存键

**发布一致性**（实战重点，也是最容易出事故的地方）

- 顺序必须是：**先传静态资源 → 等 CDN 就绪 → 再传 HTML**。反过来会出现「新 HTML 引用了还没上传的 chunk」，直接 404 + 白屏
- **刷新（purge）≠ 预热（preheat）**：刷新是删旧缓存，预热是提前把资源推到节点；发布后要刷新的是 HTML，静态资源靠 hash 文件名天然绕过旧缓存，**不需要刷新，把刷新当兜底而不是方案**
- 灰度 / 回滚时，CDN 上的旧版本资源不能删，否则还在跑旧 HTML 的用户直接白屏

**边缘能力（加分项）**

- 边缘 gzip / brotli 压缩、边缘图片处理（裁剪、转 WebP）
- 边缘 SSR：Nuxt / Nitro 可以部署到边缘运行时，把 TTFB 压下来
- HTTP/2 多路复用、HTTP/3 QUIC；**HTTP/2 下不再需要域名分片**，分片是 HTTP/1.1 时代的优化，在 HTTP/2 下反而多出建连开销

**排查**：CDN 异常导致整站白屏、CDN 缓存了错误响应（清缓存 + 加 `no-store` 兜底）、字体和图片因为漏配 CORS 加载失败。

> CDN 的原理是就近访问加缓存复用，这里不展开，前端侧真正要做的是三件事。第一是资源前缀，Webpack 的 `publicPath` 或 Vite 的 `base` 指向 CDN 域名，并且严格按环境隔离，别把测试环境写到生产 CDN。第二是缓存策略，静态资源用 hash 文件名加一年强缓存，HTML 走协商缓存；另外 CDN 有专属指令，`s-maxage` 只对共享缓存生效，可以实现浏览器短缓存、CDN 长缓存，`stale-while-revalidate` 可以先返回旧内容再后台更新。第三是发布顺序，必须先传静态资源再传 HTML，否则新 HTML 引用了还没上传的 chunk 会直接 404 白屏。这里有个概念要分清：刷新是删缓存、预热是提前推资源，静态资源靠 hash 天然绕过旧缓存，根本不用刷新，刷新只是兜底手段。另外要注意公共 CDN 不能缓存私有数据，SSR 个性化页面被公共节点缓存会出现串用户数据的事故。加分项是边缘压缩、边缘图片处理和边缘 SSR，以及记住 HTTP/2 下不需要再做域名分片。

## 用户反馈页面卡顿，你会怎么定位和排查？

核心结论：卡顿排查先**分清现象**（加载卡、交互卡、滚动卡、掉帧），再看**指标**（长任务、INP、帧率），然后**分层定位**（网络 → 主线程 → 渲染 → 内存），最后落到**具体代码**。

```latex
定位流程
  1. 明确现象：加载慢 / 交互卡 / 滚动卡 / 动画掉帧
  2. 看指标：LCP（加载）、INP 和 Long Task（交互）、帧率（动画）
  3. 区分瓶颈层：网络 -> 主线程 -> 渲染 -> 内存
  4. 用工具钻到具体代码 / DOM
```

**工具链**

- **Performance 面板**：录一段操作，看 Main 主线程火焰图找长任务（> 50ms）、看 Frames 找掉帧、看 Bottom-Up 找耗时最长的函数
- **`PerformanceObserver` 观测 `longtask`**：线上定位长任务，定位是哪个交互 / 哪个脚本造成
- **Vue DevTools**：看组件渲染次数和耗时，找出不必要的组件更新
- **Memory 面板**：堆快照对比，定位内存泄漏
- **Layers 面板**：看合成层情况

```js
// 线上监控长任务，超过 50ms 即算长任务
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    report('longtask', {
      duration: entry.duration,
      startTime: entry.startTime,
      attribution: entry.attribution, // 哪个脚本 / 框架 / 容器造成的
    })
  }
}).observe({ entryTypes: ['longtask'] })
```

**常见根因与解法**

| 现象 | 根因 | 解法 |
| --- | --- | --- |
| 主线程卡死 | 长任务：大计算、一次性渲染大量 DOM | 拆分任务、时间分片、Web Worker、WASM |
| 交互无响应 | 组件更新过多、大组件更新 | v-memo / computed、拆分组件、虚拟列表、shallowRef |
| 滚动掉帧 | 频繁重排重绘、DOM 过多 | 虚拟列表、transform 动画、合成层 |
| 越用越卡 | 内存泄漏 | 清理定时器 / 监听器，Memory 面板定位 |
| 首屏慢 | 网络 + 渲染阻塞 | 见「首屏加载慢怎么优化」 |

**内存泄漏专项**

常见来源：未清理的定时器、未移除的事件监听、闭包持有大对象、全局变量、**Detached DOM**（DOM 已从文档移除但 JS 还在引用，无法回收）。

```ts
import { onMounted, onUnmounted } from 'vue'

let timer: number

// 泄漏写法：只挂监听，没有清理
onMounted(() => {
  timer = setInterval(fetchData, 1000)
  window.addEventListener('resize', onResize)
  // 组件卸载后定时器还在跑、onResize 还持有组件引用，内存和状态都不释放
})

// 正确写法：在 onUnmounted 里统一清理
onMounted(() => {
  timer = setInterval(fetchData, 1000)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('resize', onResize)
})
```

定位方法：Memory 面板做两次堆快照，先操作再操作后对比，看哪些对象持续增长不释放；重点看 Detached 的 DOM 节点。

**完整案例：用户反馈某个 Vue 页面卡，你怎么排查**

1. 先分清是「加载卡」还是「交互卡」，问清操作路径和复现条件
2. 打开 Performance 录一段操作，看长任务、看组件渲染次数
3. 常见结论与对应解法：
   - 父组件响应式数据变化，导致子组件跟着更新 → 拆分组件缩小更新范围、`computed` 缓存派生数据
   - 传给子组件的 prop 每次都是新对象 / 新数组 → 稳定引用，或用 `v-memo` 控制更新粒度
   - 大对象用了深层 `reactive`，响应式开销大 → 换 `shallowRef` / `markRaw`
   - 列表项太多 → 虚拟列表
   - 大计算同步阻塞 → 拆分、Worker、时间分片
   - 内存泄漏导致越用越卡 → Memory 面板定位并清理

> 卡顿排查的思路是先分类再定位，因为不同现象对应的指标和方向完全不同。第一步要问清是加载卡、交互卡、滚动卡还是动画掉帧：加载看 LCP，交互看 INP 和长任务，动画看帧率。
>
> 第二步用 Performance 面板录一段操作，看主线程火焰图里有没有超过 50ms 的长任务，配合 Bottom-Up 找到最耗时的函数；线上可以监听 `longtask` 上报，它的 `attribution` 能看到是哪个脚本造成的，这样就能把线上问题和具体代码对应上。
>
> 第三步判断是哪一层的问题：网络慢、主线程被长任务占着、渲染层重排重绘多、还是内存泄漏。经验上最常见的是两类：一是一次性渲染太多 DOM 或大计算阻塞主线程，解法是虚拟列表、时间分片、Web Worker；二是无谓的组件更新，比如父组件响应式数据变化导致子组件跟着重新渲染、或者传下去的 prop 每次都是新对象导致缓存失效，解法是拆分组件、`v-memo`、`computed`、`shallowRef`。
>
> 如果是"越用越卡"那基本就是内存泄漏，用 Memory 面板做两次堆快照对比，重点看 Detached DOM 和一直增长不释放的对象，最常见的原因就是定时器和事件监听没清理。原则是不要凭感觉改代码，先用工具定位到具体那一行，不然很容易优化了不痛不痒的地方。

## WebView 里的 H5 首屏很慢，怎么优化？

核心结论：WebView 比浏览器慢的本质是**链路更长而且串行**，优化思路就两句话：**把串行变并行、把网络请求变本地**。

```latex
H5 首屏串行链路
  App 启动
    -> 创建 / 初始化 WebView 内核（100~300ms）
    -> 加载 URL
    -> DNS / TCP / TLS
    -> HTML 下载与解析
    -> 静态资源下载
    -> 首屏接口请求
    -> 渲染首屏

和浏览器的差异
  -> 内核要现初始化，没有浏览器级的预热
  -> 没有跨 App 共享的缓存和 Cookie
  -> 资源全部重新下载
  -> 网络请求可以被 Native 拦截
```

**容器层：Native 配合做的事**（收益最大）

- **WebView 预创建 / 复用池**：App 启动或空闲时就把内核初始化好，真正打开时直接复用，省掉 100~300ms
- **并行化**：内核初始化与首屏接口请求并行，不要让接口等内核就绪；更进一步是 Native 提前请求接口，拿到后经 JSBridge 注入 H5，H5 首屏直接读内存数据
- **离线包**：Native 用请求拦截（Android `shouldInterceptRequest` / iOS `NSURLProtocol`）把 JS / CSS / 图片换成本地文件返回，资源零网络耗时；配合公共资源包内置（Vue、组件库多业务复用）、版本管理、增量更新和签名校验

```latex
离线包要点
  -> 请求拦截：命中本地文件就直接返回，不走网络
  -> 版本管理：按版本号下载 + 差量更新，避免每次全量下发
  -> 签名校验：防止本地包被篡改
  -> 降级：拦截失败要能回退到网络请求，不能直接白屏
```

**前端层：直接复用已有手段**

- 首屏优化那套：关键 CSS 内联、骨架屏、减少首屏 JS、接口聚合
- 图片优化、缓存策略、懒加载、CDN 同样适用
- 网络层再加 `dns-prefetch` / `preconnect`、域名收敛、HTTP/2

**两个容易忽略的协作点**

- **登录态同步**：Native 提前把 Cookie / token 写进 WebView，避免首屏再多一次鉴权请求
- **生命周期打通**：`onPause` / `onResume` ↔ `visibilitychange`，锁屏恢复后按需刷新，而不是无条件重拉

**白屏与排查**

- 回扣白屏那节：容器没创建成功、离线包拦截失败、JS 报错、资源 404
- 调试：vConsole、Safari / Chrome 远程调试、Native 日志、抓包
- 监控：H5 侧埋点要和 Native 侧的首屏耗时对齐，单看一边会漏掉内核初始化那段

> WebView 首屏慢，本质是链路比浏览器长而且串行：内核要现初始化，大概 100 到 300 毫秒，然后才是 DNS、建连、下载 HTML、下载静态资源、请求首屏接口、渲染，而且 WebView 没有浏览器级的预热，也没有跨 App 共享的缓存。所以优化就两句话：把串行变并行，把网络请求变本地。容器层收益最大：一是 WebView 预创建或复用池，把内核初始化提前掉；二是并行化，内核初始化和首屏接口并行，再进一步是 Native 提前请求接口，通过 Bridge 把数据注入 H5；三是离线包，Native 用 `shouldInterceptRequest` 或 `NSURLProtocol` 把 JS、CSS、图片换成本地文件返回，资源零网络耗时，同时做好版本管理、增量更新、签名校验，并且一定要有拦截失败回退网络的降级。前端层就直接复用已有手段：关键 CSS 内联、骨架屏、图片优化、缓存、CDN、懒加载。协作上有两个点容易被忽略：登录态要提前同步进 WebView，避免首屏多一次鉴权请求；生命周期要和 `visibilitychange` 打通。排查还是白屏那套，容器没创建、拦截失败、JS 报错、资源 404，监控要把 H5 埋点和 Native 首屏耗时对齐。

## SSE 流式输出导致页面卡顿，你会怎么优化？

核心结论：流式输出的卡顿根因是**每个 token 都触发一次渲染**，导致高频 re-render 加高频 Markdown 解析。核心解法是 **buffer 累积 + requestAnimationFrame 合帧更新**，再做增量渲染和组件隔离。

```latex
卡顿根因链
  token 高频到达（可能每几十毫秒一个）
    -> 每个 token 都更新一次响应式数据
    -> 触发高频 re-render + Markdown 重新解析 + DOM 重新插入
    -> 主线程长任务堆积、INP 变差
```

**1. 合帧更新（最关键）**

```js
// 坏：每个 token 都更新响应式数据，高频渲染
eventSource.onmessage = (e) => {
  content.value += e.data
}

// 好：buffer 累积 + rAF 合帧，一帧最多更新一次
let buffer = ''
let scheduled = false
eventSource.onmessage = (e) => {
  buffer += e.data
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    content.value += buffer
    buffer = ''
    scheduled = false
  })
}
```

**2. 增量渲染**：只追加变化的部分，避免每来一个 token 就把整段 Markdown 重新 `parse` 一遍；大段内容可以按块解析、只替换最后一个未闭合的块。

**3. 拆分组件 + `v-memo` / `v-once`**：把流式内容放到独立组件里，避免整个页面重渲染；已完成的历史消息用 `v-memo` 或 `v-once` 缓存，不让它们跟着最新内容一起重渲染。

**4. 高亮 / 表格延迟处理**：代码高亮和复杂表格开销大，可以只对已完成的块做高亮，或者在流结束后、浏览器空闲时再处理。

**5. 打字机效果**用 `requestAnimationFrame` 逐帧追加；批量插入 DOM 时用 `DocumentFragment`，减少重排。

**6. 滚动跟随**：自动滚到底部要用 rAF 节流，不要每个 token 都触发一次 `scrollTop` 写入，否则会频繁重排。

> SSE 流式渲染卡顿先要判断是"渲染频率太高"还是"单次解析太贵"。因为 token 到达频率很高，如果每个 token 都更新一次响应式数据，就会触发高频 re-render，同时大段 Markdown 每次都被重新解析，主线程被长任务占满，表现就是 INP 变差、滚动和输入都卡。
>
> 第一优先级是合帧更新：用 buffer 累积 token，用 `requestAnimationFrame` 保证一帧最多更新一次，这样 60fps 下每秒最多渲染 60 次而不是几百次，这一步通常就能解决大部分卡顿。
>
> 然后是减少每次渲染的开销：只追加变化的部分，不要每次把整段 Markdown 重新 parse；把流式内容拆到独立组件里，配合 `v-memo` / `v-once` 让历史消息不跟着重渲染。再往后是延后重活，代码高亮和复杂表格开销大，可以放到流结束或者浏览器空闲时处理。
>
> 还有一个容易忽略的点是自动滚到底部，如果用 `scrollTop` 每个 token 都写一次也会频繁重排，同样要用 rAF 节流。这一块最关键的不是背优化清单，而是知道卡顿来自"更新太频繁"还是"单次太重"，两个方向的解法不一样。
