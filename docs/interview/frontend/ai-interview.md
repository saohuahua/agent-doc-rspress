# AI 面经

## 说一下token
>  Token 是**大模型处理文本的基本单位**，不完全等于字符或单词，而是由 `tokenizer` 把文本切分出来的片段。大模型的上下文长度、计费、输入输出限制基本都是按 token 计算的。对于前端来说，理解 token 主要是为了知道为什么 AI 对话不能无限传历史记录，为什么上下文会超限，以及为什么流式输出看起来像是一个字一个字返回，其实底层通常是模型按 token 逐步生成。  
>

## 大模型返回的是增量还是全量
+ 2种都有，增量还是全量取决于**是否开启流式处理**
+ **没开启流式**

```typescript
const res = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "解释一下 Vue 的响应式原理",
    stream: false, // 关闭流式
  }),
});

const data = await res.json();

console.log(data.content);

// 返回的就是全量
{
  "content": "Vue 的响应式原理主要是通过数据劫持和依赖收集实现的..."
}

```

+ 开启流式

```typescript
const response = await fetch('/api/chat')

//核心是拿到相应返回的response.body -> ReadableStream
const reader = response.body?.getReader() 

const decoder = new TextDecoder()

while (true) {
  // reader.read 流读取
  const { done, value } = await reader.read()

  if (done) break

  const chunk = decoder.decode(value)

  console.log(chunk)
}
```

>  大模型的返回既可以是全量，也可以是增量，取决于 API 是否开启 stream。非流式模式下，服务端会等模型完整生成后一次性返回完整内容；流式模式下，服务端会把模型生成过程中的 delta 内容逐段返回给前端。更准确地说，大模型底层通常是按 token 自回归生成的，但接口层可以选择缓存完整结果后返回，也可以边生成边推送。  
>

## 大模型为什么可以实现流式输出的效果
核心原因

+ 大模型生成文本本身就是基于前面的内容预测下一个token(自回归生成)
+ 大致流程

```latex
模型生成 token
  ↓
服务端拿到 token 或 delta
  ↓
服务端立即写入 HTTP 响应流
  ↓
浏览器 fetch 读取响应流
  ↓
前端追加到页面
```

+ 不是前端让模型变成了流式,而是**模型本身就是逐步生成**，**服务端把这个过程暴露成了流**

>  大模型能实现流式输出，是因为它的生成过程通常是自回归的，也就是根据已有输入和已生成内容不断预测下一个 token。服务端可以在模型每生成一部分内容时立刻把增量数据写入响应流，前端再通过流式读取不断追加到页面。所以流式输出不是前端单纯做打字动画，而是模型生成、服务端传输、前端渲染这三个过程都支持增量处理。  
>

## 前端如何实现AI对话流式输出
常见的三种方式

+ fetch + ReadableStream（最常见）
+ SSE / EventSource
+ WebSocket

## fetch 为什么可以实现流式响应
浏览器的fetch返回的response对象中有`response.body`，他是一个 `ReadableStream`，也就是说响应体可以边接受边读取

```typescript
const response = await fetch("/api/chat");

const reader = response.body.getReader();

// 读取数据库
reader.read()
```

完整实例

```typescript
async function streamChat() {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "解释一下 Vue3 的响应式原理",
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let result = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value, {
      stream: true,
    });

    result += chunk;

    console.log("当前增量内容：", chunk);
    console.log("当前完整内容：", result);
  }

  return result;
}
```

## fetch SSE WebSocket
| **对比项** | **fetch** | **SSE** | **WebSocket** |
| --- | --- | --- | --- |
| 本质 | HTTP 请求 API | HTTP 流式协议 | 双向通信协议 |
| 是否流式 | 可支持 | 天然流式 | 天然流式 |
| 是否基于 HTTP | 是 | 是 | 握手后升级 |
| 是否单向 | request-response | 服务端→客户端 | 双向 |
| 是否支持实时推送 | 一般 | 支持 | 支持 |
| 是否支持双向通信 | 不支持 | 不支持 | 支持 |
| AI 是否常用 | 非常常用 | 非常常用 | 较少 |
| 实现复杂度 | 低 | 低 | 高 |
| 是否适合聊天 AI | 是 | 非常适合 | 适合复杂实时场景 |
| 是否支持 POST | 支持 | 原生 EventSource 不支持 | 支持 |
| 是否需要长连接 | 不一定 | 是 | 是 |
| 底层协议 | HTTP | HTTP chunk stream | TCP socket |
| 数据格式 | 任意 | text/event-stream | 二进制/文本帧 |
| 浏览器 API | fetch | EventSource | WebSocket |
| 是否容易部署 | 很容易 | 很容易 | 较复杂 |
| CDN/代理兼容性 | 好 | 很好 | 一般 |
| 典型场景 | 普通接口 | AI流式输出 | IM/游戏/语音 |


## `temperature`和`top_p`的区别是什么
两者的本质都是**决定控制大模型下一步怎么选**`**token**`

### `temperature`
+ 调节的是**概率分布的陡峭程度**(让模型更保守 or 更开放)
+ 核心思想(**概率缩放**)
    - `temperature`越低就偏向于选择高概率的token 
    - `temperature`更高，低概率token就越有可能被选中

```typescript
严谨模式：temperature 0.1 - 0.3
平衡模式：temperature 0.5 - 0.8
创意模式：temperature 0.9 - 1.2
```

### top_p
+ 可以理解为： `nucleus sampling`，**核心采样 ** 
+ 模型每次生成token，**只从累计概率达到**`**P**`**的候选token中选样**

```typescript
A：40%
B：25%
C：15%
D：10%
E：5%
F：5%

top_p = 0.8
A 40%
A + B = 65%
A + B + C = 80% 说明后续回答只有可能在A,B,C里面选择，D,E,F不会被选择
```

### 区别
+ `temperature` 是改变概率分布；
+ `top_p` 是截断候选集合。

| 参数 | 主要作用 | 控制对象 | 值越低 | 值越高 | 适合场景 | 前端产品理解 |
| --- | --- | --- | --- | --- | --- | --- |
| `temperature` | 控制随机性、创造性 | 概率分布的平滑程度 | 更稳定、更保守、更确定 | 更随机、更发散、更有创意 | 代码生成、事实问答、文案创作 | 回答风格：严谨 or 创意 |
| `top_p` | 控制候选 token 范围 | 参与采样的 token 集合 | 候选范围更小，结果更保守 | 候选范围更大，表达更多样 | 控制生成范围、防止过度发散 | 可选表达范围的大小 |
| 区别 | 都影响输出多样性 | 机制不同 | `temperature`<br/> 是改概率 | `top_p`<br/> 是筛候选 | 通常不需要两个都大幅调整 | 产品上可以做成高级参数 |


> `temperature` 和 `top_p` 都是大模型生成时的采样参数，都会影响回答的随机性和多样性，但它们的控制机制不同。`temperature` 主要是调整 token 概率分布的平滑程度，值越低模型越倾向选择高概率 token，回答更稳定；值越高，低概率 token 也更容易被选中，回答更有创意但也更容易发散。`top_p` 是核心采样，它会按概率从高到低累加 token，只保留累计概率达到 top_p 的候选集合，然后在这个集合里采样，所以它控制的是候选 token 的范围。
>
> 从前端角度看，这两个参数通常用于 AI 产品的回答风格配置。比如代码生成、事实问答、JSON 结构化输出这类场景，应该使用较低的 temperature，让结果更稳定；文案、创意生成这类场景，可以适当提高 temperature 或 top_p，让表达更丰富。它们的区别可以概括为：temperature 是改变概率分布，top_p 是限制候选范围。实际项目里一般不建议两个参数都大幅调整，通常优先调 temperature，top_p 保持默认或作为高级配置
>

## MCP
> MCP，全称 **Model Context Protocol**，是一个开放协议，主要用来**标准化 AI 应用和外部工具、数据源、上下文之间的连接方式**。
>
> 它不是模型本身的能力，而是一套 client-server 协议。
>
> AI 应用作为 MCP Host，通过 MCP Client 连接一个或多个 MCP Server；MCP Server 可以暴露 Tools、Resources 和 Prompts。
>
> Tools 用来执行动作，比如查数据库、调用 API；
>
> Resources 用来提供上下文数据，比如文件、表结构、文档内容；
>
> Prompts 用来提供可复用的提示词模板。MCP 底层基于 JSON-RPC 2.0，并支持 stdio 和 Streamable HTTP 等传输方式。
>
> MCP 和 Function Calling 的区别在于层级不同。Function Calling 解决的是模型如何生成结构化的函数调用，比如函数名和参数；MCP 解决的是外部工具和上下文如何被 AI 应用标准化发现、连接和调用。简单说，Function Calling 是“模型说我要调用什么函数”，MCP 是“AI 应用通过什么协议找到并调用这些外部能力”。在实际项目里，两者经常配合使用：MCP Server 暴露工具，AI 应用通过 MCP Client 发现工具，再把工具能力提供给模型，模型通过 Function Calling 决定调用哪个工具，最后应用层把调用转发给 MCP Server 执行。
>
> 从前端角度看，MCP 的核心逻辑通常不直接放在浏览器里，而是放在后端、BFF 或 Agent 服务里。前端主要负责 Chat UI、流式输出、工具调用状态展示、错误处理，以及对删除、支付、取消订单这类高风险操作做二次确认。这样理解会更贴近真实 AI 应用架构。
>



## MCP和skills区别
> MCP 和 Skill 都是增强 AI Agent 能力的方式，但它们不是一个层级的东西。
>
> Skill 更像一个可复用的任务能力包，通常由 `SKILL.md`、说明、步骤、示例、脚本和资源组成，作用是告诉模型某一类任务应该怎么做，比如前端代码审查、组件生成、文档生成、面试回答等。它解决的是任务方法论和输出一致性问题。
>
> MCP，全称 Model Context Protocol，是一个标准化协议，主要解决 AI 应用如何连接外部工具、数据源和上下文的问题。MCP Server 可以暴露 Tools、Resources 和 Prompts，AI 应用通过 MCP Client 去发现和调用这些能力，比如读取 GitHub PR、查询数据库、读取 Figma 设计稿、操作浏览器、读取文件等。它解决的是外部能力接入问题。
>
> 简单对比就是：Skill 决定“AI 应该怎么做这类任务”，MCP 提供“AI 可以调用哪些外部能力”。在真实项目里两者经常配合使用，比如做一个 AI 前端研发助手，Skill 可以定义代码审查流程和输出格式，MCP 可以连接 GitHub、Figma、浏览器和测试服务。前端一般不直接实现 MCP 核心逻辑，而是负责 Chat UI、流式输出、工具调用状态展示、错误处理，以及对危险操作做二次确认。
>



## SSE和WebSocket
| 对比项 | SSE / fetch streaming | WebSocket |
| --- | --- | --- |
| 通信方向 | 主要是服务端 → 客户端单向推送 | 客户端 ↔ 服务端双向通信 |
| 是否基于 HTTP | 是，本质是 HTTP 长响应 | 先 HTTP 握手，再升级为 WebSocket |
| 适合 AI 文本对话吗 | 很适合 | 可以，但通常偏重 |
| 适合实时语音吗 | 不太适合 | 更适合，尤其是双向实时流 |
| 前端实现复杂度 | 较低，`fetch + reader.read()` | 较高，要管理连接和消息协议 |
| 后端实现复杂度 | 较低，`res.write()`<br/> 持续写入 | 较高，要维护连接、心跳、重连 |
| 请求语义 | 一次请求对应一次回答，很自然 | 需要自己设计 requestId / messageId |
| 连接生命周期 | 回答结束即可关闭 | 通常是长连接 |
| 断线恢复 | 相对简单，重新发请求即可 | 需要自己处理重连和状态恢复 |
| 典型场景 | AI Chat、摘要生成、代码生成、文本流式输出 | 实时语音、多人协作、游戏、实时控制 |
| OpenAI 对应场景 | Responses API 流式文本常用 SSE | Realtime API 支持 WebSocket / WebRTC |




> AI 普通文本对话更多使用 SSE 或 fetch streaming，而不是 WebSocket，核心原因是通信模型更匹配。普通 AI Chat 通常是用户发送一次问题，服务端持续返回模型生成的增量内容，前端逐段追加渲染，本质上是一次请求对应一次单向流式响应。SSE 正好适合服务端向客户端持续推送数据，而且它基于 HTTP，和现有的 fetch、鉴权、网关、日志、限流、超时控制都更容易结合。
>
> WebSocket 当然也可以实现 AI 流式输出，但它更适合真正的双向实时通信，比如实时语音对话、多人协作、在线游戏、客户端持续上传音频流、服务端持续返回音频流这类场景。WebSocket 需要维护长连接、心跳、重连、消息协议、请求和响应的对应关系，工程复杂度比 SSE 高。对于普通文本生成来说，这些能力通常用不上，所以 SSE 更轻量。
>
> 结合 OpenAI 来看，普通 Responses API 的流式输出是通过 `stream: true` 使用 server-sent events 增量返回；而 Realtime API 才更偏 WebSocket、WebRTC 这类低延迟双向通信。所以可以总结为：文本 AI Chat 优先用 SSE / fetch stream，实时语音或强双向交互场景再考虑 WebSocket 或 WebRTC。
>

