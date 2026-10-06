# 计算机网络
http版本推进可以概况为

> HTTP1.0 短连接，每次请求都需要重新建立TCP连接
>
> HTTP1.1 默认长连接，但是同一个连接内有队头阻塞的情况
>
> HTTP 2.0 二进制分帧+多路复用，**解决了HTTP层队头阻塞的问题，但是没有解决TCP层队头阻塞**
>
> HTTP3.0 **基于 QUIC/UDP 实现传输层多路复用，解决TCP队头阻塞**
>

## HTTP1.1
+ 默认开启**长连接**，`Connection: keep-alive`，同一个TCP连接可以复用多个请求
+ 支持管道化pipeline，也就是说可以不等第一个响应回来接着发后面的请求，但是规定**响应必须按照请求顺序返回，也就是队头阻塞问题**
+ 引入hosts请求头，一个IP就可以部署多个域名站点了
+ 添加了缓存能力，比如`cache-control`,`ETag`,`IF-None-Match`
+ 浏览器可能会开多个TCP连接，服务器压力变大，TLS握手成本增加

## HTTP2.0
目标就是提升HTTP1.1的传输效率

+ HTTP1.1是文本协议，HTTP拆解为了二进制，利于解析，多路复用
+ **多路复用：在一个TCP链接上可以同时发送多个请求和响应。将他们拆解为不同的**`**stream**`
+ header压缩
+ **TCP队头阻塞问题:**还是基于TCP连接的，TCP有一个特点，必须保证字节流有序，可靠交付，也就是说**TCP要求数据按照顺序交给上层应用**
    - 例如有4个`stream`，`Stream 1：HTML Stream 2：CSSStream 3：JS  Stream 4：图片`，TCP传输过程中，包1,3,4都到了，包2丢了，TCP也不会交给HTTP2.0使用，
    - 结果就是一个TCP包丢失，阻塞整个TCP连接上所有的HTTP2.0 的`stream` （**TCP队头阻塞**）

## HTTP3.0
+ 核心变化：**不再基于**`**TCP**`**，而是基于**`**QUIC**`**,**`**QUIC**`**是基于**`**UDP**`**实现的传输协议**

什么是QUIC

+ 基于UDP实现，具备可靠传输，加密，多路复用能力的传输协议（UDP本身是不可靠的），QUIC实现了丢包重传，拥塞控制，流量控制，TLS1.3加密等等
+ 避免了HTTP2.0的问题，一个包丢失阻塞所有请求

```latex
HTTP/3 Stream 1
HTTP/3 Stream 3
HTTP/3 Stream 5
        ↓
QUIC 多路复用
        ↓
UDP

Stream 1 丢包 → Stream 1 等重传
Stream 3 没丢包 → 可以继续交付
Stream 5 没丢包 → 可以继续交付

```

+ 更快的连接建立,HTTP2.0基于TCP+LTS,连接包括TCP 3次我是，LTS握手，http请求，而http3.0，通过QUIC，减少握手次数
+ TLS1.3加密

## 常见优化
http1.1优化

+ 合并 JS,CSS，雪碧图，减少请求次数，核心就是减少HTTP请求数量

http2.0优化

+ 合理拆包，按需加载，代码分割，tree shaking，使用CDN，缓存策略

> HTTP/1.0 主要是短连接，每次请求响应后都会关闭 TCP 连接，所以连接建立成本高。
>
> HTTP/1.1 默认支持长连接，可以复用 TCP 连接，并且引入了 Host、Cache-Control、ETag 等能力，但同一个连接中仍然存在队头阻塞，浏览器通常需要对同一域名开多个 TCP 连接来提高并发。
>
> HTTP/2 在 HTTP/1.1 的基础上做了较大优化，它采用二进制分帧、Header 压缩和多路复用。多路复用允许多个请求响应在同一个 TCP 连接中并发传输，解决了 HTTP/1.1 应用层的队头阻塞，也减少了多连接带来的开销。
>
> 但 HTTP/2 仍然基于 TCP，而 TCP 要保证字节流有序可靠。如果某个 TCP 包丢失，后面的数据即使已经到达，也必须等待丢失的包重传之后才能交给上层。因此 HTTP/2 只解决了 HTTP 层队头阻塞，没有解决 TCP 层队头阻塞。
>
> HTTP/3 使用 QUIC 替代 TCP，QUIC 基于 UDP 实现可靠传输、TLS 加密、拥塞控制和多路复用。它的 Stream 在传输层相对独立，一个 Stream 丢包不会阻塞其他 Stream，所以可以解决 HTTP/2 在 TCP 层的队头阻塞问题。同时 QUIC 还支持更快的连接建立和连接迁移，对移动端和弱网场景更友好。
>



# HTTP 请求报文由哪几部分构成
四部分：**请求行 + 请求头 + 空行 + 请求体**

```http
POST /api/user?id=1 HTTP/1.1        ← 请求行：方法 + 请求目标 + 协议版本
Host: api.example.com               ← 请求头开始
Content-Type: application/json
Content-Length: 27
Cookie: token=xxx
Authorization: Bearer eyJhbG...
Accept-Encoding: gzip, deflate, br
Origin: https://www.example.com
User-Agent: Mozilla/5.0 ...
                                    ← 空行(CRLF)，标志头部结束
{"name":"tom","age":18}             ← 请求体
```

## 请求行
+ 格式：`方法` `请求目标` `协议版本`，空格分隔，例：`GET /index.html HTTP/1.1`
+ 请求目标通常只是 `path?query`，**不含协议和域名**；协议+域名体现在 `Host` 头和连接层（只有直接请求代理时才会写绝对 URL）
+ 正因为域名放在 `Host` 头，一个 IP 才能部署多个站点（虚拟主机），Nginx 靠 `Host` 分流
+ 方法速查：`GET` 查、`POST` 增、`PUT` 全量改、`PATCH` 局部改、`DELETE` 删、`HEAD` 只要响应头、`OPTIONS` CORS 预检

## 请求头
按用途分类记，比背字典快

| 类别 | 常见头部 |
| --- | --- |
| 通用 | `Host`、`Connection`、`Date` |
| 内容协商 | `Accept`、`Accept-Encoding`、`Accept-Language`、`Content-Type`、`Content-Length`、`Content-Encoding` |
| 身份凭证 | `Cookie`、`Authorization`、`Origin`、`Referer`、`User-Agent` |
| 缓存 | `Cache-Control`、`If-None-Match`、`If-Modified-Since` |
| 跨域预检 | `Origin`、`Access-Control-Request-Method`、`Access-Control-Request-Headers` |
| 自定义 | `X-Request-Id`（链路追踪）、`X-Token` |

## 空行
+ 必须有一个 `CRLF` 空行，接收端靠它判断「头部结束，后面是 body」
+ GET 无 body，报文到空行就结束了

## 请求体
+ `GET` / `HEAD` 一般无 body，`POST` / `PUT` / `PATCH` 有
+ 三种主流 `Content-Type`：
    - `application/x-www-form-urlencoded` → `a=1&b=2`（普通表单）
    - `application/json` → JSON 字符串（前后端分离最常用）
    - `multipart/form-data` → 文件上传，带 `boundary` 分段
+ body 大小受服务端限制，超了返回 `413`（Nginx `client_max_body_size`）

## 响应报文（同理四部分）
**状态行 + 响应头 + 空行 + 响应体**

```http
HTTP/1.1 200 OK                     ← 状态行：协议版本 + 状态码 + 原因短语
Content-Type: application/json; charset=utf-8
Content-Length: 39
Content-Encoding: gzip
Set-Cookie: token=xxx; HttpOnly; Secure
Cache-Control: no-store
ETag: "abc123"

{"code":0,"data":{"name":"tom"}}
```

## 常见追问
+ **HTTP/1.1 与 HTTP/2 报文形式差别**：HTTP/1.1 是文本协议、头部逐行明文；HTTP/2 拆成二进制帧（`HEADERS` 帧 + `DATA` 帧），头部用 HPACK 压缩，语义（方法/路径/头/体）不变
+ **body 长度怎么确定**：`Content-Length` 固定长度；或 `Transfer-Encoding: chunked` 分块传输（流式响应、SSE、边生成边发，此时没有 `Content-Length`）
+ **哪些头前端控制不了**：`Cookie` 浏览器自动携带、`Host`/`Origin`/`Referer`/`User-Agent` 属于浏览器控制的「禁用头」，`fetch` 里手写无效
+ **怎么抓真实报文**：DevTools Network（Headers / Payload）、`curl -v`、Charles/Whistle（HTTPS 需装根证书）
+ **头部也有大小上限**：Cookie 塞太多可能 `431 Request Header Fields Too Large` 或 `400`

> HTTP 请求报文由四部分构成：请求行、请求头、一个空行、请求体。请求行包含请求方法、请求目标和协议版本，比如 `POST /api/user?id=1 HTTP/1.1`；请求目标一般只是路径加查询参数，协议和域名体现在 `Host` 头里，所以一个 IP 也能部署多个站点。请求头是一组 `key: value`，常见的有 `Host`、`Content-Type`、`Content-Length`、`Cookie`、`Authorization`、`Accept-Encoding`、`Cache-Control`、`Origin` 这些。空行用来告诉服务端头部结束了，后面才是请求体，GET 通常没有请求体，POST、PUT 才有，格式由 `Content-Type` 决定，比如 JSON、表单编码或者文件上传的 `multipart/form-data`。
>
> 响应报文结构类似，是状态行、响应头、空行、响应体，状态行包含协议版本、状态码和原因短语，响应头常见的有 `Content-Type`、`Content-Length`、`Set-Cookie`、`Cache-Control`、`ETag`、`Location` 等。
>
> 补充两点：HTTP/1.1 是文本协议，头部是明文逐行传输，HTTP/2 改成了二进制分帧，头部用 HPACK 压缩，但报文的语义结构没变；另外响应体长度可以用 `Content-Length` 表示，也可以用 `Transfer-Encoding: chunked` 分块传输，流式输出和 SSE 就是这种方式。
>



# HTTPS 深度：加密原理、握手、证书、加密范围
一句话：**HTTPS = HTTP over TLS，TLS 只负责把 HTTP 报文安全送到对端，业务逻辑和路由转发仍然在应用层。**

```latex
应用层    HTTP（请求行/头/体）
          ↓ 整个 HTTP 报文作为 payload 被加密
加密层    TLS（握手协商密钥 + 对称加密 + 完整性校验）
          ↓
传输层    TCP（443 端口，三次握手）
          ↓
网络层    IP（源/目的 IP，明文）
```

## 一、为什么非对称加密和对称加密要混用
两类加密的优缺点正好互补

| | 对称加密（AES、ChaCha20） | 非对称加密（RSA、ECDHE/ECC） |
| --- | --- | --- |
| 密钥 | 加解密同一把 | 公钥加密、私钥解密（一对） |
| 速度 | 快，硬件加速 | 慢几个数量级 |
| 数据量 | 可加密任意长度 | 单次能加密的长度受限（RSA-2048 约 245 字节） |
| 核心问题 | **密钥怎么安全传给对端**（明文传就被窃听了） | 慢，不适合传大数据 |

+ 所以 TLS 的做法是：**握手阶段用非对称加密解决"密钥分发"，协商出一把对称的会话密钥；握手完成后，所有应用数据用对称加密传输**
+ 非对称只用来交换/协商密钥 + 数字签名（证明身份、防篡改），不用来加密业务数据
+ 完整的安全目标其实是三件事，不能只说加密：
    - **机密性**：对称加密（AES-GCM）
    - **完整性**：MAC / AEAD 校验，防篡改（TLS1.2 起主流用 AEAD，把加密和校验合成一步）
    - **身份认证**：证书 + 数字签名，证明"对面真的是这个域名的服务器"
+ **前向安全（追问高频）**：现在主流用 `ECDHE` 临时密钥交换，每次会话的密钥都是临时算出来的、不落地。即使服务器私钥以后泄露，历史流量也解不开。用 RSA 直接加密 pre-master 的老方式没有前向安全，TLS1.3 已经把它移除

## 二、TLS 握手过程
TLS1.2（2-RTT，加上 TCP 三次握手，首字节前要跑 3 个 RTT）

```latex
Client                                              Server
CLOSED                                              LISTEN
  |---- ClientHello --------------------------------->|   支持的 TLS 版本、密码套件列表、随机数1
  |<--- ServerHello ----------------------------------|   选定版本和密码套件、随机数2
  |<--- Certificate ----------------------------------|   服务器证书（含公钥）
  |<--- ServerKeyExchange ----------------------------|   ECDHE 参数 + 用私钥对其签名
  |<--- ServerHelloDone ------------------------------|
  |  验证证书链 → 生成自己的 ECDHE 参数                 |
  |---- ClientKeyExchange --------------------------->|   客户端 ECDHE 参数
  |---- ChangeCipherSpec + Finished(已加密) ---------->|
  |<--- ChangeCipherSpec + Finished(已加密) ----------|
  |================= 应用数据（对称加密） ==============|
```

+ 双方用 `随机数1 + 随机数2 + 预主密钥(pre-master)` 各自算出相同的 **master secret → 会话密钥**
+ ECDHE 模式下 pre-master 由 DH 算法本地算出，**不在网络上传输**，所以即使抓包也拿不到
+ `ChangeCipherSpec` 表示"接下来我要用协商好的密钥加密了"，`Finished` 是第一条加密报文，用来校验握手过程没被篡改

TLS1.3（1-RTT，可 0-RTT）

+ `ClientHello` 直接带上 `key_share`（DH 参数）和精简后的密码套件，服务端一次响应就能算出密钥 → **握手从 2-RTT 降到 1-RTT**
+ 会话复用（PSK）支持 **0-RTT**：第一个包就带应用数据，但有**重放风险**，只适合幂等 GET，不能用于下单、扣款
+ 只保留 AEAD 加密套件，废弃 RSA 密钥交换、CBC、RC4、SHA-1

前端性能视角（追问常问）

+ 首次访问 HTTPS 站点：DNS + TCP 握手 + TLS 握手 = 3 个 RTT 才开始发请求 → 这就是 HTTP/3 用 QUIC 把 TCP 和 TLS 握手合并成 1-RTT / 0-RTT 的动机
+ 优化手段：TLS 会话复用（Session Ticket）、长连接复用（keep-alive）、HTTP/2 多路复用、OCSP Stapling、CDN 边缘节点就近握手

## 三、证书验证（防中间人）
**只有公钥不够**：攻击者可以把公钥换成自己的，两边各自"加密"，中间明文转发 —— 这就是中间人攻击（MITM）。证书解决的是**"这个公钥确实属于这个域名"**

证书里有什么

```latex
Subject       证书持有者（域名，现代证书看 SAN 扩展里的域名列表）
Issuer        签发它的 CA
有效期        Not Before / Not After
公钥          持有者的公钥 + 算法
签名算法      如 sha256WithRSAEncryption
签名值        CA 用自己的私钥对以上内容的签名（核心）
```

浏览器验证四步

```latex
1. 验签名：用内置的 CA 公钥验证签名，逐级往上验证书链
           服务器证书 ← 中间 CA ← 根 CA（根证书自签名，预装在操作系统/浏览器里 = 信任锚点）
2. 验域名：请求的域名是否在证书的 CN / SAN 里（*.example.com 只匹配一级子域）
3. 验有效期：是否过期、是否还没生效（客户端时间不准也会失败）
4. 验吊销状态：CRL 列表 或 OCSP 在线查询（OCSP Stapling 由服务器代查，更快）
```

实际会踩的坑（前端能遇到的报错场景）

| 现象 | 原因 |
| --- | --- |
| `NET::ERR_CERT_AUTHORITY_INVALID` | 自签名证书、或证书链没配全（只装了站点证书，缺中间证书 → PC 正常但手机/小程序报错） |
| `NET::ERR_CERT_DATE_INVALID` | 证书过期，或**用户系统时间不对** |
| `NET::ERR_CERT_COMMON_NAME_INVALID` | 证书域名和访问域名不匹配（用了 IP 访问、子域没进 SAN） |
| Charles/Fiddler 能看到 HTTPS 明文 | 你手动信任了它的根证书，它在中间做了两段 TLS（浏览器↔代理↔服务器），本质是**经过你授权的中间人**；真攻击者做不到，因为用户不会信任他的根证书 |
| 全站被降级成 HTTP | SSL strip 攻击 → 用 `HSTS`（`Strict-Transport-Security`）强制浏览器只走 HTTPS |

## 四、报文是全加密还是部分加密
**结论：整个 HTTP 报文（请求行 + 请求头 + 请求体，响应同理）全部加密；加密之外的"元数据"是明文。**

```latex
明文（谁都能看到）                        加密（只有通信双方能看）
------------------------------------     ------------------------------------
IP 头：源 IP、目的 IP                      请求行：方法、path、query、协议版本
TCP 头：源端口、目的端口(443)               所有请求头：Cookie、Authorization、
TLS Record 头：类型、版本、长度               Content-Type、User-Agent ...
DNS 查询的域名（除非 DoH/DoT）              请求体
SNI：ClientHello 里的域名（明文）           响应行、响应头、响应体
报文的长度和时序（可做流量分析）
```

+ **SNI 是明文的**：因为服务器要在握手阶段知道客户端访问哪个域名，才能返回对应证书（一个 IP 挂多张证书就靠 SNI）→ 所以运营商/防火墙能识别你访问的域名，但看不到具体路径。`ECH`（Encrypted Client Hello）就是为了加密它
+ 所以准确说法是：**HTTPS 加密的是应用层报文，不加密网络层/传输层头部，域名在 DNS 和 SNI 阶段是明文暴露的**

## 五、URL 和请求方法加密吗
**都加密。** 请求行 `POST /api/user?id=1 HTTP/1.1` 整个属于 HTTP 报文，在 TLS 的加密 payload 里，中间设备看不到方法、path、query。

+ HTTP/2 里方法和路径变成 `:method`、`:path` 伪头部，同样在加密信道内，还经过 HPACK 压缩
+ 但 URL 仍然会通过这些渠道泄露，所以**敏感信息不要放 URL query，要放 body**：
    - 浏览器历史记录、书签
    - `Referer`：跳到第三方站点会带来源 URL（用 `Referrer-Policy: strict-origin-when-cross-origin` 控制；HTTPS → HTTP 默认不发完整 URL）
    - 服务端/网关访问日志、CDN 日志（内网明文段尤其要注意）
    - 企业代理日志（能记域名，记不到 path）
+ query 里的 token 还会被分享链接、截图带出去，属于典型安全隐患

## 六、路由转发在哪一层
先分层：**IP 路由（网络层）** 和 **业务路由（应用层）** 是两件事

```latex
网络层   路由器只看 IP 头做逐跳转发 → HTTPS 和 HTTP 在这一层没区别
传输层   TCP 只保证字节流可靠到达 → 也不看 URL
加密层   TLS 只负责解密出 HTTP 报文 → 不做业务转发
应用层   拿到解密后的 HTTP 报文，才按 method + path 匹配路由   ← 转发决策在这里
```

按设备/角色拆开说（面试追问通常想听这个）

| 角色 | 层级 | 能否看到 URL | 说明 |
| --- | --- | --- | --- |
| 四层负载均衡（LVS、云 SLB 的 TCP 监听） | 传输层 | ❌ | 只看 IP + 端口做转发，不解密 TLS，证书要装在**后端服务器**上 |
| 七层负载均衡 / 反向代理（Nginx、ALB、API 网关） | 应用层 | ✅ | 要做 **TLS 卸载(termination)** 解密后才能按 path/header/cookie 分流，证书装在 Nginx 上；Nginx 到后端内网常用 HTTP 明文，也可再加密一次 |
| 后端框架路由（Koa / NestJS / SpringMVC） | 应用层 | ✅ | 收到已解密的 HTTP 请求，按 method + path 匹配 handler |
| 前端 SPA 路由（history / hash） | 浏览器应用层 | ✅ | hash 不发给服务端；history 模式的路径会发给服务端，**必须配 fallback 到 index.html，否则刷新 404** |

+ 一句话总结：**TLS 不参与路由，"按 URL 转发"必然发生在解密之后的应用层；四层设备看不到 URL，所以按路径分流只能由能解密的七层设备（Nginx/网关）来做，这也是"证书装在哪一层"的决定因素**
+ 引申：Nginx 做完 TLS 卸载后，后端拿到的 `X-Forwarded-Proto` 才是 `https`，否则后端会误判协议导致重定向死循环

## 七、前端相关配置速查（能说出来加分）
+ HTTP 强跳 HTTPS：Nginx `return 301 https://$host$request_uri;`
+ `HSTS`：`Strict-Transport-Security: max-age=31536000; includeSubDomains`，防降级
+ Cookie 必须加 `Secure`（只在 HTTPS 下发送）+ `HttpOnly` + `SameSite`
+ 混合内容（HTTPS 页面里加载 HTTP 资源）会被浏览器拦截：图片/视频属可选拦截，`script`、`iframe`、XHR/fetch 直接阻止
+ 证书到期监控、TLS 版本收敛（关掉 TLS1.0/1.1，只留 1.2/1.3）

> HTTPS 就是在 HTTP 和 TCP 之间加了一层 TLS，端口从 80 变成 443。它要同时解决三件事：机密性、完整性和身份认证。
>
> 加密上是非对称和对称混用。对称加密快，但密钥没法安全地传给对端；非对称加密能解决密钥分发，但慢几个数量级，而且单次能加密的数据长度有限。所以 TLS 只在握手阶段用非对称加密来协商出一把对称的会话密钥，握手完成后所有应用数据都用对称加密传输，另外还配合数字签名和 AEAD 校验保证数据不被篡改。现在主流用 ECDHE 做临时密钥交换，具备前向安全性，即使服务器私钥以后泄露，历史流量也解不开。
>
> 握手过程以 TLS1.2 为例：客户端发 ClientHello，带上支持的版本、密码套件和随机数；服务端回 ServerHello 选定套件并给出随机数，接着下发证书和 ECDHE 参数，并用私钥对参数签名；客户端验证证书链后，把自己的 ECDHE 参数发过去；双方用两个随机数加预主密钥算出相同的会话密钥，然后各自发送 ChangeCipherSpec 和 Finished，握手结束开始传应用数据。TLS1.3 把 ClientHello 里直接带上 key_share，握手降到 1-RTT，还支持 0-RTT 会话复用，但 0-RTT 有重放风险，只适合幂等请求。加上 TCP 三次握手，HTTPS 首字节前要走 3 个 RTT，这也是 HTTP/3 用 QUIC 合并握手的动机。
>
> 证书是用来防中间人攻击的，因为光有公钥无法证明公钥属于谁。证书里包含域名、签发 CA、有效期、公钥，以及 CA 用自己私钥做的签名。浏览器验证时会用预装在系统里的根证书公钥逐级验证证书链，再检查域名是否在 SAN 里、是否过期、是否被吊销。常见的报错就是自签名、证书过期、域名不匹配、证书链没配全，还有用户系统时间不准。至于抓包工具能看到明文，是因为我们手动信任了它的根证书，它做了两段 TLS，属于被授权的中间人，真实攻击者拿不到用户信任。
>
> 加密范围上，HTTPS 是把整个 HTTP 报文都加密了，包括请求行、请求头、请求体，所以 URL 的路径、查询参数和请求方法都是加密的，中间设备看不到。不加密的是元数据：IP 和 TCP 头部、TLS record 头、DNS 查询，还有 ClientHello 里的 SNI 域名，所以域名是暴露的，但路径不是。这也是为什么敏感信息不能放 URL query，因为 query 会进浏览器历史、Referer 和服务端日志，应该放到请求体里。
>
> 最后路由转发是在应用层。IP 路由只看网络层的 IP 头，TCP 只看端口，TLS 只负责解密，真正的按 URL 转发必须发生在解密之后。所以四层负载均衡看不到 URL，只能按 IP 和端口转发，证书要装在后端；七层设备比如 Nginx 或网关会做 TLS 卸载，解密后才能按 path、header 分流，证书装在代理层，到内网后端常用 HTTP。后端框架再按 method 和 path 匹配路由。前端这边如果是 SPA 的 history 模式，路径会真实发给服务端，必须配 fallback 到 index.html，否则刷新就是 404。
>


# cookie
 `Cookie` 是浏览器提供的一种**客户端存储机制**，主要用于让服务端识别用户身份、维持登录状态、保存少量状态信息  

+ 本质：一小段存储在浏览器的文本数据
+ 大致流程参考

```latex
用户输入账号密码
  ↓
前端请求登录接口
  ↓
服务端校验成功
  ↓
服务端通过 Set-Cookie 写入登录态 Cookie
  ↓
浏览器保存 Cookie
  ↓
后续请求自动携带 Cookie
  ↓
服务端根据 Cookie 识别用户
```

>  **Cookie 是浏览器自动携带的，不需要前端每次手动放到请求头里**
>
> 跨域请求需要额外处理，例如axios： `withCredentials: true`
>

cookie属性包括如下

```latex
name
value
Expires 过期时间(依赖客户端本地时间)
Max-age 有效时长，优先级高于Expires
Domain 指定cookie可以被哪里域名访问，默认不设置就是当前域名有效
Path 那些路径有效 /admin 携带cookie
Secure 只能在HTTPS请求中携带
HTTPOnly cookie不能被JS读取，降低XSS窃取cookie的风险，但是不能完全防范
SameSite 限制cookie在跨站请求是否携带，防范CSRF SameSite=Strict(不携带)，SameSite=Lax 相对宽松
```

常见组合：`Set-Cookie: token=xxx; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200`

cookie生命周期

+ 会话cookie，浏览器会话结束cookie失效
+ 持久cookie，即使关闭浏览器，只要没过期，还能用

cookie限制

+ 不适合存大量数据，只有4kb左右大小，每次请求都会携带，放了大量数据可能增加请求体积

> Cookie 是浏览器存储在客户端的一小段文本数据，通常用于维护登录态和用户身份识别。服务端可以通过 `Set-Cookie` 响应头写入 Cookie，之后浏览器在符合 Domain、Path、SameSite、Secure 等规则的请求中会自动携带 Cookie。
>
> Cookie 的基本结构是 `name=value`，除此之外常见属性有 `Expires`、`Max-Age`、`Domain`、`Path`、`Secure`、`HttpOnly` 和 `SameSite`。`Expires` 和 `Max-Age` 用来控制过期时间，其中 `Max-Age` 优先级更高；`Domain` 和 `Path` 控制作用域；`Secure` 表示只在 HTTPS 下携带；`HttpOnly` 表示不能被 JS 读取，可以降低 XSS 窃取 Cookie 的风险；`SameSite` 用来限制跨站请求是否携带 Cookie，主要用于防 CSRF，常见值有 `Strict`、`Lax`、`None`，其中 `SameSite=None` 必须配合 `Secure`。
>
> 从安全角度看，Cookie 和 XSS、CSRF 都有关。XSS 可能通过 `document.cookie` 窃取未设置 `HttpOnly` 的 Cookie，所以登录态 Cookie 建议设置 `HttpOnly` 和 `Secure`；CSRF 利用的是浏览器会自动携带 Cookie，所以可以通过 `SameSite`、CSRF Token、Origin/Referer 校验等方式防护。
>
> 在前端跨域请求中，如果需要携带 Cookie，前端要设置 `credentials: 'include'` 或 axios 的 `withCredentials: true`，后端也要设置 `Access-Control-Allow-Credentials: true`，并且 `Access-Control-Allow-Origin` 不能是 `*`。
>

# websocket
在单个TCP连接中进行**全双工（双向）**的通信协议，与传统的`https`，`http`相比，`websocket`支持**服务器主动向客户端推送数据，无需客户端发送请求**



## websocket，https，http对比
| 特性 | HTTP (超文本传输协议) | HTTPS (安全超文本传输协议) | WebSocket |
| :---: | :---: | :---: | :---: |
| **通信方式** | 半双工，请求-响应模式。客户端发起请求，服务器响应。 | 半双工，请求-响应模式。客户端发起请求，服务器响应。 | 全双工，连接建立后，客户端和服务器可同时双向发送数据。 |
| **底层协议** | 基于 TCP 协议。 | 基于 TCP 协议，并在 HTTP 和 TCP 之间增加了 **SSL/TLS 加密层**。 | 基于 TCP 协议，通过一次 HTTP 握手升级协议。 |
| **安全性** | **不安全**。数据以明文形式传输，容易被窃听或篡改。 | **安全**。通过 SSL/TLS 加密层对数据进行加密，保证了数据传输的机密性和完整性。 | **安全**。WebSocket 本身没有加密，但通常使用 **WSS** (WebSocket Secure) 协议，即在 SSL/TLS 层之上运行，确保数据安全。 |
| **连接状态** | **短连接**。每次请求/响应周期结束后，连接通常会自动断开（除非使用 Keep-Alive）。 | **短连接**。每次请求/响应周期结束后，连接通常会自动断开（除非使用 Keep-Alive）。 | **长连接**。连接一旦建立，除非主动断开，否则会一直保持。 |
| **数据开销** | 每次请求/响应都需携带完整的头部信息，数据开销较大。 | 每次请求/响应除了完整的 HTTP 头部，还包括 SSL/TLS 加密/解密带来的额外开销。 | 握手阶段开销较大，但连接建立后，后续数据传输只需极小的协议头。 |
| **服务器负载** | 每次请求处理完毕即可释放资源，对服务器资源占用相对较小。 | 与 HTTP 类似，但 SSL/TLS 的加密/解密会增加服务器的计算负担。 | 需保持连接状态，对服务器资源（如内存）有一定占用。 |
| **应用场景** | 静态网页、RESTful API 调用、文件下载。但现在基本被 HTTPS 取代。 | 绝大多数现代网站、API 调用、涉及敏感信息的交互（如登录、支付）。 | 实时聊天、多人协作应用、在线游戏、股票实时行情、即时通知。 |




# UDP和TCP的区别，使用场景
TCP

+ `面向连接` `可靠传输` `保证顺序` `有拥塞控制 ``有流量控制`
    - 可靠传输通过如下机制可以实现`序列号``确认应答 ACK``超时重传``校验和``滑动窗口`
    - 保证顺序，例如发送A → B → C,即使C先到了，还是会等待B重传回来（也就是`队头阻塞`）
+ 建立连接和释放连接需要三次握手四次挥手
+  TCP 像打电话 双方先接通，确认对方在线，然后再开始说话  

UDP

+ `无连接``不保证可靠``不保证顺序``开销小``延迟低``保留消息边界`
+  UDP 像寄明信片。直接发出去，不保证一定到，也不保证按顺序到  

| 特性 | UDP (User Datagram Protocol) | TCP (Transmission Control Protocol) |
| :---: | :---: | :---: |
| **连接状态** | **无连接**。发送数据前无需建立连接。 | **面向连接**。发送数据前必须通过三次握手建立连接。 |
| **可靠性** | **不可靠**。不保证数据包的顺序、完整性和送达性。 | **可靠**。通过序列号、确认应答、重传机制等确保数据包的顺序、完整和正确送达。 |
| **传输速度** | **快**。由于没有复杂的控制机制，传输速度快，实时性高。 | **慢**。由于需要进行连接管理、拥塞控制和流量控制等，传输速度相对较慢。 |
| **数据包大小** | 有**数据报**边界。接收端能明确区分数据包的边界，一次发送一个数据报。 | **无数据报**边界。数据被视为一个字节流，没有明显的界限，接收端需要自己处理粘包问题。 |
| **头部开销** | 头部开销小，只有 8 个字节。 | 头部开销大，至少 20 个字节，且选项字段可以增加。 |
| **拥塞控制** | **无拥塞控制**。发送方可以不受限制地发送数据，容易造成网络拥塞。 | **有拥塞控制**。根据网络状况调整发送速率，避免网络拥塞。 |


## 使用场景
udp

+  因为其快和无连接的特性，主要用于那些对实时性要求高，但可以容忍少量数据丢失的场景  
    - 视频直播or音频通话
    - 在线游戏
    - DNS域名系统
    - 物联网
    - WebRTC

TCP

+ 主要用于对那些数据完整性要求较高，不允许数据丢失的情况
    - HTTP1.1/HTTP2.0
    - 网页浏览
    - 文件传输
    - 电子邮件
    - 即时通讯

| 前端场景 | 常见协议 | 底层 |
| --- | --- | --- |
| 普通接口请求 | HTTP/HTTPS | TCP |
| HTTP/2 请求 | HTTP/2 | TCP |
| HTTP/3 请求 | HTTP/3 | QUIC over UDP |
| WebSocket | WebSocket | TCP |
| WebRTC 音视频 | RTP/SRTP、ICE 等 | 多数基于 UDP |
| DNS 查询 | DNS | 常见 UDP，也可 TCP |
| 文件上传 | HTTP/HTTPS | TCP |


> TCP 和 UDP 都是传输层协议。TCP 是面向连接的可靠传输协议，发送数据前需要建立连接，它通过 ACK、序列号、重传、流量控制和拥塞控制保证数据可靠、有序到达，所以适合 HTTP 接口、文件传输、登录、支付、数据库连接等对准确性要求高的场景。
>
> UDP 是无连接的数据报协议，发送前不需要建立连接，不保证可靠到达，也不保证顺序，但它开销小、延迟低，不会因为某个包丢失阻塞后续数据，所以适合语音通话、视频会议、直播、实时游戏、DNS、WebRTC、QUIC/HTTP3 等实时性要求高、能容忍少量丢包的场景。
>
> 如果是面试通话场景，我会优先选择 UDP，准确说是用 WebRTC 这类基于 UDP 的实时音视频方案。因为通话更关注低延迟和实时性，少量音视频帧丢失可以接受，但如果用 TCP，一旦丢包就会因为可靠有序传输导致后续数据等待重传，容易出现卡顿和延迟累积。当然，通话中的信令、登录、房间创建这些控制类接口，仍然可以用 HTTP/WebSocket，也就是基于 TCP；真正的音视频媒体流更适合 UDP
>

# TCP 三次握手与四次挥手（细节 + 追问）
现有内容里只说了"需要三次握手四次挥手"，这里补齐**状态机、为什么是这个次数、异常场景**。

## 一、三次握手
目的：**双方都确认"我能发、我能收"，并同步各自的初始序列号 ISN**

```latex
客户端                                          服务端
CLOSED                                          LISTEN
  |-------- SYN, seq=x ----------------------->|   我要建连，我的初始序号是 x
  |                                             |   SYN_RCVD（半连接）
SYN_SENT                                        |
  |<------- SYN+ACK, seq=y, ack=x+1 -----------|   我的初始序号是 y，确认收到你的 x
  |-------- ACK, ack=y+1 --------------------->|   ESTABLISHED
ESTABLISHED                                     ESTABLISHED
```

+ 第一次：客户端证明"我能发"
+ 第二次：服务端证明"我能收也能发"
+ 第三次：客户端证明"我能收"，同时服务端确认客户端收到了自己的 SYN+ACK
+ SYN 报文**不携带应用数据**，但可以携带选项：`MSS`、窗口缩放 `Window Scale`、`SACK Permitted`

**为什么是三次，不是两次**（必考）

+ 两次的话服务端无法确认客户端的接收能力，也无法确认客户端真的收到了自己的 SYN+ACK
+ 更关键：网络里滞留的**历史失效 SYN** 到达服务端时，两次握手会直接建立连接并分配资源，而客户端根本不认这个连接 → 资源浪费 / 脏连接。三次握手下客户端会回 RST 拒绝
+ 本质上三次是"双方各自确认对方序列号"所需的最小次数（两个方向各需一次确认，其中服务端的 SYN 和 ACK 可以合并）

**为什么不是四次**：服务端的 `SYN` 和 `ACK` 可以合并成一个报文；而挥手时不能合并，所以是四次

**ISN 为什么随机、不从 0 开始**

+ 防止旧连接的延迟报文被新连接当成有效数据（相同四元组复用时序列号冲突）
+ 也增加了攻击者伪造序列号的难度；实现上由时钟 + `hash(源IP, 源端口, 目的IP, 目的端口)` 生成

## 二、握手相关的两个队列与攻击（区分度加分项）
```latex
SYN 到达     → 放入【半连接队列 SYN queue】，回 SYN+ACK，状态 SYN_RCVD
第三次 ACK 到 → 移入【全连接队列 accept queue】，等应用 accept()
应用 accept() → 返回已连接 socket
```

+ **SYN Flood**：攻击者发大量 SYN 不回 ACK，半连接队列被占满 → 正常用户握手失败。防御：`SYN Cookie`（不占队列，把状态编码进序列号）、缩短 SYN_RCVD 超时、增大队列、防火墙限流
+ **全连接队列溢出**：应用 accept 太慢（线程池满、GC、慢查询），队列满了默认**丢弃 ACK**，客户端表现为握手超时重传。排查：`ss -lnt` 看监听端口的 `Recv-Q`（当前队列长度）/ `Send-Q`（队列上限）；内核参数 `somaxconn`、应用 `backlog`
+ 前端能感知的现象：首屏 `Connect` 阶段耗时高、偶发 `net::ERR_CONNECTION_TIMED_OUT`

## 三、四次挥手
TCP 是全双工，**两个方向要分别关闭**

```latex
客户端（主动关闭）                                服务端
  |-------- FIN, seq=u ----------------------->|   我没数据要发了
FIN_WAIT_1                                      CLOSE_WAIT   ← 应用层还没 close()
  |<------- ACK, ack=u+1 ----------------------|   我知道你要关了（但我可能还有数据要发）
FIN_WAIT_2                                      |            ← 半关闭：客户端只收不发
  |<------- FIN, seq=w ------------------------|   LAST_ACK   ← 我也发完了
  |-------- ACK, ack=w+1 --------------------->|   CLOSED
TIME_WAIT（等 2MSL）                             |
CLOSED                                          CLOSED
```

**为什么是四次**：服务端收到 FIN 后先回 `ACK`（表示"收到你的关闭请求"），但它可能还有数据没发完，等发完才发 `FIN`。`ACK` 和 `FIN` 不能合并 → 比握手多一次

**TIME_WAIT 为什么等 2MSL**（MSL = 报文最大生存时间，Linux 取 30s，所以 TIME_WAIT ≈ 60s）

1. **保证最后一个 ACK 能到达**：如果 ACK 丢了，对端会重发 FIN，此时自己还在 TIME_WAIT 就能重传 ACK；若已经 CLOSED，对端收到 RST，变成异常关闭
2. **让本连接的残留报文在网络中消散**，避免它们串进相同四元组的新连接里

**两类线上问题的定位方向**（高频追问）

| 现象 | 出现在哪一方 | 原因 | 处理 |
| --- | --- | --- | --- |
| 大量 `TIME_WAIT` | **主动关闭方**（Nginx 对后端短连接、爬虫、压测客户端） | 正常协议行为，但会占用本地端口、增加建连开销 | 开 keep-alive 复用连接（最有效）、客户端侧 `tcp_tw_reuse`（需时间戳）、扩大端口范围；**别用 `tcp_tw_recycle`**，NAT 环境会丢包，Linux 4.12 已移除 |
| 大量 `CLOSE_WAIT` | **被动关闭方** | 对端已经 FIN，但**自己的应用没调 close()** → 基本是代码 bug：连接没释放、异常分支漏关、连接池没归还 | 排查代码，加超时和兜底关闭；CLOSE_WAIT 堆积会耗尽文件描述符 |

+ 记忆口诀：**TIME_WAIT 是协议设计（主动关闭方，正常但要控制数量）；CLOSE_WAIT 是代码问题（被动关闭方，说明你没关）**

## 四、其他常见追问
+ **挥手能不能三次**：如果服务端收到 FIN 时已经没有数据要发，`ACK` 和 `FIN` 可以合并成三次（部分实现会延迟确认合并）；标准流程是四次
+ **FIN_WAIT_2 卡住**：对端应用迟迟不发 FIN，靠 `tcp_fin_timeout` 兜底回收
+ **半关闭（half-close）**：一方 `shutdown(SHUT_WR)` 后仍可接收数据，HTTP "响应发完再关连接" 用的就是这个语义
+ **RST 是什么**：异常关闭，不走挥手，直接丢弃缓冲区数据。常见于端口无监听、防火墙拦截、`SO_LINGER=0`、连接被 `net::ERR_CONNECTION_RESET`
+ **粘包/拆包**：TCP 是字节流、没有消息边界 → 应用层自己定界。HTTP 用 `Content-Length` 或 `chunked`，WebSocket 用帧头长度，自定义协议常用「长度前缀」或「分隔符」
+ **握手能不能带数据**：标准 TCP 不行；`TCP Fast Open`、TLS1.3 的 0-RTT 可以在握手包里带数据，但都有重放风险
+ **和前端的关系**：浏览器不暴露 TCP，但握手 RTT 直接体现在 DevTools Network 的 Timing 面板（`Queueing / DNS / Connect / SSL / Waiting(TTFB) / Content Download`，其中 `SSL` 一栏就是 TLS 握手耗时）。优化手段是复用连接（keep-alive）、HTTP/2 多路复用、HTTP/3 QUIC 合并握手、CDN 就近建连

> TCP 三次握手的目的是让双方确认彼此的收发能力，并同步初始序列号。客户端先发 SYN 带上自己的初始序号 x，服务端回 SYN+ACK，带上自己的序号 y 并确认 x+1，客户端再回 ACK 确认 y+1，双方进入 ESTABLISHED。之所以不能是两次，一是服务端无法确认客户端的接收能力，二是网络中滞留的历史 SYN 到达时，两次握手会让服务端建立一个客户端并不认可的连接，白白消耗资源。之所以不是四次，是因为服务端的 SYN 和 ACK 可以合并成一个报文。
>
> 挥手是四次，因为 TCP 是全双工，两个方向要分别关闭。主动方发 FIN 后进入 FIN_WAIT_1，被动方先回 ACK 进入 CLOSE_WAIT，此时它可能还有数据要发，这就是半关闭状态；等数据发完再发 FIN 进入 LAST_ACK，主动方回 ACK 后进入 TIME_WAIT，等待 2MSL 才关闭。等 2MSL 有两个原因：一是保证最后一个 ACK 能到达对端，如果 ACK 丢失，对端重发 FIN 时自己还能重传 ACK，否则对端会收到 RST 造成异常关闭；二是让本连接的残留报文在网络中消散，避免影响相同四元组的新连接。
>
> 线上排查时我会区分 TIME_WAIT 和 CLOSE_WAIT：大量 TIME_WAIT 出现在主动关闭方，是正常协议行为，常见于 Nginx 到后端的短连接，最有效的优化是开启 keep-alive 复用连接，客户端侧可以配合 tcp_tw_reuse，但不能用 tcp_tw_recycle，它在 NAT 环境下会丢包，内核也已经移除；大量 CLOSE_WAIT 出现在被动关闭方，说明对端已经关闭而自己的应用没有调用 close，基本是代码问题，比如连接没释放或者异常分支漏关，堆积起来会耗尽文件描述符。
>
> 另外和前端相关的是，握手的 RTT 会直接影响首屏，DevTools 的 Timing 面板里 Connect 和 SSL 就是 TCP 建连和 TLS 握手的耗时，HTTPS 首次访问要 DNS 加 TCP 加 TLS 三个 RTT，所以优化方向是长连接复用、HTTP/2 多路复用、HTTP/3 用 QUIC 合并握手，以及用 CDN 就近建连。TCP 是字节流没有消息边界，所以应用层要自己处理粘包，HTTP 是靠 Content-Length 或 chunked 来定界的。
>


# HTTP 状态码全集（3xx / 4xx / 5xx）
五大类：**1xx 信息、2xx 成功、3xx 重定向、4xx 客户端错误、5xx 服务端错误**

```latex
2xx 成功      200 OK / 201 Created / 204 No Content / 206 Partial Content
3xx 重定向    301 / 302 / 303 / 304 / 307 / 308
4xx 客户端错  400 / 401 / 403 / 404 / 405 / 413 / 429
5xx 服务端错  500 / 502 / 503 / 504
```

## 2xx（顺带记住，追问会问）
+ `200 OK`：常规成功
+ `201 Created`：POST 新建资源成功
+ `204 No Content`：成功但无响应体（常见于 DELETE、埋点上报）
+ `206 Partial Content`：**断点续传 / 视频拖动**，配合请求头 `Range: bytes=0-1023`、响应头 `Content-Range`；服务端支持时先返回 `Accept-Ranges: bytes`

## 3xx 重定向
重定向的核心是响应头 `Location`，浏览器自动跳转

| 状态码 | 语义 | 是否缓存 | 方法是否被改成 GET |
| --- | --- | --- | --- |
| `301` Moved Permanently | 永久重定向 | 浏览器会长期缓存（强缓存，慎用） | 历史上会被改成 GET |
| `302` Found | 临时重定向 | 不缓存 | 规范说 SHOULD NOT，**实际浏览器普遍改成 GET** |
| `303` See Other | 让你用 GET 去看另一个资源 | 不缓存 | **强制 GET**（PRG 模式：POST 后跳到结果页，防刷新重复提交） |
| `307` Temporary Redirect | 临时重定向 | 不缓存 | **严格保持原方法**（POST 还是 POST） |
| `308` Permanent Redirect | 永久重定向 | 缓存 | **严格保持原方法** |

**301 和 302 的区别（原文保留）**

| 特性 | `301 Moved Permanently` | `302 Found` |
| :---: | :---: | :---: |
| **语义** | 永久重定向 | 临时重定向 |
| **浏览器行为** | 缓存新 URL，未来的请求直接访问新 URL | 不缓存新 URL，未来的请求仍然访问旧 URL |
| **搜索引擎影响** | 权重和排名会转移到新 URL | 不会转移权重和排名，保留旧 URL 的权重 |
| **适用场景** | 网站迁移、URL结构永久变更 | 临时维护、促销活动、临时页面跳转 |

+ `304 Not Modified`：**不是重定向，是协商缓存命中**。浏览器带 `If-None-Match` / `If-Modified-Since` 询问，资源没变就返回 304 且**响应体为空**，浏览器用本地缓存（可顺带更新 `Cache-Control`、`ETag`）
+ 重定向死循环 → 浏览器报 `ERR_TOO_MANY_REDIRECTS`（Chrome 上限约 20 次），常见原因：HTTP→HTTPS 跳转配错、`X-Forwarded-Proto` 丢失导致后端一直判定为 http
+ 前端注意：`fetch` / `axios` / XHR **默认自动跟随重定向**，拿到的 `status` 是最终结果；`fetch(url, { redirect: 'manual' })` 才能拿到不透明的重定向响应，XHR 无法拦截

## 4xx 客户端错误
| 状态码 | 含义 | 前端典型原因 / 处理方式 |
| --- | --- | --- |
| `400` Bad Request | 请求本身有问题 | 参数缺失、JSON 格式错、Content-Type 不对 → 表单校验、打印请求体排查 |
| `401` Unauthorized | **未认证**（不知道你是谁 / 凭证无效） | 没登录、token 过期或错误 → 跳登录页 或 双 token 无感刷新后重放请求 |
| `403` Forbidden | **已认证但无权限** | 角色权限不够、签名/IP 校验失败 → 提示"无权限"，**重试也没用** |
| `404` Not Found | 资源不存在 | 见下方排查清单 |
| `405` Method Not Allowed | 方法不被允许 | 用 GET 打了只支持 POST 的接口 |
| `408` Request Timeout | 客户端请求超时 | 上传太慢、弱网 |
| `413` Payload Too Large | 请求体过大 | 上传超限 → Nginx `client_max_body_size`、前端做分片/压缩 |
| `415` Unsupported Media Type | 媒体类型不支持 | 后端要 JSON 你发了表单 |
| `429` Too Many Requests | 触发限流 | 配合 `Retry-After` 做退避重试，前端加防抖/节流 |

+ **401 vs 403 一句话**：401 是"我不知道你是谁，请带上有效凭证"（可补救），403 是"我知道你是谁，但你不能干这事"（不可补救）
+ **前端 404 排查清单（很实用）**：
    - 静态资源：`publicPath` / Vite `base` 配错、hash 文件名和 HTML 不匹配、CDN 没同步、构建产物没上传全
    - 页面刷新 404：SPA history 模式没配服务端 fallback 到 `index.html`
    - 接口 404：网关/Nginx 路由前缀没配、`/api` 代理没生效（开发环境 Vite proxy）、后端服务未注册
    - Nginx：`root` 与 `alias` 用错

## 5xx 服务端错误
| 状态码 | 含义 | 区别要点 |
| --- | --- | --- |
| `500` Internal Server Error | 服务端代码异常兜底 | 后端未捕获异常、空指针、DB 报错 |
| `501` Not Implemented | 方法未实现 | 少见 |
| `502` Bad Gateway | **网关/代理从上游收到了无效响应，或根本连不上上游** | 后端进程挂了/重启中、后端返回非法响应、upstream 配错、连接被 RST |
| `503` Service Unavailable | **服务本身暂时不可用**（过载、限流、发布维护、无健康实例） | 可重试，常配 `Retry-After` |
| `504` Gateway Timeout | 网关在超时时间内没等到上游响应 | 后端慢查询、下游依赖卡住 |

+ **502 / 503 / 504 一句话区分**：502 是"后面那台给了我一个坏响应或没给我响应"，504 是"后面那台太慢，我等超时了"，503 是"我自己（或整个服务）现在不可用"
+ 前端统一处理：`axios` 响应拦截器按状态码分流 —— 401 走刷新 token / 跳登录，403 提示无权限，404 走兜底页，5xx 提示"服务异常"并上报监控（带 `X-Request-Id` 方便后端定位），限流 429 做退避重试
+ **`fetch` 的坑**：只有网络层失败才 reject，`4xx/5xx` 会正常 resolve，必须手动判断 `res.ok`；`axios` 默认非 2xx 进 catch，可用 `validateStatus` 改判定范围
+ 状态码 ≠ 业务码：HTTP 200 + `code: 500` 是常见后端风格，前端拦截器要同时判断 HTTP 状态和业务 `code`

## 速记表
```latex
200 成功            204 无内容           206 部分内容/断点续传
301 永久重定向      302 临时重定向        303 强制 GET         304 协商缓存命中
307 临时不改方法    308 永久不改方法
400 参数错          401 未登录/凭证失效   403 无权限            404 不存在
405 方法不允许      413 体积过大          429 限流
500 服务端异常      502 上游坏了          503 服务不可用        504 上游超时
```

> HTTP 状态码分五类，1xx 是信息，2xx 成功，3xx 重定向，4xx 客户端错误，5xx 服务端错误。
>
> 重定向里最常被问的是 301 和 302。301 是永久重定向，浏览器会缓存新地址，搜索引擎会把权重转移到新 URL，适合域名迁移；302 是临时重定向，不缓存，权重留在原地址，适合临时活动页。需要注意的是 302 在实际浏览器实现里会把 POST 改成 GET，如果要严格保持请求方法应该用 307，永久且不改方法用 308；303 则是明确要求用 GET 去访问另一个资源，常用于 POST 之后跳转结果页防止重复提交。304 虽然也在 3xx，但它不是重定向，而是协商缓存命中，浏览器带上 ETag 或 Last-Modified 去问，服务端发现资源没变就返回 304 且不带响应体，浏览器继续用本地缓存。
>
> 4xx 里 401 和 403 的区别是：401 表示未认证，也就是服务端不知道你是谁或者凭证失效了，这种是可以补救的，前端一般跳登录或者用双 token 做无感刷新再重放请求；403 表示已认证但没有权限，重试也没有意义，直接提示无权限。404 是资源不存在，前端排查通常看四块：静态资源的 publicPath 或 base 配错、SPA history 模式刷新没有配 fallback、接口网关路由前缀没配、Nginx 的 root 和 alias 用错。另外还有 400 参数错误、405 方法不允许、413 请求体过大，比如上传超过 Nginx 的 client_max_body_size、429 触发限流，可以配合 Retry-After 做退避重试。
>
> 5xx 里 500 是服务端内部异常；502 是网关或代理从上游拿到了无效响应，或者根本连不上上游，常见于后端进程挂了或者正在发布；504 是网关等上游超时，通常是后端慢查询或依赖卡住；503 是服务暂时不可用，比如过载、限流或者维护，这种是可以重试的。一句话区分就是 502 是后面给的响应不对，504 是后面太慢，503 是服务自己现在不可用。
>
> 实际项目里我会在 axios 响应拦截器里按状态码统一分流处理：401 走 token 刷新或跳登录，403 提示无权限，404 走兜底页，5xx 给友好提示并带上 requestId 上报监控。这里有个坑是 fetch 只有网络失败才 reject，4xx 和 5xx 都会正常 resolve，必须自己判断 res.ok；而 axios 默认非 2xx 就进 catch。另外很多后端会用 HTTP 200 加业务 code 的风格，所以拦截器要同时判断 HTTP 状态码和业务码。
>


# 介绍一下浏览器的缓存机制（强缓存和协商缓存）
缓存目的： 浏览器缓存是为了减少重复请求、提升页面加载速度、降低服务器压力。  

主要分为两类

**强缓存：不向服务器发请求，直接用本地缓存**  
**协商缓存：会向服务器发请求，由服务器判断缓存是否还能用**

例如：一个静态资源的缓存

```html
<script src="/app.js"></script>
<link rel="stylesheet" href="/style.css" />
```

浏览器请求如下:

```latex

请求资源
  ↓
判断强缓存是否命中
  ↓
命中：直接使用本地缓存，不发请求
  ↓
未命中：发请求给服务器，进入协商缓存
  ↓
服务器判断资源是否变化
  ↓
未变化：返回 304，浏览器使用本地缓存
  ↓
已变化：返回 200 + 新资源
```

## 强缓存
主要由这两个响应头控制

```http
Cache-Control
Expires
```

+ `Cache-Control` 是 HTTP/1.1 的缓存控制字段，也是现在最常用的方式  
    - `Cache-Control: max-age=31536000` `max-age 缓存时间`这个资源在 31536000 秒(1年)内都可以直接使用缓存
    - `no-cache` 不是不缓存，而是可以缓存，但是使用前必须向服务端确认，也就是走协商缓存
    - `no-store` 不缓存
    -  `Cache-Control: public` 表示资源可以被浏览器、CDN、代理服务器缓存  
+ `Expires` 是 HTTP/1.0 的缓存字段  
    - `Expires: Wed, 21 Oct 2026 07:28:00 GMT`表示资源在这个时间点之前都有效  
    - `Expires` 依赖客户端本地时间，如果用户电脑时间不准，缓存判断可能出问题  

## 协商缓存
向服务器发送请求 资源没变返回 `304 not modified`，变了 `200 ok`

协商缓存主要有两组字段

```http
Last-Modified / If-Modified-Since
ETag / If-None-Match
```

`Last-Modified / If-Modified-Since`

+ 第一次请求：服务器返回资源时候带上资源最后修改的时间
    - `Last-Modified: Wed, 21 Oct 2026 07:28:00 GMT`
+ 第二次请求（强缓存失效，浏览器再次请求资源，会带上上面的时间）
    - `If-Modified-Since: Wed, 21 Oct 2026 07:28:00 GMT`
+ 紧接着服务器比较 `Last-Modified `是否等于` If-Modified-Since`，相同即资源不变 304，否则200返回新的
+ 问题：`Last-Modified`通常只能精确到秒，如果资源在 1 秒内多次修改，可能判断不出来



` ETag / If-None-Match`

`ETag` 是服务器根据资源内容生成的唯一标识（资源的指纹）

+ 第一次请求服务器返回：`ETag: "abc123"`，浏览器缓存这个值
+ 第二次请求（强缓存失效）浏览器请求就会带上`If-None-Match: "abc123"`，
+ 对比`ETag`，相同即资源不变 304，否则200返回新的
+ 对比与`Last-modified` `etag`更加准确，依赖的是资源内容或版本标识
+ 优先级`ETag` 更高

| 对比项 | 强缓存 | 协商缓存 |
| --- | --- | --- |
| 是否发送请求 | 不发送请求 | 会发送请求 |
| 状态码 | 通常不产生 HTTP 状态码 | 304 或 200 |
| 主要字段 | Cache-Control / Expires | ETag / Last-Modified |
| 速度 | 更快 | 比强缓存慢一点 |
| 是否需要服务器判断 | 不需要 | 需要 |
| 适合资源 | 长期不变的静态资源 | 可能变化但可复用的资源 |


> 浏览器缓存主要分为强缓存和协商缓存。浏览器请求资源时，会先判断强缓存是否命中。
>
> 强缓存通过 `Cache-Control` 和 `Expires` 控制，如果命中，浏览器不会发送请求，直接从 memory cache 或 disk cache 读取资源。
>
> 如果强缓存失效，就会进入协商缓存。协商缓存会向服务器发送请求，通过 `Last-Modified / If-Modified-Since` 或 `ETag / If-None-Match` 判断资源是否发生变化。如果资源没有变化，服务器返回 `304 Not Modified`，浏览器继续使用本地缓存；如果资源变化了，服务器返回 `200` 和新的资源。
>
> 在前端项目中，一般会对带 hash 的 JS、CSS、图片等静态资源设置长期强缓存，比如 `Cache-Control: max-age=31536000`；而 `index.html` 通常设置 `no-cache`，让它走协商缓存，避免用户一直访问旧入口文件。接口数据则根据业务决定是否缓存，敏感或实时数据一般使用 `no-store`。
>

# CDN是什么，CDN加速的原理是什么
`**CDN**`**（ Content Delivery Network  ） 内容分发网络  **

>  把静态资源提前分发到离用户更近的边缘节点上，让用户访问资源时不用每次都回源到业务服务器，从而提升访问速度、降低源站压力  
>

有CDN的访问流程（将静态资源缓存到多个边缘节点上），流程如下

```latex
用户浏览器
  ↓
DNS / 调度系统
  ↓
分配到离用户更近的 CDN 边缘节点
  ↓
如果边缘节点有缓存，直接返回资源
  ↓
如果没有缓存，再回源站获取资源并缓存
```

CDN加速的核心原理：

+ 就近访问
+ 缓存复用
+ 减少源站压力

CDN加速访问流程如下，也就是上面的补充版本

```latex
1. 浏览器请求 banner.png
2. DNS 把 cdn.example.com 解析到合适的 CDN 节点
3. 浏览器向 CDN 节点发起 HTTP 请求
4. CDN 节点检查本地是否有 banner.png 缓存
5. 如果有缓存且没过期，直接返回给浏览器
6. 如果没有缓存或缓存过期，CDN 节点向源站请求资源
7. 源站返回 banner.png
8. CDN 节点缓存 banner.png
9. CDN 节点再返回给浏览器
```

> CDN 是内容分发网络，主要用于加速静态资源访问。它会把 JS、CSS、图片、字体、视频等资源缓存到离用户更近的边缘节点上。当用户请求资源时，会通过 DNS 调度或负载均衡分配到合适的 CDN 节点。如果节点缓存命中，就直接从边缘节点返回资源，不需要请求源站；如果缓存未命中，CDN 节点会回源获取资源，并缓存到节点上，再返回给用户。
>
> CDN 加速的核心原理是就近访问和缓存复用。就近访问可以减少网络传输距离和延迟，缓存复用可以减少重复回源，从而降低源站压力，提高访问速度和并发能力。
>
> 在前端项目中，一般会把打包后的 JS、CSS、图片等静态资源上传到 CDN，并通过 `publicPath` 或 Vite 的 `base` 配置资源访问前缀。同时配合文件名 hash 和强缓存，比如 `Cache-Control: max-age=31536000`，这样资源内容不变时可以长期缓存，内容变化时通过文件名变化让浏览器和 CDN 获取新资源。
>

