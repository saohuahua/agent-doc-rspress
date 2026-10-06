---
title: JavaScript 浏览器与工程
---

# JavaScript 浏览器与工程

> 浏览器环境与工程实践：DOM/BOM、事件模型、防抖节流、Ajax、Cookie 与存储、JWT、requestAnimationFrame、页面渲染流程、请求竞态。
>
> 姊妹篇：[JavaScript 语言基础](./js-basics) · [JavaScript 核心机制](./js-core)

## DOM 常见操作

### 查找/选择`query/select`
+  `document.getElementById(id)` 等
+  `document.querySelector(selector)` 等

### 修改元素 `modify`
+ `element.innerHTML`

```javascript
  myDiv.innerHTML = '<h2>Hello, DOM!</h2><p>This is new content.</p>';
```

+ `element.textContent`

```javascript
  myDiv.textContent = 'this is plain textcontent';
```

+ `element.getAttribute(name)` 获取指定属性

```javascript
const imgSrc = myImage.getAttribute('src');
```

+ `element.setAttribute(name, value)`: 设置指定属性的值，如果属性不存在，则创建它

```javascript
myImage.setAttribute('src', './1.jpg');
```

+ `element.removeAttribute(name)`  移除指定属性

```javascript
myImage.removeAttribute('alt');
```

### 修改元素样式 `style`
+ `element.style.propertyName`,驼峰命名

```javascript
myDiv.style.backgroundColor = 'blue';
myDiv.style.fontSize = '16px';
```

+ `element.classList.add(className)`
+  `element.classList.remove(className)`  

### 创建、添加、删除元素` creat add remove`
+ `document.createElement(tagName)`

```javascript
const newP = document.createElement('p');
newP.textContent = 'newP';
```

+ `document.createTextNode(text)`创建文本节点
+ `element.appendChild(childElement)` 
+ `element.removeChild(childElement)`

## BOM 与常见对象

BOM(`browser object model`)浏览器对象模型，提供独立于内容与浏览器窗口进行交互的对象

+ 常见的交互包括，页面前进后退，刷新，浏览器窗口变化，滚动条滚动，定时器，数据存储`localstorage`，`sessionStorage`

### 常见的BOM对象
**核心是**`**window**`**对象**，也是JavaScript全局对象，是所有BOM的顶层对象。

+ 常见属性方法包括
    - `alert(),confirm()`
    - `setTimeout()`, `setInterval()`
    - `open()`, `close()`
    - `scrollTo()`, `scrollBy()`

`navigator`对象

+ 提供浏览器本身信息
+ 常见属性
    - userAgent： 用户代理头的字符串，通常包含浏览器名称、版本、操作系统等信息  

 `screen`对象

+  提供了关于用户屏幕的信息  

`history` 对象  

+  允许 JavaScript 访问浏览器历史记录（当前窗口或标签页中访问过的 URL 列表）  

`location` 对象  

+  提供了当前窗口加载的URL信息 ， 并允许导航到新的URL  

### DOM和BOM关系
+ document对象（DOM入口）实际上是`window`上的一个属性

```javascript
console.log(window.document === document); // true
```

+ **BOM**：关注**浏览器窗口本身**以及与浏览器相关的一切（如历史记录、URL、屏幕信息、定时器等）。它是 JavaScript 与浏览器进行“对话”的桥梁
+ **DOM**：关注**网页文档的内容和结构**。它是 JavaScript 与 HTML/XML 页面内容进行“对话”的桥梁，允许你操作 HTML 元素、文本、属性等

## DOM 事件模型与事件委托

要介绍事件模型之前有必要先介绍`事件event`和`事件流event flow`

### 事件
+ 文档或浏览器窗口发生的特定交互或时刻。简单而言就是网页上发生的事情，这些事情可以是用户行为 or 浏览器自身行为。
+ 常见用户事件有`click`，`mouseover/mouseout`，`keydown/keyup`，`submit`，`change`，`scroll`
+ 浏览器事件： `DOMContentLoaded`， `load ` 

### 事件流
由于DOM树的结构，如果在父子节点绑定事件，触发子节点的时候，存在一个顺序问题。

事件流的阶段

+ 事件**捕获**阶段
    - 从文档的根节点（`window` 或 `document`）开始逐级向下传播，经过各个父元素直到事件目标`event.target`，这个阶段父节点会早于子节点接收到事件
+ **处于目标**阶段
+ 事件**冒泡**阶段
    - 事件从目标节点开始逐层向上回溯，经过各个父元素直到文档根节点

```html
<div id="container">
  <button id="clickMe">clickMe</button>
</div>
<script>
  const button =document.getElementById("clickMe")
  const container=document.getElementById("container")
  button.onclick=function(){
    console.log("1.Button");
  }
  container.onclick=function(){
    console.log("2.container");
  }
  document.body.onclick=function(){
    console.log("3.body");
  }
  document.onclick=function(){
    console.log("4.document");
  }
  window.onclick=function(){
    console.log("5.window");
  }
  // 点击button 冒泡顺序 1.Button 2.container 3.body 4.document 5.window

</script>
```

### 事件模型
**事件模型**定义如何将事件与处理事件的代码（事件处理程序）关联起来，以及事件如何在 DOM 树中传播  

主要分为如下几类：

+ 原始事件模型（`DOM0`级）
    -  通过 JavaScript 代码直接将函数赋值给元素的事件属性（如 `onclick`）  

```javascript
const btn = document.getElementById('myButton');
btn.onclick = function() {
  alert('Button clicked! (DOM 0)');
};
// 再次赋值会覆盖上一个
btn.onclick = function() {
  console.log('New handler (DOM 0)');
};
// 此时只有 'New handler (DOM 0)' 会被执行
```

+ DOM2事件处理
    -  `addEventListener()` 注册事件监听器
    - 优点：一个事件类型可以绑定多个处理程序

### 事件对象
事件触发，浏览器会自动传递一个事件对象（`event object`），包含该事件的所有的详细信息，例如

+ `event.type` 事件类型
+ `event.target` 实际触发事件的DOM元素
+ `event.preventDefault()` 阻止事件默认行为，例如表单提交or链接跳转
+ `event.stopPropagation() `阻止事件在DOM树进一步传播，阻止冒泡和捕获

### 事件委托 /事件代理
利用事件冒泡的特性，通过将事件监听器添加到父元素，而不是每个子元素中，可以高效管理子元素的事件

原理：父元素监听子元素触发的事件，当事件冒泡到父元素，通过`event.target`来判断是哪个子元素触发了事件，然后进行处理

**优点**：

+ **减少内存消耗**：只需一个监听器，而非为每个子元素都添加一个
+ **提高性能**：减少 `DOM`操作和事件绑定/解绑的开销
+ **处理动态添加的元素**：对于后续通过 `JavaScript` 添加到`DOM`中的元素，无需重新绑定事件

示例

```html
<ul id="myList">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
<script>
  const list=document.getElementById('myList')
  list.addEventListener('click',function(event){
    // 检查点击的实际目标是否是 li 元素
    if(event.target.tagName==='LI'){
      console.log('li标签点击');
      event.target.style.backgroundColor="red"
    }
  })
</script>
```

## 防抖与节流

为什么需要防抖节流？ 在浏览器中，有些事件会频繁的触发

+ `resize` 调整浏览器窗口
+ `scroll` 滚动
+ `mousemove` 鼠标移动
+ `input/keyup` 输入

不可能一直高频的调用回调函数来执行DOM操作，网络请求或计算等，需要**控制函数执行的频率**来优化用户体验

### 防抖debounce
核心思想：事件触发后，延迟一定时间执行回调函数，如果在延迟时间内事件再次被触发则**重新计时**。也即在事件在设定时间内**不再被触发时**，回调函数才会执行

用途

+ 搜索框输入：输入完后停止输入才会发送请求
+ 窗口`resize`：窗口停止大小调整才会重新计算布局
+ 表单验证：停止输入后才开始进行表单字段验证

具体实现

```javascript
// 防抖函数：
// func 需要处理的防抖函数
// delay 延迟时间
function debounce(func, delay) {
  let timer = null; // 定义定时器标识，用于保存计时器ID，被闭包记住
  return function (...args) { // ...args捕获所有传递给原始函数的参数

    // 保存当前函数执行的this上下文，方便后续不会丢失
    const context = this;

    // 每次触发事件的时候要清除上一次还未执行的定时器
    clearTimeout(timer);

    // 设置一个新的定时器：在 delay 毫秒后执行原始函数 func
    timer = setTimeout(() => {

      // 使用 apply/call 调用 func，保证 this 指向和参数不丢失
      func.apply(context, args);
    }, delay);
  };
}

// 示例
const debounceFn=debounce((str1)=>console.log(str1),500)
debounceFn('防抖触发1')
debounceFn('防抖触发2')
debounceFn('防抖触发3') //只会执行最后一次防抖
```

+ 注意
    - `const context = this;`保存`this`上下文的目的是为了确保延迟执行的`func()`函数被调用时，它的`this`仍指向最初触发事件的元素or对象，而不是`setTimeout`的默认`this`或全局对象`window`
    - 问题在`setTimeout`的回调函数通常会在**全局上下文中**执行，非严格模式this指向全局对象（ 在浏览器中是 `window`，在 Node.js 中是 `global` 或 `undefined` 在严格模式下 ）



### 节流throttle
核心思想：设定的时间间隔内，**只允许回调函数执行一次**。如果在时间间隔内多次触发，这些额外的触发会被忽略。

用途

+ 页面滚动加载（无限滚动）：每隔一定时间检查一次滚动位置，判断是否需要加载更多数据，而不是每次滚动都检查  
+ 鼠标移动：限制鼠标移动事件的处理器执行频率，比如拖拽操作  
+ 高频点击：防止用户在短时间内重复点击按钮，发送多次请求  

具体实现

```javascript
function throttle(fn, delay) {
  let lastTime = 0;
  return function (...args) {
    const context = this;
    const now = Date.now();
    if (now - lastTime >= delay) {
      //满足间隔要求才会执行
      fn.apply(context, args);
      lastTime = now;
    }
  };
}

const throttleFn = throttle(() => console.log("节流函数"), 1000);

//模拟快速触发
setInterval(throttleFn, 200); //节流会控制1000ms打印一次，而不是200ms
```

## Ajax 原理

AJAX是`async JavaScript and xml`(异步JavaScript和xml)

核心原理：`Ajax`的原理简单来说通过`XmlHttpRequest`对象来向服务器发异步请求，从服务器获得数据，然后用`JavaScript`来操作`DOM`而更新页面

### 实现步骤
1. 创建`XMLHttpRequest`(`XHR`)对象：浏览器提供用于与服务器异步通信的`API`
2. 配置请求：`open()`方法指定请求类型，`url`，是否异步
3. 设置回调函数，绑定`onreadystatechange`事件，监听服务器端的通信状态
4. 发送请求：`send()`方法发送到服务器
5. 服务器处理请求：服务器接收数据，处理后返回响应（`JSON`，`xml`格式）
6. 客户端接收并处理响应：检查响应状态码（`status`，例如200代表成功），检查`readyState`（4代表已经完成），获取响应数据（`responseText`），更新页面

### 具体实现
```javascript
function loadContentXHR(url,callback){

  // 1. 创建 XMLHttpRequest 对象
  const xhr=new XMLHttpRequest()

  //2.配置请求
  // method: HTTP 方法 (GET, POST, PUT, DELETE等)
  // url: 请求的资源地址
  // async: 是否异步执行 (true 为异步，推荐)
  xhr.open('GET',url,true)

  //3.可以设置回调函数处理响应 可以使用onreadystatechange 或者 onload,onerror
  xhr.onreadystatechange=function(){
    if (xhr.readyState === 4) {
      if(xhr.status >=200 &&xhr.status <300){
        callback(null,xhr.responseText)
      }else{
        callback(new Error(`HTTP error: ${xhr.status}`))
      }
    }
  }

  //4.发送请求
  xhr.send()
}

// 使用示例
const dataUrl='https://jsonplaceholder.typicode.com/todos/1'
loadContentXHR(dataUrl,function(error,data){
  if(error){
    console.log("XHR error",error);

  }else{
    console.log("xhr success",JSON.parse(data));

  }
})
```

类似的，可以使用fetch实现

```javascript
function loadContentFetch(url){
  return fetch(url).then(response=>{
    if(!response.ok){
      throw new Error(`HTTP error:${response.status}`)
    }
    return response.json()
  }).catch(error=>{
    console.log(error);
  })
}
```

## Cookie

Cookie 是浏览器提供的一种**客户端存储机制**，用于服务端识别用户身份，维持登录状态。

### 本质
+ 一小段存储在浏览器的文本数据

例如用户登录成功之后，服务端返回

`Set-Cookie: sessionId=xxx; HttpOnly; Secure; SameSite=Lax`

 后续用户请求接口浏览器会自动带上这个`Cookie: sessionId=xxx`，服务端就根据sessionID判断当前用户

### 工作流程
```text
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
后续请求自动携带 Cookie （浏览器自动携带的，不需要前端手动放在请求头里，跨域若需要需手动配置）
  ↓
服务端根据 Cookie 识别用户
```

跨域需要携带cookie,需要配置

```typescript
fetch('https://api.example.com/user', {
  credentials: 'include'
});
```

### 基本结构
最基础的 `name=value`,例如 `token=abc123`

其他属性：` Set-Cookie: token=abc123; Max-Age=7200; Domain=.example.com; Path=/; Secure; HttpOnly; SameSite=Lax`

+ `Expires` 设置过期时间（缺点依赖客户端本地时间，若不准影响判断）
+ `Max-age`有效时长
+ `Domain` 控制可以发送到那些域名 （不设置默认就当前域名有效）
+ `path ` 控制在哪些路径下生效，例如`path=/admin`,代表访问`/admin,/admin/user`会携带
+ `Secure` 只能在HTTPS 携带
+ `HttpOnly` 不能被前端js读取，作用就是为了降低XSS窃取cookie的风险
+  `SameSite` 限制跨站是否携带cookie，防CSRF，三个常见值
    - `strict`跨站完全不携带
    - `lax`相对宽松
    - `none` 允许携带

### 生命周期
+ 会话 Cookie：没有设置 `Expires` / `Max-Age`；设置了的就是持久 Cookie，在过期前一直有效

如何使用

+ 读取：`console.log(document.cookie);`，前提未设置`HttpOnly`

> Cookie 是浏览器存储在客户端的一小段文本数据，通常用于维护登录态和用户身份识别。服务端可以通过 `Set-Cookie` 响应头写入 Cookie，之后浏览器在符合 Domain、Path、SameSite、Secure 等规则的请求中会自动携带 Cookie。
>
> Cookie 的基本结构是 `name=value`，除此之外常见属性有 `Expires`、`Max-Age`、`Domain`、`Path`、`Secure`、`HttpOnly` 和 `SameSite`。`Expires` 和 `Max-Age` 用来控制过期时间，其中 `Max-Age` 优先级更高；`Domain` 和 `Path` 控制作用域；`Secure` 表示只在 HTTPS 下携带；`HttpOnly` 表示不能被 JS 读取，可以降低 XSS 窃取 Cookie 的风险；`SameSite` 用来限制跨站请求是否携带 Cookie，主要用于防 CSRF，常见值有 `Strict`、`Lax`、`None`，其中 `SameSite=None` 必须配合 `Secure`。
>
> 从安全角度看，Cookie 和 XSS、CSRF 都有关。XSS 可能通过 `document.cookie` 窃取未设置 `HttpOnly` 的 Cookie，所以登录态 Cookie 建议设置 `HttpOnly` 和 `Secure`；CSRF 利用的是浏览器会自动携带 Cookie，所以可以通过 `SameSite`、CSRF Token、Origin/Referer 校验等方式防护。
>
> 在前端跨域请求中，如果需要携带 Cookie，前端要设置 `credentials: 'include'` 或 axios 的 `withCredentials: true`，后端也要设置 `Access-Control-Allow-Credentials: true`，并且 `Access-Control-Allow-Origin` 不能是 `*`。
>

## localStorage / sessionStorage / Cookie

### LocalStorage
+ 持久化存储**键值对**数据，数据**没有过期时间**，除非手动清除，否则一直存在
+ 生命周期：持久化本地存储
+ 可访问性：只能在同源的界面（相同协议，域名，端口）访问
+ 常见方法/接口
    -  `localStorage.setItem(key, value)`  

```javascript
localStorage.setItem('username','zs');
```

    - ` localStorage.getItem(key) ` 
    - ` localStorage.removeItem(key)`  
    -  `localStorage.clear()`  
+ **注意：** 存储的 `value` 都会被自动转换为字符串。如果需要存储对象或数组，需要先使用 `JSON.stringify()` 序列化，读取后再用 `JSON.parse()` 反序列化  
+ 应用场景
    - 长期的用户偏好设置：主题，语言，字号大小
    - 购物车数据（未登录的时候购物车商品信息）

### sessionStorage
与LocalStorage类似，但是数据仅在当前会话(session)期间内有效

+ 生命周期：会话级别存储。数据在浏览器窗口的生命周期内有效，当窗口标签页关闭，`sessionStorage`中的数据会被清除
+ 可访问性：只能在同源的界面（相同协议，域名，端口）访问
+ 接口/API 参照`localStorage`
+ 应用场景
    - 表单数据临时保存**：** 用户填写多页表单时，可以在页面跳转间保持数据，防止意外丢失
    - 会话级别的数据**：** 例如一次性验证码、临时生成的会话 ID

### cookie
+ 存储容量：最小，4kb
+ 生命周期**：** 可以通过设置过期时间来控制。
    - **会话期 **`Cookie`**：** 不设置过期时间，浏览器关闭即失效
    - **持久性 **`Cookie`**：** 设置过期时间，在过期前一直有效
+ 应用场景
    - 存储用户的 Session ID，实现登录状态保持  

| 特性 | LocalStorage | SessionStorage | Cookie |  |
| :---: | :---: | :---: | :---: | :---: |
| 容量 | 较大 (5-10MB) | 较大 (5-10MB) | 最小 (~4KB) |  |
| 生命周期 | 永久，除非手动清除 | 会话结束（关闭标签页/浏览器）时清除 | 可设置过期时间，或会话结束时清除 |  |
| 作用域 | 同源，跨标签页/窗口共享 | 同源，但每个标签页/窗口独立隔离 | 同源（可设置 Domain 扩展到子域），跨标签页/窗口共享 |  |
| 与服务器交互 | 仅客户端 JS 访问，不自动发送到服务器 | 仅客户端 JS 访问，不自动发送到服务器 | 客户端 JS 可读写（有限），自动随 HTTP 请求发送到服务器 |  |
| 易用性 | 简单易用的 JS API | 简单易用的 JS API | JS 操作复杂，需手动解析；通常由服务器操作 |  |
| 安全性 | 相对安全（受同源策略限制），但仍可能被 XSS 攻击 | 相对安全（受同源策略限制），但仍可能被 XSS 攻击 | 相对较差，易被 XSS 攻击（可通过 HttpOnly 增强） |  |

## JWT 认证

+ JWT（JSON Web Token）通常用于以下场景
    - **认证**（authentication）：用户登录后，服务器生成JWT发送给客户端，客户端在后续请求中会携带这个JWT，服务器验证其有效性来确认用户的身份
    - **授权**（authorization）:JWT可以包含用户的权限信息，服务器通过解析JWT来判断用户是否有权限访问某个资源
    - **信息交换 ：** JWT 可以在不加密的情况下（但可以签名）安全地传输少量信息  

### JWT组成
+ JWT是一个字符串，每部分由`.`分割
    -  `header.payload.signature`  
    - Base64 Url 编码的JSON
1. `header`
+ 包含`type`（令牌类型），`alg`（签名算法algorithm）
2. `payload`
+ 包含了对令牌的声明，通常是用户和附加数据的信息

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true,
  "iat": 1516239022,
  "exp": 1516242622 // 签发时间加一小时
}
```

3. `signature`
+ 签名部分用于验证JWT的完整性，防止令牌被篡改，生成方式取决`header`中的算法

### JWT流程
+ **用户登录：** 用户输入凭据（用户名/密码）发送给认证服务器。
+ **生成 JWT：** 认证服务器验证凭据，如果合法，则生成一个 JWT（包含用户ID、角色等信息，并用密钥签名）。
+ **返回 JWT：** 服务器将生成的 JWT 返回给客户端。
+ **后续请求携带 JWT：** 客户端将 JWT 存储起来（例如` Local Storage`），并在后续所有需要认证的请求中，将其放在 HTTP 请求头的 `Authorization` 字段中（通常是 `Bearer <JWT>` 格式）。
+ **服务器验证 JWT：** 接收到请求的服务器从 `Authorization` 头中提取 JWT，并使用相同的密钥（或公钥）验证其签名、检查过期时间等。
+ **响应请求：** 如果验证通过，服务器处理请求并返回数据。如果验证失败（签名不匹配、过期等），服务器返回 401 Unauthorized 错误。

## requestAnimationFrame

核心结论

+ `requestAnimationFrame(rAF)` 浏览器提供的**在下一次页面重绘之前执行回调**的API

核心特点

```text
requestAnimationFrame
  -> 跟随浏览器刷新频率执行
  -> 通常一秒 60 次左右，也就是约 16.6ms 一次
  -> 在页面重绘前执行
  -> 页面不可见时会自动降频或暂停
  -> 比 setTimeout / setInterval 更适合做动画和高频 UI 更新
```

示例

```typescript
function update() {
  // 执行动画或 UI 更新逻辑
  console.log('next frame')

  requestAnimationFrame(update)
}

requestAnimationFrame(update)
```

和 `setTimeout`、`setInterval` 的区别

+ `setTimeout` / `setInterval` 基于时间调度
+ `requestAnimationFrame`由于回调会在下一次绘制执行，所以可以用于修改DOM样式，让他在同一帧完成渲染

```typescript
const box = document.querySelector('.box')
let x = 0

function animate() {
  x += 2
  box.style.transform = `translateX(${x}px)`

  if (x < 300) {
    requestAnimationFrame(animate)
  }
}

requestAnimationFrame(animate)
```

### 应用场景
1.典型

```text
元素移动
数字滚动
进度条
弹窗过渡
骨架屏动效
拖拽动画
```

2.高频事件流

+ 例如`scroll`，`resize`，`mousemove`触发频率高，如果频繁操作DOM容易造成卡顿，可以用`requestAnimationFrame`做一次节流，一帧就更新一次UI

3.虚拟列表/长列表滚动优化

+ 虚拟列表滚动事件不断触发，如果每次都重新计算可视化区域更新DOM，容易卡顿，使用`requestAnimationFrame`限制频率

```typescript
let ticking = false

container.addEventListener('scroll', () => {
  if (ticking) return

  ticking = true

  requestAnimationFrame(() => {
    //更新视图
    updateVisibleItems(container.scrollTop)
    ticking = false
  })
})
```

### AI对话场景的使用
传统流式输出前端不断接收chunk，页面不断追加新内容，但是如果没接收一个chunk就更新react/vue状态，渲染太频繁

+ 比如这种写法就不太好，如果服务端返回快的话，触发的更新一秒几十次，React / Vue 高频 `re-render`

```typescript
stream.onMessage((chunk) => {
  setMessage(prev => prev + chunk)
})
```

+ 解决办法：chunk放入缓冲区，同时一帧最多更新1次UI

```typescript
let buffer = ''
let scheduled = false

function onStreamChunk(chunk) {
  buffer += chunk

  if (!scheduled) {
    scheduled = true

    requestAnimationFrame(() => {
      setMessage(prev => prev + buffer)

      buffer = ''
      scheduled = false
    })
  }
}

```

> `requestAnimationFrame` 是浏览器提供的一个在下一次重绘前执行回调的 API，它会跟随浏览器的刷新节奏执行，通常比 `setTimeout/setInterval `更适合做动画和高频 UI 更新。它的典型场景包括动画、滚动监听节流、`resize`/`mousemove` 优化、DOM 读写合并、虚拟列表滚动更新等。前端里它的核心价值是把 UI 更新放到浏览器合适的渲染时机，减少不必要的 layout 和 paint。
>
> 在 AI 对话这种流式输出场景里，`requestAnimationFrame` 很适合用来合并高频 token 更新。服务端可能会持续返回 chunk，如果每收到一个 chunk 就 setState 或修改响应式数据，会导致 React/Vue 高频渲染、Markdown 高频解析、自动滚动频繁触发，从而造成卡顿。更好的做法是把 chunk 先放到 buffer 里，然后通过 `requestAnimationFrame` 每一帧统一更新一次 UI，同时把自动滚动也放到 rAF 里执行。这样可以保证打字机效果平滑，又能减少渲染次数和主线程压力。
>

## 从输入 URL 到页面渲染

URL->完整页面大致步骤可以分为2个阶段

+ 导航阶段：输入URL -> 浏览器拿到具体的HTML
+ 渲染阶段： 浏览器解析HTML,CSS,JS -> 生成具体页面并绘制到屏幕

具体细分有如下步骤

```text
URL 解析
缓存判断
DNS 解析
建立连接
发送 HTTP 请求
服务器响应 HTML 
浏览器进程提交导航
渲染进程解析 HTML
构建 DOM/CSSOM 树
执行JS
生成渲染树
布局 Layout
绘制(重绘) Paint
合成 composite
页面显示
```

### 导航阶段
1. 输入具体的URL
2. 检查缓存
    1. 强缓存(`Cache-Control: max-age=31536000`)
    2. 协商缓存（强缓存失效，浏览器就会向服务器发请求，询问资源是否变化，例如请求头：`If-None-Match / ETag`，如果资源没变，返回状态码 `304 Not Modified`，然后接着用本地缓存，否则服务器就会返回新的内容），这一部分参考计网章节
3. DNS 解析，把域名解析为具体的 IP 地址
    1. `www.example.com -> 93.184.216.34`
    2. DNS 查找一般也是有缓存层级的

```text
浏览器 DNS 缓存
操作系统 DNS 缓存
本地 hosts 文件
本地 DNS 服务器
```

4. 建立网络连接
    1. 如果是HTTP1.1/HTTP2 底层一般就是 TCP
    - 简化流程就是这样

```text
客户端：我能连你吗？
服务器：可以，我也能连你
客户端：确认，开始通信
```

    2. 如果是 HTTPS，就还需要TLS握手

```text
确认服务器身份
协商加密算法
生成会话密钥
建立加密通信
```

    3. 流程就是：`TCP 三次握手 -> TLS 握手 -> 建立连接`
5. 发送HTTP请求
    1. 包括常见的请求路径，方法，请求头，cookie，请求体（post）

```text
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: ...
Accept: text/html
Cookie: ...
```

6. 服务器处理请求并返回响应(第一个请求一般是返回HTML)
    1. 返回`Content-Type: text/html`

```text
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: ...
Set-Cookie: ...

<!DOCTYPE html>
<html>
  ...
</html>
```

7. 浏览器提交导航，创建或复用渲染进程
    1. 浏览器拿到具体HTML,然后判断`Content-Type`是否是文档类型的响应，符合的话就会把这个导航提交到渲染进程
    2. 至此导航阶段的任务就已经完成

### 渲染阶段
1. 解析HTML，拿到DOM树

```html
<html>
  <head>
    <title>Demo</title>
  </head>
  <body>
    <div class="box">hello</div>
  </body>
</html>
对应DOM tree
Document
 └── html
     ├── head
     │   └── title
     └── body
         └── div.box
             └── text
```

+ 需要注意的是：边下载HTML边解析
2. 解析CSS，构建CSSOM tree
    1. 如果遇到了类似这样的CSS资源（`<link rel="stylesheet" href="/style.css">`），会发起CSS请求，拿到具体CSS，生成CSSOM 树
    2. 需要注意的是：**CSS会阻塞渲染**，必须要知道元素样式，才能进行布局，绘制，否则会出现闪烁的情况
3. JS解析，可能会阻塞HTML解析
    1. 对于：`<script src="/main.js"></script>`，因为js有可能会操作DOM,CSSOM，会阻塞渲染
        1. 普通script，会阻塞html解析，下载完成后会立即执行，执行完成后才会接着解析html
    2. `defer`: `<script defer src="main.js"></script>`
        1. 不会阻塞 HTML解析
        2. 脚本是并行下载的
        3. 在DOM解析完成，`DOMContentLoaded`之前执行
        4. 多个`defer`脚本按顺序执行的
    3. async: `<script async src="main.js"></script>`
        1. 不阻塞HTML
        2. 下载完成立即执行
        3. 执行的时候暂停HTML解析
        4. 多个async执行顺序不确定
    4.  **一般业务主脚本更适合 **`**defer**`**，统计脚本、埋点脚本、广告脚本更适合 **`**async**`
4. 构建`Render Tree` 渲染树
    1. 可以简单理解为：`DOM 树 + CSSOM 树 = Render Tree`，但是render tree只包含要显示的节点，比如display:none,就不会进入render tree，但是visibility:hidden 元素仍然会占据空间，会进入render tree
5. **Layout:布局/回流（reflow）**
    1. 计算元素的几何信息，包括元素位置，宽高，直接的关系，盒模型的尺寸
6. **Paint：绘制 / 重绘(repaint)**
    1. 知道元素位置大小，就需要把元素绘制，包括文字，颜色，背景，边框，阴影等等绘制出来
7. **composite 合成**
    1. 页面会分为多个图层，一些元素可能会被提升为独立的合成层，比如

```text
transform
opacity
will-change
position: fixed
video
canvas
```

+ 例如`transform: translateX(100px);``opacity: 0.5;`浏览器就可能不需要重新布局/绘制，性能好

DOMContentLoaded 和 load 的区别

+ `DOMContentLoaded`事件，代表html解析完成，DOM树已经生成。但是图片，视频，字体资源可能未加载完成
+ `load`事件代表页面所有资源都加载完成(图片，iframe)
+ `DOMContentLoaded` 通常早于 `load`

### 前端性能角度如何去优化
导航阶段

```text
DNS 预解析
连接预建立
开启 HTTP/2 或 HTTP/3
合理使用缓存
减少重定向
CDN 加速
压缩 HTML/CSS/JS
```

渲染阶段减少阻塞资源

```text
关键 CSS 内联
非关键 CSS 延迟加载
JS 使用 defer 或 async
拆包和按需加载
减少首屏 JS 体积
```

渲染阶段，减少布局layout，绘制paint的成本

```text
避免频繁读写布局属性
批量修改 DOM
使用虚拟列表
减少复杂选择器
减少大面积重绘
动画优先使用 transform 和 opacity
```



> 从浏览器地址栏输入 URL 到页面渲染完成，可以分成导航阶段和渲染阶段。导航阶段主要是浏览器先解析用户输入，判断是 URL 还是搜索内容，然后检查缓存。如果缓存不可用，就进行 DNS 解析，把域名解析成 IP，然后建立 TCP 连接；如果是 HTTPS，还会进行 TLS 握手。连接建立后，浏览器发送 HTTP 请求，服务器处理请求并返回 HTML。如果中间有 301、302 重定向，浏览器还会继续请求新的地址。拿到 HTML 响应后，浏览器进程会提交导航，把文档交给渲染进程处理。
>
> 渲染阶段主要发生在渲染进程中。浏览器会边下载边解析 HTML，构建 DOM 树；遇到 CSS 会下载并解析成 CSSOM，CSS 会阻塞渲染；遇到普通 script 会暂停 HTML 解析，因为 JS 可能会修改 DOM 或 CSSOM。DOM 和 CSSOM 构建完成后，会合成 Render Tree，然后进入 Layout 阶段计算每个元素的位置和大小，再进入 Paint 阶段生成绘制指令，最后进入 Composite 合成阶段，把不同图层合成后显示到屏幕上。
>
> 从前端性能优化角度看，这个过程里可以优化的点很多，比如使用缓存和 CDN 减少网络耗时，减少重定向，使用 `dns-prefetch`、`preconnect` 提前建立连接；渲染阶段可以减少阻塞资源，CSS 尽量精简，JS 使用 `defer` 或 `async`，减少首屏 JS 体积；页面更新时要避免频繁触发布局和重绘，动画尽量使用 `transform` 和 `opacity`，这样更多走合成阶段，性能会更好。
>

## 请求竞态与请求取消

- 竞态问题：搜索框连续输入触发多个请求，响应返回顺序不保证，**先发的请求可能后返回**，旧数据覆盖新数据

```javascript
// ❌ 有竞态风险：后返回的旧响应会覆盖最新输入的结果
let keyword = '';
async function search() {
  const res = await fetch(`/api/search?q=${keyword}`);
  const data = await res.json();
  render(data); // 渲染的可能是上一次请求的结果
}
```

- 方案一：请求编号，只接收最新请求的响应

```javascript
let requestId = 0;
async function search() {
  const id = ++requestId; // 每次请求自增编号
  const res = await fetch(`/api/search?q=${keyword}`);
  const data = await res.json();
  if (id === requestId) {
    render(data); // 只有最新请求的响应才渲染，过期响应直接丢弃
  }
}
```

- 方案二：`AbortController` 取消旧请求（节省带宽，更彻底）

```javascript
let controller = null;
async function search() {
  controller?.abort(); // 取消上一次还未完成的请求
  controller = new AbortController();
  const res = await fetch(`/api/search?q=${keyword}`, {
    signal: controller.signal,
  });
  const data = await res.json();
  render(data);
}
```

- 两者可结合：编号做最后一道防线，`AbortController` 负责主动取消旧请求

> 请求竞态是搜索、筛选这类高频触发请求的场景里很常见的问题。本质是异步请求的返回顺序不保证，用户输入到一半，上一个请求可能后返回，把旧数据渲染上去覆盖新结果。
>
> 我一般用两层解决。第一层是请求编号：每次发起请求前自增一个 `requestId`，响应回来后先判断 `id === requestId`，只有最新请求的响应才渲染，过期的直接丢弃。第二层用 `AbortController` 在发新请求前主动取消上一个未完成的请求，这样既避免旧数据覆盖，又能省带宽。实际项目里我两个一起用，编号是最后一道兜底，`abort` 负责主动止损。
