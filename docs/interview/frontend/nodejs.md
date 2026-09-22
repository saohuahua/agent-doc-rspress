# Node.js
yarn

+ 为了解决早期npm版本较慢的问题，实现了 并行下载和缓存机制 ，速度更快
+  引入了`yarn.lock`文件，确保在任何环境中，使用相同的`yarn.lock` 文件都能安装完全相同的依赖版本，提高了项目的一致性  
+ 工作区 (Workspaces) 支持**：** 对于 Monorepo（多项目仓库）管理非常友好，可以更方便地管理多个相关联的项目

| 特性 | **npm** | **Yarn** | **cnpm** |
| --- | --- | --- | --- |
| **安装** | 随 Node.js 默认安装 | 需单独安装 | 需通过 `npm install -g cnpm`安装 |
| **速度** | 近期版本有显著提升，但早期较慢 | 通常比早期 npm 版本快，并行下载与缓存 | 在中国大陆访问国内镜像，速度最快 |
| **确定性** | 引入 `package-lock.json`后实现确定性 | 通过 `yarn.lock`确保确定性 | 依赖其所代理的 npm 或 Yarn 的确定性机制 |
| **离线模式** | 有限支持 | 支持，通过缓存 | 支持 |
| **特性** | 内置安全审计 | Workspaces, PnP | 主要是加速下载 |
| `**node_modules**` | 扁平化（通过提升依赖） | 扁平化，或 PnP | 扁平化，或基于 npm 的机制 |
| **推荐用户** | 初学者、中小型项目；最新的 npm 性能也很好 | 大型项目、Monorepo、追求极致性能和一致性 | **中国大陆**用户，用于加速安装，但最好是配置 npm 或 Yarn 的镜像源 |


# 什么是`SSE`，他和`websocket`有什么区别
+ SSE（server-sent-Event）**服务端发送事件**，允许服务器**单向**地向客户端推送更新。 简而言之，就是服务器可以主动“通知”客户端有新数据了。  
+  SSE是建立在 **HTTP 协议**之上的，并且使用了一个特殊的 MIME 类型：`text/event-stream`
+ 支持自动重连
+ 单向通信

## `SSE`流程
1. 客户端发起连接
2. 服务端响应`text/event-stream`，保持连接的开启
3. 服务器推送事件，按照特定的格式
4. 客户端接收事件：客户端中的`EventSource`对象监听这些事件，收到新事件触发回调更新页面内容
5. 自动重连：`EventSource`会处理网络中断时候自动重连



适用场景

+ 实时数据的更新
+ 进度更新（文件上传进度，任务执行进度）

## 和websocket区别
| 特性 | SSE (Server-Sent Events) | WebSocket |
| --- | --- | --- |
| **通信方向** | **单向** (服务器到客户端) | **双向** (服务器和客户端都能相互发送数据) |
| **协议** | 基于 HTTP | 全双工协议 (独立于 HTTP 的新协议，通过 HTTP 握手建立) |
| **开销** | 轻量级 | 相对较高 (需要更复杂的握手和帧结构) |
| **兼容性** | 对代理/防火墙更友好 | 可能需要代理/防火墙支持 WebSocket 协议 |
| **自动重连** | 内置 | 需要手动实现或依赖库的功能 |
| **数据格式** | `text/event-stream` | 自定义二进制或文本格式 |
| **最佳场景** | 实时数据推送，服务器单向通知 | 实时交互，在线聊天，多人协作游戏等双向通信 |


#  CommonJS与ES区别  
## 导入导出
+ commonJS导入采用`require`，导出采用`module.exports `

```javascript
const myModule = require('./myModule');

// myModule.js
function sayHello() {
  console.log('Hello from myModule!');
}
module.exports = sayHello; // 导出单个值

const funcA = () => { /* ... */ };
const varB = 123;
module.exports = { funcA, varB }; // 导出多个值
```

+ ES modules 采用`import`导入，`export`导出

```javascript
import myModule from './myModule.js'; // 导入默认导出
import { funcA, varB } from './anotherModule.js'; // 导入命名导出
import * as allExports from './someModule.js'; // 导入所有命名导出为一个对象
import './sideEffectModule.js'; // 导入模块只为执行其副作用

// myModule.js
function sayHello() {
  console.log('Hello from myModule!');
}
export default sayHello; // 默认导出

// anotherModule.js
export const funcA = () => { /* ... */ }; // 命名导出
export const varB = 123; // 命名导出
```

## 加载机制
+ commonJS采用**同步加载**，当`require`被调用，模块会立即执行，这意味着模块加载完成之前会阻塞后面的代码
    - **缓存：** 模块一旦被加载，就会被缓存。后续的 `require()` 调用会直接返回缓存中的模块实例
    - **值拷贝：** 导出的值是原始值的拷贝。即使原模块中的值发生变化，已导入的模块也不会随之改变（除非是对象引用）  
+  ES Modules 是**异步加载**的，但其解析和构建过程是在编译时完成的（静态分析）。
    - 实际的模块加载可以通过多种方式实现（例如，浏览器中的 `<script type="module">` 默认是延迟且异步执行的，Node.js 中的 ESM 也是异步加载和执行的）
    - **缓存：** 模块一旦加载并解析，也会被缓存
    - **引用：** 导出的值是原始值的引用（live binding）。如果原模块中的导出值发生变化，导入它的模块也会同步反映这个变化

## 使用环境
+ commonJS主要是用于Node.js环境
+ ES module 浏览器原生支持

| 特性 | CommonJS | ES Modules |
| :---: | :---: | :---: |
| 导入/导出语法 | `require()` / `module.exports (exports)` | `import` / `export (export default)` |
| 加载方式 | 同步 | 异步 (静态分析，运行时动态加载/执行) |
| 加载时机 | 运行时 | 编译时 (静态) |
| 导出值 | 值拷贝 | 引用 (live binding) |
| this | 模块顶层的 this 指向 module.exports | 模块顶层的 this 指向 undefined |
| 使用环境 | 主要 Node.js | 浏览器原生支持，Node.js 逐渐支持 |
| Tree-shaking | 不支持或支持有限 | 编译时支持 (因为静态分析) |
| 循环依赖 | 导出未完成的引用会得到 undefined | 有更好的机制处理，不会直接出现 undefined |


