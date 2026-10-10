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
+ `event.target` **实际触发事件的目标元素**（事件最初发生在哪里；在委托里，它可能是被点到的深层子元素）
+ `event.currentTarget` **当前正在执行这个监听器的元素**，也就是「监听器绑在谁身上」；在委托里就是那个容器
    - ⚠️ 它**只在事件派发过程中有效**：回调执行结束后会被置为 `null`，所以不要把它存起来在异步里使用
+ `event.preventDefault()` 阻止事件默认行为，例如表单提交or链接跳转
+ `event.stopPropagation() `阻止事件在DOM树进一步传播，阻止冒泡和捕获
+ `event.composedPath()` 返回事件传播的完整路径数组；涉及 **Shadow DOM** 时会用到——事件跨越 shadow 边界后 `event.target` 会被「重定向」为宿主元素，从外部拿不到内部真实目标，这时用 `composedPath()` 才能看到完整路径

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

上面这个写法只适合「`li` 里没有其他元素」的情况。一旦 `li` 内部还有图标、`<span>`、文案，用户点到的是那些**子元素**，`event.target.tagName` 就不是 `LI` 了，判断会失效。下面把三个边界补齐。

#### 边界一：委托依赖事件传播，常见做法依赖冒泡

+ 大多数交互事件都会冒泡（`click`、`input`、`change`、`keydown`、`submit`…），所以可以委托到父元素。
+ 但也有一批事件**不冒泡**：`focus` / `blur`、`mouseenter` / `mouseleave`、`load` 等。这类事件不能靠冒泡委托。可选做法：
    - 改用会冒泡的对应事件：`focusin` / `focusout`、`mouseover` / `mouseout`
    - 在**捕获阶段**监听：`addEventListener(type, handler, true)`（捕获是从外向内，同样能在父元素上提前拿到事件）
    - 或者干脆直接绑到目标元素上
+ 所以「所有事件都能委托」是不严谨的，要先确认该事件是否有你需要的传播行为。

#### 边界二：点击嵌套元素时，用 `closest()` 找业务元素

+ 用户点的往往不是列表项本身，而是里面的图标 / `<span>` / 文字，`event.target` 是那个**最深层**元素，直接读 `tagName` 或 `dataset` 都拿不到想要的数据。
+ 正确做法是从 `event.target` 向上找**最近的业务元素**：`event.target.closest('.item')`。

#### 边界三：匹配到之后，必须确认它还在委托容器内部

+ `closest()` 会一路向上找到 `document`。如果容器**外面**也有同样类名的祖先元素，就会匹配到**容器外**的元素，处理错对象。
+ 所以要用 `container.contains(el)` 再校验一次，确保拿到的元素确实在委托范围内。

```html
<ul id="list">
  <li class="item" data-id="1">
    <span class="icon">★</span>
    <span class="title">Item 1</span>
  </li>
  <li class="item" data-id="2">
    <span class="icon">★</span>
    <span class="title">Item 2</span>
  </li>
</ul>
<script>
  const list = document.getElementById('list')

  list.addEventListener('click', function (event) {
    // 1. 从「实际被点击的元素」向上找业务元素：点图标、点文字都能命中同一个 li
    const item = event.target.closest('.item')

    // 2. 没匹配到（比如点在列表空白处），或匹配到的元素在容器之外，都直接忽略
    if (!item || !list.contains(item)) return

    console.log('点击的条目 id =', item.dataset.id)
    // 此时：event.currentTarget === list（监听器绑在谁身上）
    //       event.target 是真正被点到的那个 span
  })
</script>
```

> 补充：如果不需要向上找、只是判断「被点的就是某个东西」，也可以直接用 `event.target.matches('.item')`。另外 `event.target` 在极端情况下可能不是元素（比如事件目标是文档节点），必要时可以加一层 `event.target instanceof Element` 的保护。

**面试追问**

+ `event.target` 和 `event.currentTarget` 有什么区别？→ 前者是**事件实际发生**的元素，冒泡过程中**不变**；后者是**当前正在执行回调的那个监听器所绑定的**元素，委托里就是容器。而且 `currentTarget` 只在派发过程中有效，回调结束后是 `null`。
+ 点到 `li` 里的 `span`，怎么拿到对应的 `li`？→ `event.target.closest('.item')`，并用 `container.contains(...)` 确认它在委托容器内。
+ 所有事件都能用事件委托吗？→ 不能。不冒泡的事件（`focus` / `blur`、`mouseenter` / `mouseleave`）不行；可以改用对应的冒泡事件（`focusin`）、在**捕获阶段**监听，或直接绑到目标元素上。
+ 用了 Shadow DOM 会有什么影响？→ 事件跨 shadow 边界时 `event.target` 会被重定向为宿主元素，必要时用 `event.composedPath()` 拿到完整路径来定位真实目标。

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
+ 持久化存储**键值对**数据，**没有内建的过期时间**：会一直保留到被显式清除，或**存储策略发生变化**（用户清理浏览数据、浏览器在存储压力下驱逐、隐私/无痕会话结束等）
+ 生命周期：持久化本地存储
+ 可访问性：**按同源隔离**（相同协议 + 域名 + 端口）；同源的不同标签页 / 窗口**共享**同一份数据，也就是说在一个标签页写入，另一个同源标签页能读到
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
与 LocalStorage 类似，但数据只在**当前页面会话（page session）**内有效

+ 生命周期：**会话级别**存储。这里说的「会话」是**页面会话**，不是后端的登录会话
    - 数据在**该标签页/窗口**的生命周期内有效，这个标签页（或浏览器）关闭后，`sessionStorage` 中的数据会被清除
    - 会话期间**刷新页面、同源跳转**，数据都还在
    - 新开一个标签页通常**不共享**原标签页的数据；不过现代浏览器里，通过 `window.open` 或 `<a target="_blank">` 打开的同源新标签页，会**复制**一份当时的 `sessionStorage` 作为初值，之后两者各自独立
+ 可访问性：**按同源 + 页面会话隔离**；同源的不同标签页通常互相看不到对方的 `sessionStorage`
+ 接口/API 参照`localStorage`
+ 应用场景
    - 表单数据临时保存**：** 用户填写多页表单时，可以在页面跳转间保持数据，防止意外丢失
    - 页面级临时状态**：** 例如一次性的表单草稿、临时校验码、页面内的向导步骤

:::warning
不要把「Session ID」和 `sessionStorage` 画等号

**Session ID 是应用层/服务端的会话标识**，它的作用是让服务端认出「这次请求属于哪个会话」。它和 `sessionStorage` 是两个层面的东西：

+ **存哪儿**：Session ID 可以放在 Cookie 里（最常见，能配合 `HttpOnly`），也可以放在 URL、自定义请求头或 `localStorage` 里，各有安全取舍；而 `sessionStorage` 只是浏览器提供的一个键值存储容器
+ **谁生成**：Session ID 通常由**服务端**生成并校验；`sessionStorage` 只是客户端存储
+ **生命周期**：Session ID 的有效期由服务端的会话策略决定，和「标签页是否关闭」没有必然关系；`sessionStorage` 则跟着页面会话走

所以「把 Session ID 临时存在 `sessionStorage` 里」是一种**可能的**实现方式，但不能反过来说 `sessionStorage` 就是 Session ID。
:::

### Cookie

+ 存储容量：**单条 Cookie 通常以约 4KB 作为常见参考上限，实际限制因浏览器而异**；同一域名下的 Cookie 条数和总容量也各有上限。**注意：这个 4KB 量级的限制是 Cookie 的，不要套到 `sessionStorage` / `localStorage` 上**
+ 适用范围与生命周期：由 `Domain`、`Path`、`Expires` / `Max-Age` 等属性共同决定（详见上文 [Cookie](#cookie) 章节）
    - **会话期 Cookie**：不设置过期时间，浏览器会话结束即失效
    - **持久 Cookie**：设置了过期时间，在过期前一直有效
    - 只有当请求**同时满足 Domain、Path、Secure、SameSite 等条件**时，Cookie 才会被自动附加到该 HTTP 请求上
+ 应用场景
    - 承载服务端的**会话标识（Session ID）**，实现登录状态保持（同样地：Session ID 不等于 Cookie，只是常放在 Cookie 里）

| 特性 | LocalStorage | SessionStorage | Cookie |
| :---: | :---: | :---: | :---: |
| 容量 | 常见参考 5–10MB（因浏览器而异） | 常见参考 5–10MB（因浏览器而异） | 单条约 4KB（因浏览器而异） |
| 生命周期 | 持久，直到被显式清除或存储策略改变 | 页面会话（标签页）结束即清除；会话内刷新、同源跳转仍保留 | 由 `Expires`/`Max-Age` 决定；不设置则为会话期 Cookie |
| 作用域 | 同源，跨标签页/窗口共享 | 同源 + 页面会话（标签页）隔离，同源不同标签页通常互不可见 | 由 `Domain`/`Path` 决定（可扩展到子域），同源/同域内跨标签页共享 |
| 与服务器交互 | 仅客户端 JS 读写，**不会**自动附加到 HTTP 请求 | 仅客户端 JS 读写，**不会**自动附加到 HTTP 请求 | 符合条件时**自动随 HTTP 请求发送**；JS 可读写（`HttpOnly` 时 JS 读不到） |
| 易用性 | 简单易用的 JS API | 简单易用的 JS API | JS 操作复杂，需手动解析；通常由服务器通过 `Set-Cookie` 操作 |
| 安全性 | 同源策略下其他源读不到，但**同源 JS（含被注入的 XSS 脚本）可以读取**，不适合存放敏感凭证 | 同 `localStorage`，同样会被同源 XSS 读取 | `HttpOnly` 能阻止 JS 直接读取，降低 XSS 窃取风险；但会自动携带，需要配合 `SameSite`/CSRF Token 防 CSRF |

:::info
两个容易混淆的点

+ **Web Storage 不会自动发给服务器**。`localStorage` / `sessionStorage` 只是浏览器里的键值存储，只有页面的 JS 主动读取后才能放进请求；这一点和 Cookie「符合条件就自动携带」有本质区别。
+ **容量、生命周期这些数字都是常见参考值**，不是规范保证的硬性限制。不同浏览器（以及同一浏览器的不同版本、隐私模式、是否开启存储分区等）策略都可能不同，不要把上表当成跨浏览器的精确契约。

:::

## JWT 认证

+ JWT（JSON Web Token）通常用于以下场景
    - **认证**（authentication）：用户登录后，服务器生成JWT发送给客户端，客户端在后续请求中会携带这个JWT，服务器验证其有效性来确认用户的身份
    - **授权**（authorization）:JWT可以包含用户的权限信息，服务器通过解析JWT来判断用户是否有权限访问某个资源
    - **信息交换**：JWT 可以在**不加密但带签名**的情况下传输少量信息，接收方能校验其完整性和来源；**注意 payload 只是编码、不是加密，不代表内容保密**（详见下文「JWT 存储位置与安全权衡」）

### JWT组成
+ JWT是一个字符串，每部分由`.`分割
    -  `header.payload.signature`  
    - `header` 和 `payload` 都是 **Base64URL 编码的 JSON**——是**编码**，不是**加密**，任何人拿到 token 都能解出内容
1. `header`
+ 包含`type`（令牌类型），`alg`（签名算法algorithm）
2. `payload`
+ 包含了对令牌的声明，通常是用户和附加数据的信息
+ ⚠️ payload 是明文可读的，**不要把密码、身份证号、密钥等敏感信息放进去**

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
+ ⚠️ 签名提供的是**完整性 + 来源验证**，**不提供机密性**：它能证明内容没被改过、是持有密钥的一方签发的，但不会隐藏 payload 的内容

### JWT流程
+ **用户登录：** 用户输入凭据（用户名/密码）发送给认证服务器。
+ **生成 JWT：** 认证服务器验证凭据，如果合法，则生成一个 JWT（包含用户ID、角色等信息，并用密钥签名）。
+ **返回 JWT：** 服务器将生成的 JWT 返回给客户端。
+ **后续请求携带 JWT：** 客户端把 JWT 存起来（常见两种：放 `localStorage` 后由 JS 手动加请求头，或放 Cookie 由浏览器自动携带，取舍见下一节），并在后续需要认证的请求中，将 JWT 放在 HTTP 请求头的 `Authorization` 字段里（通常是 `Bearer <JWT>` 格式）。
+ **服务器验证 JWT：** 接收到请求的服务器从 `Authorization` 头中提取 JWT，并使用相同的密钥（或公钥）验证其签名、检查过期时间等。
+ **响应请求：** 如果验证通过，服务器处理请求并返回数据。如果验证失败（签名不匹配、过期等），服务器返回 401 Unauthorized 错误。

### JWT 存储位置与安全权衡

JWT 本身**不规定存哪里**，存哪里是一个独立的工程和安全决策。两种主流方案各有权衡，**没有一种在所有场景下都更安全**。

**方案一：放 `localStorage`（或 `sessionStorage`），由 JS 手动放进 `Authorization` 头**

+ 优点：前后端分离、跨域、多端复用同一 token 都比较自然；因为需要 JS 主动加请求头，**天然规避了一部分 CSRF**（别的站点发起的请求带不上这个头）
+ 风险：**同源 JavaScript 可以直接读取它**。一旦页面发生 XSS，token 就可能被 `localStorage.getItem` 读走并外发；而且在有效期内，服务端很难区分「这是本人还是攻击者」。这类方案通常要靠严格的内容转义、CSP、依赖审计、以及**尽量短的有效期 + 刷新机制**来兜底
+ 另外要注意：如果前端代码里把 token 拼进 URL、日志或上报，也会造成泄露

**方案二：放 Cookie（推荐关键 Cookie 加上 `HttpOnly`），由浏览器自动携带**

+ 优点：`HttpOnly` **可以阻止 JavaScript 直接读取 Cookie**，因此 XSS 无法直接 `document.cookie` 拿走凭证，降低凭证被窃取的风险
+ **但要说清楚：`HttpOnly` 只解决「JS 读取」，不能单独解决 CSRF**。因为浏览器会自动携带 Cookie，恶意站点诱导发起的跨站请求照样带上凭证。所以 Cookie 认证还需要：
    - 在 HTTPS 下使用 `Secure`
    - 设置合适的 `SameSite`（`Lax`/`Strict`；`SameSite=None` 必须配合 `Secure`）
    - 结合业务场景做 CSRF 防护：CSRF Token、双提交 Cookie、校验 `Origin`/`Referer`、要求自定义请求头等
+ 代价：Cookie 有约 4KB 量级的体积限制，且会随符合条件的请求自动发送，需要注意 `Domain`/`Path` 的作用范围和流量成本

**关于 JWT 本身，两个必须记住的结论**

+ **Payload 通常只是 Base64URL 编码，不等于加密**。任何人拿到 token 都能把 `header` 和 `payload` 解出来看到内容（可以直接在 jwt.io 上试）。所以**不要把密码、身份证号、密钥等敏感信息放进 payload**
+ **签名（`signature`）用于验证完整性和来源**：确认内容没被篡改、确认是持有密钥的一方签发的。它**不提供机密性**。如果确实需要载荷保密，要用 JWE（加密的 JWT）或另做加密
+ 补充：JWT 一旦签发，在过期前**默认无法撤销**，所以要关注 `exp` 有效期、刷新策略，以及服务端的吊销手段（黑名单、token 版本号等）

**结论：怎么选**

选哪种存储方式，要结合**前后端架构**（是否同域、有没有 BFF/网关、是否需要跨域）、**威胁模型**（更担心 XSS 还是 CSRF）、**是否需要多端复用同一凭证**、**会话时长要求**来决定，不能简单断言「LocalStorage 永远更安全」或「Cookie 永远更安全」。

:::info
别把 JWT、Session、Cookie 放在同一层级比较

它们不是互斥的同类方案，而是回答不同问题的三个东西：

+ **存什么**：JWT（自包含的令牌）还是 Session ID（指向服务端会话的标识）
+ **存哪儿**：Cookie、`localStorage`、`sessionStorage`、内存变量
+ **怎么带**：Cookie 自动携带，或 JS 手动放进 `Authorization` 头

例如「JWT + HttpOnly Cookie」和「Session ID + Cookie」都是常见组合；「Session ID + `localStorage`」也可以实现。面试时先把这三个维度拆开，再谈安全取舍，会比直接比较「JWT 和 Cookie 谁更安全」严谨得多。
:::

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
    2. **CSS 会阻塞渲染**：没有 CSSOM 就没法计算样式，也就进不了布局和绘制；不等的话会先渲染出无样式内容再突然变样（闪烁，FOUC）
    3. 但不要一概说成「CSS 阻塞一切」，三件事要分开：
        - **不阻塞 DOM 构建**：HTML 解析器会继续解析、继续建 DOM，不会停下来等 CSS
        - **阻塞渲染**：这是典型情况，属于 render-blocking
        - **可能阻塞其后脚本的执行（有条件）**：如果样式表排在经典脚本**前面**且此刻还没加载完，脚本要等它加载并构建完 CSSOM 之后才执行——因为脚本可能读取计算样式。把样式表放到脚本之后就不构成这个等待（详见下文追问）
3. JS解析，可能会阻塞HTML解析
    1. 对于：`<script src="/main.js"></script>`，因为js有可能会操作DOM,CSSOM，会阻塞渲染
        1. **普通 script 会阻塞 HTML 解析**：浏览器要把控制权交给 JS 引擎执行脚本，而脚本可能修改当前文档，所以解析器会暂停、等脚本下载并执行完再继续（原因见下文追问）
    2. `defer`: `<script defer src="main.js"></script>`
        1. 不阻塞 HTML 解析，与解析**并行下载**
        2. 在 **HTML 解析完成后、`DOMContentLoaded` 之前**执行
        3. 多个 `defer` 脚本**按出现顺序**执行
    3. async: `<script async src="main.js"></script>`
        1. 不阻塞 HTML 解析，与解析**并行下载**
        2. **下载完立即执行**，执行时会暂停 HTML 解析
        3. 多个 `async` 脚本执行顺序**不确定**
    4.  **一般业务主脚本更适合 **`**defer**`**，统计脚本、埋点脚本、广告脚本更适合 **`**async**`（完整对比见下文表格）
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

+ 例如 `transform: translateX(100px)` 和 `opacity: 0.5`，**在很多情况下**可以跳过布局、甚至跳过绘制，只在合成阶段处理，所以动画更顺滑——但这是**有条件的优化，不是承诺**（详见下文追问）

### 追问：普通 script 为什么阻塞 HTML 解析？

+ 执行脚本时，浏览器要把页面的控制权交给 JS 引擎，而**脚本可能修改当前正在构建的文档**（`document.write`、增删 DOM、读取尚未解析到的结构）
+ 为了让脚本看到「确定」的文档状态，解析器必须**暂停解析、等脚本执行完成后**再继续往下解析
+ 如果脚本是外部文件，还要先等它**下载完成**——所以把普通 `<script>` 放在 `<head>` 里会直接拖慢首屏
+ 现代做法：把脚本放到 `<body>` 末尾，或者用 `defer` / `async`

### 追问：`async` 和 `defer` 有什么区别？

下面的对比针对**经典外部脚本**（不带 `type="module"` 的 `<script src="...">`）；模块脚本和动态插入脚本的默认行为不同，见表格下方的说明。

| 对比项 | 普通 `<script>` | `defer` | `async` |
| --- | --- | --- | --- |
| 下载是否与 HTML 解析并行 | ❌ 阻塞：解析器停下等「下载 + 执行」 | ✅ 并行下载，解析不中断 | ✅ 并行下载，解析不中断 |
| 执行时机 | 下载完**立即执行**，执行期间解析暂停 | **HTML 解析完成后**执行，且在 `DOMContentLoaded` **之前** | **下载完就执行**，执行的那一刻会暂停 HTML 解析 |
| 多个脚本的执行顺序 | 按出现顺序 | **按出现顺序**（有顺序保证） | **不确定**，谁先下载完谁先执行 |
| 是否适合依赖 DOM / 其他脚本 | 可以，但位置要求严格（一般放末尾） | **适合**：DOM 已就绪，依赖顺序也有保障 | **不适合**有依赖关系的脚本 |
| 对 `DOMContentLoaded` 的影响 | 会延迟它（要等脚本执行完） | 在它**之前**执行，因此也会延迟它 | 不保证先后，取决于下载时机 |

+ 结论：**业务主脚本用 `defer`**（需要 DOM 就绪 + 顺序稳定）；**统计 / 埋点 / 广告这类互不依赖、越早执行越好的脚本用 `async`**

**两个容易搞错的地方**（这两类脚本的默认行为不一样，不能和上面的经典脚本混为一谈）：

+ **模块脚本**（`<script type="module">`）**默认就是延迟执行**的（类似 `defer`），并且按顺序执行；只有显式加上 `async` 才会变成「下载完就执行、顺序不定」。
+ **动态插入的脚本**（`document.createElement('script')` 之后插入文档）默认行为类似 `async`（下载完就执行）；把 `script.async = false` 可以让它们按插入顺序执行。

### 追问：CSS 会阻塞脚本执行吗？

不要答成「CSS 总是阻塞 JavaScript」，也不要答成「CSS 一定阻塞 DOM 构建」。准确说法是分三件事：

+ **不阻塞 DOM 构建**：HTML 解析器不会因为 CSS 还没下载完就停下，DOM 可以继续往下建。
+ **阻塞渲染（render-blocking）**：必须等 CSSOM 建好才能计算样式，然后才能布局、绘制；否则会出现「先渲染无样式内容、再突然变样」的闪烁（FOUC）。
+ **可能阻塞其后出现的经典脚本执行（有条件）**：如果样式表排在经典脚本**前面**、且此刻还没加载完，脚本会**等它加载并构建完 CSSOM 之后才执行**——因为脚本可能读取计算样式。条件是「样式表在脚本之前 + 尚未就绪」；把样式表放到脚本之后，就不构成这个等待。

### 追问：为什么动画常用 `transform` 和 `opacity`？

+ 因为改变它们**在很多情况下**可以跳过布局（layout），甚至跳过绘制（paint），只在**合成（composite）**阶段处理，代价更低，更容易保持流畅。
+ 但这是**有条件的优化，不是保证**：
    - 元素会不会被提升为**独立合成层**，取决于浏览器实现、具体属性值、当前图层数量与显存预算，以及页面其他内容；同一写法在不同设备 / 浏览器上可能表现不同；
    - 「不触发布局」的前提是**只改了 `transform` / `opacity`**。如果同一帧还改了 `width`、`top`、`left` 这类几何属性，或者读取 `offsetWidth` / `getBoundingClientRect()` 触发**强制同步布局**，该发生的布局照样会发生；
    - 图层不是越多越好：图层过多会带来显存和合成开销，`will-change` 也不宜长期挂着（用完应移除）。
+ 所以正确表述是「动画**优先考虑** `transform` / `opacity`」，而不是「用了它就一定不触发布局 / 绘制」；最终要用 DevTools 的 **Performance / Rendering** 面板实测确认。

> 这一节和 [JavaScript 核心机制 → 事件循环](./js-core#事件循环) 里的「渲染发生在什么时候」是配套的：那边讲浏览器**什么时候**有机会渲染（以及微任务为什么能拖住渲染），这里讲渲染**具体做了什么**、哪些步骤最贵。

### `DOMContentLoaded` 和 `load` 的区别

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

> 注意一个容易踩的坑：被 `abort()` 掉的那次 `search()` 里，`await fetch(...)` 会以 `AbortError` **拒绝**。如果调用方没有捕获，就会变成「未处理的 Promise 拒绝」，控制台会报错。所以实际项目里要在这个 async 函数里补 `try/catch`（或在调用处 `.catch`），把 `AbortError` 静默过滤掉。

- 两者可结合：编号做最后一道防线，`AbortController` 负责主动取消旧请求

### 取消的边界：客户端取消 ≠ 服务端没执行

这是这套方案里最容易被追问、也最容易出事的地方：

+ **`AbortController` 取消的是「客户端对这次请求的等待 / 通信处理」**。调用 `abort()` 后，`fetch` 的 Promise 会以 `AbortError` 拒绝，浏览器不再处理这个响应；但**请求很可能已经到达服务端，服务端也可能已经开始、甚至已经完成了操作**。取消并不能「撤回」已经发生的事。
+ **读场景（搜索、筛选、自动补全）**：可以放心用「取消旧请求 + 只处理最新请求的结果」。因为重复读没有副作用，最坏只是浪费一点带宽，所以竞态方案在这里非常划算。
+ **写场景（下单、支付、创建资源、提交表单）**：**不能依赖前端取消来保证服务端没有执行**。用户点了「提交」之后网络断开、页面被关掉，请求仍可能已被服务端处理。这类接口必须由服务端配合：
    - **幂等键**：请求带上 `Idempotency-Key`，服务端据此去重，同一笔业务重复提交只生效一次；
    - **业务状态校验**：用状态机、唯一约束判断「这单是不是已经创建过了」，而不是只靠前端「防重复点击」；
    - **事务**：保证多步写入要么全部成功、要么全部回滚，避免留下中间态。
+ **三种「失败」要分开处理**，不要混成同一个错误类型：

| 情况 | 典型表现 | 前端一般怎么处理 |
| --- | --- | --- |
| **请求超时** | `TimeoutError`（或自定义超时错误） | 提示「请求超时」，可以考虑有限次重试 |
| **客户端主动取消** | `AbortError` | 通常**静默忽略**：可能是用户取消，也可能是竞态中被新请求取代，并不是真错误 |
| **服务端业务失败** | HTTP 4xx/5xx，或 200 但业务码表示失败 | 按业务错误码提示；**有副作用的接口要先查询确认真实状态**，而不是直接让用户重试 |

```javascript
// 把「超时」和「取消」区分为两种不同的错误类型
async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  // 关键：给 abort 传一个带 name 的 reason，catch 里才能区分「超时」和「用户取消」
  const timer = setTimeout(
    () => controller.abort(new DOMException('timeout', 'TimeoutError')),
    ms,
  );

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      // 服务端业务 / HTTP 层失败，和「超时」「取消」是不同情况
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer); // 无论成功失败都要清掉定时器，避免残留
  }
}
```

```javascript
try {
  const data = await fetchWithTimeout('/api/search?q=js', 3000);
  render(data);
} catch (error) {
  if (error.name === 'AbortError') return;                     // 取消 / 被新请求取代：静默忽略
  if (error.name === 'TimeoutError') return showToast('请求超时，请重试');
  return showToast('请求失败，请稍后再试');                      // 其他：业务或网络失败
}
```

> 补充一个更省事的写法：`AbortSignal.timeout(ms)` 可以直接得到一个「到点自动 abort、且 reason 是 `TimeoutError`」的信号，不用自己写 `setTimeout` + `abort`（Chrome 103+ / Node 17.3+，使用前确认目标环境兼容性）。
>
> 另外要注意：`abort()` 不带参数时，拒绝原因是 `AbortError`；传入自定义 `reason`（比如上面那个 `TimeoutError`）时，`fetch` 会以**该 reason** 拒绝。这正是区分两类错误的方式。

> 请求竞态是搜索、筛选这类高频触发请求的场景里很常见的问题。本质是异步请求的返回顺序不保证，用户输入到一半，上一个请求可能后返回，把旧数据渲染上去覆盖新结果。
>
> 我一般用两层解决。第一层是请求编号：每次发起请求前自增一个 `requestId`，响应回来后先判断 `id === requestId`，只有最新请求的响应才渲染，过期的直接丢弃。第二层用 `AbortController` 在发新请求前主动取消上一个未完成的请求，这样既避免旧数据覆盖，又能省带宽。实际项目里我两个一起用，编号是最后一道兜底，`abort` 负责主动止损。
>
> 但要补一个边界：**前端取消只影响客户端**。`abort()` 之后 `fetch` 以 `AbortError` 拒绝，可请求可能早就到服务端了，服务端该做的可能已经做了。所以这套方案我只用在搜索、筛选这类**读接口**上；像下单、支付、创建资源这种**有副作用的写接口**，不能靠前端取消保证安全，需要服务端用幂等键、业务状态校验、事务来兜底。另外我会把「超时」「用户取消」「业务失败」分成三类错误分别处理：`AbortError` 一般静默忽略，`TimeoutError` 可以提示并有限重试，业务失败按错误码提示、有副作用时先查询真实状态。
