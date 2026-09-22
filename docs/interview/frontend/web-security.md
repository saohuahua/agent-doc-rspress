# 前端安全

核心结论：**同源策略限制的是"读"，基本不限制"发"**。

同源判定：协议 + 域名 + 端口都相同。

被限制的（读）：

+ 前端 JS 读取跨源 Ajax/fetch 的响应
+ 跨源 DOM 访问：`iframe.contentDocument`、`window.opener.document`
+ 跨源读取 Cookie / localStorage / IndexedDB

不被限制的（发）：

+ `<img>` `<script>` `<link>` `<video>` 等标签的跨源资源加载
+ 表单提交、页面跳转——请求照常发出去，浏览器不拦

这个"口子"就是一堆问题的根源：

+ JSONP：利用 `<script>` 加载不受限
+ CSRF：利用"发请求不受限 + 浏览器自动带 Cookie"
+ 各种跨域方案本质都是在合法地绕过"读限制"

两个细节：

+ Cookie 的同源判定**只看域名、忽略端口**：`localhost:3000` 和 `localhost:5173` 共享 Cookie，本地同时跑两个服务时经常互相踩 Cookie
+ `document.domain` 放宽同源的方案已被废弃，跨源通信现在用 postMessage / CORS

> 口述：同源策略一句话是"限制读、不限制发"。读的方向：跨源响应、跨源 DOM、跨源存储都拿不到；发的方向：img/script/link、表单、跳转都不拦。理解了这一点，CSRF、JSONP、跨域方案能全部串起来——CSRF 和 JSONP 钻的是"发不受限"的空子，CORS 是服务端授权放开"读限制"。实战细节：Cookie 判定同源只看域名忽略端口，本地两个端口的服务共享 Cookie，排查"登录态串了"的问题时会用到。

## 如何实现跨域请求
核心思路： **开发环境用代理，生产环境让后端配置 CORS  **

首先跨域

+ **跨域**是指浏览器从一个页面向另一个不同源的地址发请求时，受到浏览器**同源策略**限制

判断是否同源看 `协议 + 域名 + 端口`，有一个不同就是跨域

```javascript
http://localhost:5173

https://localhost:5173        // 协议不同
http://127.0.0.1:5173         // 域名不同
http://localhost:3000         // 端口不同
https://api.xxx.com           // 域名、协议都可能不同
```

+ 如何实现跨域

开发环境

+ 可以用vite 等转发

```typescript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
};

fetch('api/user')
// 浏览器看到的就是
http://localhost:5173/api/user //同源
```

**Nginx 反向代理，统一转发（生产环境）**

**CORS**

+  CORS，全称 Cross-Origin Resource Sharing，跨源资源共享  
+ 核心： 后端在响应头里告诉浏览器：允许某个来源访问我  

```html
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

> 跨域是浏览器同源策略导致的限制。同源要求协议、域名、端口都相同，只要有一个不同，前端 JS 在请求并读取接口响应时就可能被浏览器拦截。跨域并不是请求一定发不出去，而是浏览器不允许前端读取跨源响应。
>
> 解决跨域最主流的是 CORS，由后端设置 `Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 等响应头。如果请求要携带 Cookie，前端需要设置 `withCredentials` 或 `credentials: 'include'`，后端也要设置 `Access-Control-Allow-Credentials: true`，并且不能使用 `*` 作为允许源。
>
> 在开发环境中，前端通常通过 Vite 或 Webpack devServer 配置代理，把 `/api` 请求转发到真实后端，因为服务端之间请求不受浏览器同源策略限制。生产环境中常见做法是通过 Nginx 反向代理，把前端和接口统一到同一个域名下。

## JSONP 的原理是什么，为什么被淘汰

原理：`<script>` 标签加载不受同源策略限制，且跨源加载回来的 JS 会直接执行。前端定义全局回调函数，回调名通过 URL 传给服务端，服务端返回一段"调用该回调"的 JS：

```javascript
// 前端
function handleData(data) { console.log(data) }
const script = document.createElement('script')
script.src = 'https://api.example.com/user?cb=handleData'
document.body.appendChild(script)
// 服务端返回字符串：handleData({"name": "Tom"})，script 加载完立即执行
```

被淘汰的原因：

+ 只能 GET
+ 需要服务端专门拼接回调，侵入性强
+ 本质是执行远端返回的 JS，服务端被劫持就直接执行恶意代码，XSS 风险大
+ 全局函数污染，没有统一的错误处理
+ CORS 成熟后没有存在价值，现在只作原理考察

> 口述：JSONP 利用的是 script 标签不受同源策略限制：前端定义好全局回调，把回调名拼在 URL 上，服务端返回 `handleData({"name": "Tom"})` 这样的 JS 字符串，script 加载完立即执行，数据就拿到了。它被淘汰是因为只能 GET、要服务端专门配合拼接回调、本质是执行远端 JS 有 XSS 风险，CORS 普及之后就没有使用价值了，现在主要作为原理被问到。

## 为什么有的跨域请求会多发一次 OPTIONS

CORS 把请求分两类：**简单请求**直接发送，浏览器带上 `Origin` 头，服务端用 `Access-Control-Allow-Origin` 应答；**非简单请求**要先发一次 OPTIONS 预检，通过了才发真正的请求。

同时满足以下条件才是简单请求：

+ 方法是 GET / POST / HEAD
+ 只带安全头（Accept、Accept-Language、Content-Language 等）
+ Content-Type 只能是 `text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`

不满足就是非简单请求：浏览器先发一个 OPTIONS，带上 `Origin`、`Access-Control-Request-Method`、`Access-Control-Request-Headers`，问服务端允许哪些源、方法、头，通过后才发真正的请求。

联调最常踩的坑：前端一旦用 `application/json` 传 JSON，或带了 `Authorization` 头，就不是简单请求 → 先发 OPTIONS → 后端/网关没放行 → 表现为"明明配了 CORS 还是报跨域"。排查方法：Network 里看 OPTIONS 那条请求的响应头，缺哪个补哪个，`Access-Control-Allow-Headers` 要包含实际用到的自定义头。

预检结果可以用 `Access-Control-Max-Age` 缓存，有效期内的同类请求不再重复预检（Chrome 上限 2 小时）。

> 口述：CORS 请求分简单请求和预检请求。同时满足方法是 GET/POST/HEAD、只带安全头、Content-Type 是文本或表单三种之一，才是简单请求，直接发送；否则浏览器先发一个 OPTIONS 预检，问服务端允许哪些源、方法和头，通过后才发真正的请求。实际开发里 Content-Type 用 application/json 或者带 Authorization 就会触发预检，后端没放行 OPTIONS 就报跨域——我联调时遇到过"明明配了 CORS 还是报跨域"，排查就是看 Network 里 OPTIONS 那条请求的响应头。预检结果可以用 Access-Control-Max-Age 缓存，减少重复预检。

## 跨域请求怎么携带 Cookie

三处配置缺一不可：

1. 前端：`fetch(url, { credentials: 'include' })`，axios 设 `withCredentials: true`
2. 后端：`Access-Control-Allow-Credentials: true`
3. 后端：`Access-Control-Allow-Origin` 必须是**具体域名**，不能用 `*`

还有一处容易被忽略——Cookie 本身：`SameSite` 默认是 Lax，跨站请求根本不会带上 Cookie，跨域携带必须显式设 `SameSite=None; Secure`。

> 口述：跨域带 Cookie 我会按配置点数：前端 fetch 设 `credentials: 'include'` 或 axios 的 withCredentials，后端 `Access-Control-Allow-Credentials: true`，`Access-Control-Allow-Origin` 必须是具体域名不能用星号。还有一处容易漏：Cookie 本身的 SameSite 默认 Lax，跨站请求不会自动带上，要显式设 None 加 Secure。这几处任何一处没配，表现都是"明明带了凭证还是没有登录态"，按这四点挨个排查就能定位。

## 代理为什么能解决跨域

同源策略是**浏览器的行为**，服务器之间互发请求没有跨域概念。

+ 开发环境：Vite/devServer 本质是一个本地 Node 服务，浏览器请求同源的 `/api`，Node 服务再转发给真实后端——浏览器全程以为自己在和同源服务器通信
+ 生产环境：Nginx 反向代理把页面和接口统一到同一域名下，同理

一句话：**代理不是绕开了跨域，而是让浏览器根本感知不到跨域**。

> 口述：代理能解决跨域，根本原因是同源策略只是浏览器的行为，服务器之间互发请求不存在跨域。开发环境 Vite 代理本质是本地起了一个 Node 服务转发请求，浏览器全程以为在和同源服务器通信；生产环境用 Nginx 反向代理把页面和接口统一到一个域名下。一句话：代理不是绕开了跨域，而是让浏览器根本感知不到跨域。

## 跨域还有哪些解决方案

+ CORS：标准方案，主流
+ 代理：开发用 devServer，生产用 Nginx，工程上最常用
+ JSONP：历史方案，只能 GET
+ postMessage：页面与 iframe / `window.open` 新窗口之间的通信，解决的是页面间跨源，不是 Ajax 跨域
+ WebSocket：建立连接时有跨源握手，但协议本身没有同源限制，靠服务端校验 Origin
+ `document.domain`：已废弃，了解即可

生产上更推荐**同域部署 + 网关转发**：前端页面和接口统一在一个域名下，跨域问题在架构层面就不存在，也不用逐个接口配 CORS。

> 口述：除了 CORS 和代理，我会补充几个：JSONP 是历史方案，只能 GET；postMessage 解决的是页面与 iframe、新窗口之间的通信，不是 Ajax 跨域；WebSocket 协议本身没有同源限制，连接要靠服务端校验 Origin；document.domain 已经废弃。最后我会说生产上更推荐同域部署加网关转发，前端和接口统一域名，跨域问题在架构层面就不存在。

## 如何辨析XSS与CSRF攻击
**XSS，全称 Cross-Site Scripting，跨站脚本攻击**

+  网站没有正确处理用户输入，导致攻击者提交的恶意 JS 被浏览器当成正常脚本执行

```javascript
// 高危写法
container.innerHTML = userInput;
// 安全写法
container.textContent = userInput;
// 或者用插值语法 vue/react 默认会做转义，不会当做HTML执行
<div>{{ content }}</div>
<div>{content}</div>

// 另外一种高危写法 v-html
<div v-html="content"></div>
<div dangerouslySetInnerHTML={{ __html: content }} />
```

**防御方式**：

+ 输入校验
+ 输出转义
+ 避免直接使用 `innerHTML`
+ 谨慎使用 `v-html` / `dangerouslySetInnerHTML` （使用 `v-html` 或 dangerouslySetInnerHTML 时必须做 HTML Sanitizer）
+ 富文本内容使用白名单过滤
+ 设置 CSP
+ Cookie 设置 `HttpOnly`



** CSRF，全称 Cross-Site Request Forgery，跨站请求伪造**

+  用户已经登录了 A 网站，浏览器里有 A 网站的 Cookie。攻击者诱导用户访问 B 网站，B 网站偷偷向 A 网站发请求，浏览器会自动带上 A 网站 Cookie，于是 A 网站误以为这是用户本人操作。  

防御方式

+  CSRF Token  
+ `SameSite Cookie`
+  校验 Origin / Referer  

>  XSS 的危害通常比 CSRF 更大，因为一旦 JS 在站点上下文执行，攻击者不仅可以发请求，还可能读取页面数据、读取 CSRF Token、劫持用户操作  
>

| 对比点 | XSS | CSRF |
| --- | --- | --- |
| 攻击目标 | 用户浏览器中的页面 | 用户已登录身份 |
| 攻击方式 | 注入并执行恶意 JS | 伪造用户请求 |
| 是否需要执行 JS | 通常需要 | 不一定需要，图片、表单都可以 |
| 是否依赖 Cookie | 不一定 | 通常依赖浏览器自动携带 Cookie |
| 用户是否已登录 | 不一定 | 通常需要已登录 |
| 主要危害 | 窃取 Cookie、篡改页面、冒充用户操作 | 冒用用户身份执行操作 |
| 防御重点 | 防止脚本注入和执行 | 防止跨站伪造请求被接受 |

## XSS 分哪几类

XSS 按恶意代码的**存放位置**分三类：

| 类型 | 恶意代码在哪 | 怎么触发 | 特点 |
| --- | --- | --- | --- |
| 存储型 | 服务端数据库（评论、昵称、简介） | 任何访问该页面的用户 | 影响所有访问者，危害最大 |
| 反射型 | URL 参数 | 诱导用户点击恶意链接 | 一次性，参数被"反射"回页面 |
| DOM 型 | 前端 JS 自己写入 | JS 把不可信数据赋给 `innerHTML` / `v-html` | 全程不经过服务端，纯前端问题 |

防御对应：存储型/反射型主要靠服务端输出转义；DOM 型靠前端不把不可信数据当 HTML 执行；富文本场景用白名单 sanitizer（DOMPurify），再叠 CSP 兜底。

> 口述：XSS 按恶意代码的存放位置分三类。存储型在数据库，比如评论区内容里带恶意脚本，所有访问这个页面的人都会中招，危害最大；反射型在 URL 参数里，需要诱导用户点击恶意链接；DOM 型是前端自己把不可信数据赋给了 innerHTML 或 v-html，全程不经过服务端。防御上，存储型和反射型主要靠服务端输出转义，DOM 型靠前端守住"不把不可信数据当 HTML 执行"这条线，富文本场景用 DOMPurify 白名单过滤，再叠 CSP 兜底。

## AI 对话流式 Markdown 渲染怎么防 XSS

做 AI 对话需求时完整考虑过这个安全问题，渲染链路：

```text
SSE 增量文本 → 累积拼接 → Markdown 转 HTML（marked / markdown-it） → v-html 渲染
```

三个风险点：

1. **AI 输出本身是不可信数据**：模型可能被用户诱导原样输出 `<script>`、`<img onerror=...>`、`[点我](javascript:...)`，"AI 生成的"不等于"安全的"，必须按用户输入对待
2. **流式分片可能把攻击载荷切开**（流式特有的坑）：sanitize 必须在每次拼接后的**完整文本**上做，不能只清洗本次增量。比如上一片是 `<img src=x onerr`，下一片是 `or=alert(1)>`，单片看都不是攻击，拼起来才是
3. **未闭合标签的中间态**：流式渲染到一半时 `<img src="` 可能还没传完，浏览器容错解析会渲染出意外结构。做法：流式过程中只渲染到最后一个完整块（按段落截断），收到结束标记后再对完整文本做一次最终渲染

代码实现：

```typescript
import DOMPurify from 'dompurify'
import { marked } from 'marked'

function renderMarkdown(raw: string): string {
  const html = marked.parse(raw) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'blockquote',
      'h1', 'h2', 'h3', 'h4'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class']
    // 白名单机制天然排除 script / iframe / on* 事件属性 / javascript: 协议
  })
}
```

配套措施：

+ 链接只允许 `http/https` 协议，统一加 `rel="noopener noreferrer"`（DOMPurify 可配 `ALLOWED_URI_REGEXP`）
+ CSP 做最后兜底（`script-src` 禁 inline），就算漏了也执行不了
+ 渲染频率用节流/rAF 控制，sanitize 只在拼接后的完整文本上做一次（安全与性能的交叉点）

> 口述：做 AI 对话时回复是 SSE 流式 Markdown，前端拼接后转 HTML 再 v-html 渲染，这条链路里 AI 输出必须按不可信数据对待，因为模型可能被诱导输出恶意 HTML。流式场景还有一个特有的坑：攻击载荷可能被分片切开，比如 `<img onerr` 和 `or=alert(1)` 分两片到达，单片看都不是攻击，所以 sanitize 不能只清洗增量，要在每次拼接后的完整文本上做；未闭合标签先按段落截断渲染，收到结束标记后整体再渲染一次。防线是 DOMPurify 白名单 + 链接协议限制 + CSP 兜底。另外 XSS 和 CSRF 是联动的：XSS 一旦成立可以读走页面里的 CSRF Token，所以防 XSS 也是防 CSRF 的前置。

## Session 和 JWT 有什么区别

+ Session：会话状态存在服务端（内存/Redis），浏览器只保存一个 sessionId（通常在 Cookie 里）；服务端删掉 Session 就能立刻踢人下线
+ JWT：用户信息 + 签名都在 token 里，服务端不存状态，天然适合分布式和跨服务；代价是**签发后无法主动作废**，只能靠短有效期 + refresh token 补救，或服务端维护黑名单

选型：需要强管控登录态（踢人、改权限即时生效）→ Session，或 JWT + 服务端状态；纯无状态、多服务共享登录态 → JWT 短有效期 + refresh token。

> 口述：Session 的状态在服务端，浏览器只存一个 sessionId，好处是服务端可以随时删 Session 踢人下线，改权限立即生效；JWT 把用户信息和签名都放进 token，服务端不用存状态，天然适合分布式部署和多服务共享登录态，代价是签发后无法主动作废，只能靠短有效期加 refresh token 控制风险，真要踢人就得维护黑名单。选型上看业务：需要强管控登录态就 Session 或 JWT 加服务端状态，追求无状态扩容就 JWT 短有效期。

## Token 放 localStorage 还是 Cookie

| | localStorage | 普通 Cookie | HttpOnly Cookie |
| --- | --- | --- | --- |
| XSS 能否窃取 | 能（JS 直接读） | 能 | **不能** |
| CSRF 风险 | 无（不会自动携带） | 有 | 有 |
| 跨域 / APP 场景 | 方便，放 Authorization 头即可 | 受 SameSite、CORS 限制 | 同左 |

结论是取舍，不是标准答案：

+ localStorage + Authorization 头：没有 CSRF 问题，但 XSS 一旦发生 token 必丢
+ HttpOnly Cookie + SameSite：XSS 偷不走 token，但要处理 CSRF（CSRF Token / SameSite），跨域部署配置也更麻烦
+ 更本质的一层：**XSS 真发生时 token 放哪都不安全**——攻击者能直接在页面里发请求，根本不需要偷 token。所以 HttpOnly 只是提高窃取门槛，第一道防线永远是防 XSS 注入；同时 token 有效期要短，配合双 token 控制损失范围

> 口述：token 存储本质是"防 XSS 还是防 CSRF"的取舍：localStorage 不自动携带所以没有 CSRF 问题，但 XSS 能直接读走；HttpOnly Cookie 反过来，XSS 偷不走但要面对 CSRF 和跨域配置。我会再补一层：XSS 真发生时 token 放哪都不安全，攻击者可以直接在页面里发请求，不需要偷 token，所以第一道防线永远是防注入，HttpOnly 只是提高门槛，token 有效期要短，配合双 token 控制损失范围。

## 双 token 无感刷新怎么实现

单 token 两难：有效期长，泄漏后风险大；有效期短，用户频繁重新登录。

方案：`access_token`（短，15 分钟~2 小时）+ `refresh_token`（长，7 天，放 HttpOnly Cookie，只用于刷新接口）。

+ 正常请求带 access_token；收到 401 → 静默用 refresh_token 换新 → 重放原请求 → 用户无感知
+ refresh_token 也失效 → 才真正跳登录

前端实现有两个必踩的坑：

+ **并发 401**：token 过期瞬间页面可能同时发出多个请求，全部 401。不能各刷各的——刷新接口被多次调用可能把 refresh_token 作废，导致被登出。做法：共享同一个刷新 Promise，其余 401 请求排队等结果再重放
+ **重放死循环**：重放的请求必须打标记，再收到 401 直接判失败，否则无限循环

```typescript
let refreshing: Promise<string> | null = null

axios.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error
  const isRefreshUrl = config.url?.includes('/refresh')
  // 刷新接口自身的 401、或已经重试过的请求：直接失败，防止死循环
  if (response?.status !== 401 || isRefreshUrl || config._retried) throw error

  // 并发 401 共享同一个刷新 Promise
  refreshing = refreshing ?? refreshToken().finally(() => (refreshing = null))
  try {
    const token = await refreshing
    config.headers.Authorization = `Bearer ${token}`
    config._retried = true
    return axios(config) // 用新 token 重放原请求
  } catch {
    useUserStore().logout()
    location.href = '/login'
    throw error
  }
})
```

> 口述：双 token 是 access_token 短有效期负责业务请求，refresh_token 长有效期放 HttpOnly Cookie 只打刷新接口，401 时静默换新再重放，用户无感。我在拦截器里踩过两个坑：一是 token 过期时多个请求并发 401，必须共享同一个刷新 Promise 排队重放，否则刷新接口被打多次会把 refresh_token 作废，用户直接被踢到登录页；二是重放请求要打标记，避免再 401 时死循环；刷新接口自身的 401 直接走登出。

## RBAC 是什么，前端怎么做权限控制

RBAC（Role-Based Access Control）：**用户 → 角色 → 权限**，用户通过角色获得权限，不直接绑权限。前端拿到的一般是角色名或**权限码集合**，如 `['admin', 'user:delete']`。

前端分三层落地：

1. **菜单权限**：根据权限码过滤侧边栏菜单渲染
2. **路由权限（动态路由）**，两种做法：
   - 后端返回路由表：登录后接口返回该用户可访问的路由 JSON，前端 `router.addRoute()` 动态注册
   - 前端全量路由表 + `meta.roles`：前端维护全部路由，守卫里按权限校验
3. **按钮权限**：自定义指令，无权限直接移除元素

```typescript
// 使用：v-permission="'user:delete'"
app.directive('permission', {
  mounted(el: HTMLElement, binding) {
    const perms = useUserStore().permissions
    if (!perms.includes(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  }
})
```

> 口述：RBAC 是用户-角色-权限三层，用户通过角色拿权限，前端拿到的是角色名或权限码。落地我分三层做：菜单按权限码过滤渲染，路由用动态注册——后端返回路由表前端 addRoute，或者前端全量路由表配 meta.roles 在守卫里校验，按钮用自定义指令，指令里查权限码集合，没有就 removeChild。

## 刷新页面后动态路由为什么会丢

动态路由是运行时 `addRoute` 注册的，存在内存里，刷新后全部消失，直接访问页面会 404。

标准做法：全局守卫里加"权限是否已加载"标志位，没加载就先拉用户信息 + 注册动态路由，再重新进入目标路由：

```typescript
router.beforeEach(async (to) => {
  const user = useUserStore()
  if (user.loaded) return true

  await user.fetchPermissions()      // 拉权限 + addRoute 动态注册
  return { ...to, replace: true }    // 关键：replace 重新进入，否则匹配到的还是 404
})
```

`replace: true` 的细节：重新进入时路由表刚注册好，必须 replace 一次才能匹配到新路由，否则地址栏历史里还会留一条错误记录。

> 口述：动态路由是运行时 addRoute 注册的，存在内存里，刷新就丢，直接访问会 404。做法是在全局守卫里判断权限是否已加载，没加载先拉用户信息和权限、注册动态路由，再用 `next({ ...to, replace: true })` 重新进入目标路由。replace 不能少：路由表刚注册好，必须重新进入一次才能匹配到新路由，不然历史记录里还会留一条错的。

## 前端权限控制能保证安全吗

不能。前端做的所有权限控制——隐藏菜单、remove 按钮、路由拦截——**全是体验层**，拦不住懂行的人：

+ 直接调接口（curl / Postman）、手动改路由、改 store 都能绕过
+ 所以**后端必须对每个接口鉴权**（校验 token + 权限码），这才是真正的安全兜底
+ 一句话：**前端权限控制展示，后端权限控制安全**。前端的价值是让普通用户看不到无权限的功能、少发无效请求、把 403 的反馈提前到点击之前

> 口述：前端权限控制保证不了安全，它做的所有事——隐藏菜单、移除按钮、路由拦截——都只是体验层，直接调接口、改路由就能绕过。真正的安全必须由后端对每个接口做鉴权，校验 token 和权限码。所以我的理解是前端权限控制展示、后端权限控制安全，两者是配合关系：前端让普通用户看不到无权限的功能、少发无效请求，把无权限的反馈提前到点击之前，后端做最终兜底。
