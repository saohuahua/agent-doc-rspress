---
title: SDK
description: 在自己的 Node 程序里创建 AgentSession，配置模型、工具、扩展与会话
---

# SDK

SDK 让你在自己的程序里直接用 Pi 的 Agent 能力——不开子进程，同进程内创建 `AgentSession`。

典型用途：自建 UI（Web / 桌面 / 移动）、把 Agent 能力接进现有应用、做自动化流水线、写会派生子 Agent 的工具、程序化测试 Agent 行为。

:::info 该选 SDK 还是 RPC

| | SDK | [RPC 模式](./rpc) |
|---|---|---|
| 形态 | 同进程，直接调 TypeScript API | 子进程 + stdin/stdout JSONL |
| 适合 | Node/TS 应用 | 非 Node 语言、IDE 插件、要进程隔离 |
| 控制力 | 最全 | 受协议命令集限制 |

官方明确建议：**Node/TS 应用优先用 SDK**，不要为了图省事去 spawn 子进程。

:::

## 1. 最小可跑示例

```bash
npm install @earendil-works/pi-coding-agent
```

SDK 就在主包里，不需要单独装。

```typescript title="hello-agent.ts"
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime,
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("What files are in the current directory?");
```

三行核心：造 runtime → 造 session → 订阅事件后 prompt。

## 2. 两个层次：Session 和 Runtime

这是 SDK 里最容易踩的结构性坑。

```
┌─────────────────────────────────────────────────────────┐
│ AgentSessionRuntime          ← 会话可替换的那一层          │
│   newSession() / switchSession() / fork() / import...    │
│   替换后 runtime.session 变成新对象                        │
│   ┌───────────────────────────────────────────────────┐  │
│   │ AgentSession             ← 一次会话的生命周期        │  │
│   │   prompt / steer / followUp / subscribe            │  │
│   │   setModel / compact / navigateTree / abort        │  │
│   └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

| 需求 | 用哪个 |
|---|---|
| 单个会话，不需要切换 | `createAgentSession()` |
| 需要新建/切换/fork/导入会话，重建 cwd 相关状态 | `createAgentSessionRuntime()` |

内置的交互模式、print 模式、RPC 模式用的都是 runtime 这一层。

:::danger 替换会话后必须重新订阅

事件订阅是绑在**具体某个 `AgentSession`** 上的。`newSession()` / `switchSession()` / `fork()` / `importFromJsonl()` 之后，`runtime.session` 会变成新对象，旧订阅**不再收到事件**。

```typescript {6-8}
let session = runtime.session;
let unsubscribe = session.subscribe(() => {});

await runtime.newSession();

unsubscribe();
session = runtime.session;
unsubscribe = session.subscribe(() => {});
```

用了扩展的话，还要对新 session 再调一次 `runtime.session.bindExtensions(...)`。

:::

## 3. AgentSession 接口

```typescript title="核心 API"
interface AgentSession {
  // 发送 prompt 并等待完成
  prompt(text: string, options?: PromptOptions): Promise<void>;

  // 流式过程中排队消息
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;

  // 订阅事件，返回取消订阅函数
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;

  // 会话信息
  sessionFile: string | undefined;
  sessionId: string;

  // 模型控制
  setModel(model: Model): Promise<void>;
  setThinkingLevel(level: ThinkingLevel): void;
  cycleModel(): Promise<ModelCycleResult | undefined>;
  cycleThinkingLevel(): ThinkingLevel | undefined;

  // 状态
  agent: Agent;
  model: Model | undefined;
  thinkingLevel: ThinkingLevel;
  messages: AgentMessage[];
  isStreaming: boolean;

  // 当前会话文件内的原地树导航
  navigateTree(targetId: string, options?: {
    summarize?: boolean;
    customInstructions?: string;
    replaceInstructions?: boolean;
    label?: string;
  }): Promise<{ editorText?: string; cancelled: boolean }>;

  // 压缩
  compact(customInstructions?: string): Promise<CompactionResult>;
  abortCompaction(): void;

  abort(): Promise<void>;
  dispose(): void;
}
```

注意：**新建会话、恢复、fork、导入这些"换会话"的 API 不在 `AgentSession` 上**，在 `AgentSessionRuntime` 上。

## 4. prompt / steer / followUp

```typescript
interface PromptOptions {
  expandPromptTemplates?: boolean;
  images?: ImageContent[];
  streamingBehavior?: "steer" | "followUp";
  source?: InputSource;
  preflightResult?: (success: boolean) => void;
}
```

```typescript title="三种典型调用"
// 非流式状态下的普通提问
await session.prompt("What files are here?");

// 带图片
await session.prompt("What's in this image?", {
  images: [{ type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } }],
});

// 流式过程中：必须说明怎么排队
await session.prompt("Stop and do this instead", { streamingBehavior: "steer" });
await session.prompt("After you're done, also check X", { streamingBehavior: "followUp" });
```

:::warning 流式中不带 `streamingBehavior` 会抛错

要么直接用 `steer()` / `followUp()`，要么显式传这个选项。

:::

行为差异表：

| 输入类型 | 行为 |
|---|---|
| 扩展命令（`/mycommand`） | **立即执行**，即使在流式中；它自己通过 `pi.sendMessage()` 管理 LLM 交互 |
| 文件型 prompt 模板（`.md`） | 发送/排队前展开成内容 |
| Skill 命令（`/skill:name`） | 同上，先展开 |

`steer()` 和 `followUp()` 也会展开 prompt 模板，但**遇到扩展命令会报错**——扩展命令不能排队。

### `preflightResult` 的语义

每次 `prompt()` 调用触发一次，在 `prompt()` resolve **之前**触发：

| 值 | 含义 |
|---|---|
| `true` | prompt 被接受、已排队、或已立即处理完 |
| `false` | preflight 在接受之前就拒绝了 |

:::info 接受之后的失败不走这里

`prompt()` 只有在整个被接受的运行（含重试）结束后才 resolve。**接受之后发生的失败通过正常的事件和消息流上报**，不会再触发 `preflightResult(false)`。

做 UI 时容易在这里写出"永远转圈"的 bug。

:::

## 5. 事件

```typescript title="订阅事件"
session.subscribe((event) => {
  switch (event.type) {
    case "message_update":
      if (event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
      if (event.assistantMessageEvent.type === "thinking_delta") {
        // thinking 输出（开启 thinking 时）
      }
      break;

    case "tool_execution_start":
      console.log(`Tool: ${event.toolName}`);
      break;
    case "tool_execution_update":  // 流式工具输出
    case "tool_execution_end":     // event.isError 判断成败
      break;

    case "message_start":
    case "message_end":
      break;

    case "agent_start":
    case "agent_end":              // event.messages 是本次新增的消息
      break;

    case "turn_start":
    case "turn_end":               // event.message + event.toolResults
      break;

    case "queue_update":           // event.steering / event.followUp
    case "compaction_start":
    case "compaction_end":
    case "auto_retry_start":
    case "auto_retry_end":
    case "summarization_retry_scheduled":
    case "summarization_retry_attempt_start":
    case "summarization_retry_finished":
      break;
  }
});
```

事件层次对应 [Learn Agent 05](/learn/05-streaming-and-events) 讲的那套：agent → turn → message → tool。

## 6. Agent 与 AgentState

`Agent` 类（来自 `@earendil-works/pi-agent-core`）负责核心 LLM 交互，通过 `session.agent` 访问：

```typescript
const state = session.agent.state;

// state.messages          AgentMessage[]  对话历史
// state.model             Model           当前模型
// state.thinkingLevel     ThinkingLevel
// state.systemPrompt      string
// state.tools             AgentTool[]
// state.streamingMessage  当前半成品助手消息
// state.errorMessage      最近一次助手错误

// 替换消息（分支或恢复时有用）
session.agent.state.messages = messages; // 复制顶层数组

// 替换工具
session.agent.state.tools = tools;

// 等 Agent 空闲
await session.agent.waitForIdle();
```

## 7. 配置项

### 目录

```typescript
const { session } = await createAgentSession({
  cwd: process.cwd(),      // 默认
  agentDir: "~/.pi/agent", // 默认，会展开 ~
});
```

| 参数 | `DefaultResourceLoader` 用它找什么 |
|---|---|
| `cwd` | 项目扩展 `.pi/extensions/`、项目 Skill（`.pi/skills/` 与逐级向上的 `.agents/skills/`）、项目 prompts、上下文文件、会话目录命名 |
| `agentDir` | 全局扩展/Skill/prompts、全局 `AGENTS.md`、`settings.json`、`models.json`、`auth.json`、`sessions/` |

`.agents/skills/` 的向上查找会**在 git 仓库根停止**（不在仓库里则到文件系统根）。

:::warning 传了自定义 ResourceLoader 之后

`cwd` 和 `agentDir` **不再控制资源发现**，但仍然影响会话命名和工具的路径解析。

:::

### 模型

```typescript
import { getModel } from "@earendil-works/pi-ai";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();

// create() 会恢复缓存的模型目录，但默认不联网刷新
const refreshed = await ModelRuntime.create({
  allowModelNetwork: true,
  modelRefreshTimeoutMs: 15_000,
});

const opus = getModel("anthropic", "claude-opus-4-5");       // 内置模型
const custom = modelRuntime.getModel("my-provider", "my-model"); // 含 models.json 自定义模型
const available = await modelRuntime.getAvailable();          // 只返回认证可用的

const { session } = await createAgentSession({
  model: opus,
  thinkingLevel: "medium",
  scopedModels: [
    { model: opus, thinkingLevel: "high" },
    { model: haiku, thinkingLevel: "off" },
  ],
  modelRuntime,
});
```

不传 `model` 时的回退顺序：

1. 从会话恢复（如果是继续会话）
2. 设置里的默认值
3. 第一个可用模型

模型目录的网络策略：远程目录会持久化到 `~/.pi/agent/models-store.json`；**每个 Provider 四小时内最多刷新一次**，除非强制；`PI_OFFLINE` 会禁用模型相关网络访问。

```typescript title="强制立即刷新"
await modelRuntime.refresh({ allowNetwork: true, force: true, signal });
```

想和 CLI 的模型解析行为保持一致，用导出的解析器：

```typescript
import { resolveCliModel, resolveModelScopeWithDiagnostics } from "@earendil-works/pi-coding-agent";

const cliModel = resolveCliModel({ cliModel: "anthropic/claude-opus-4-5:high", modelRuntime });
if (cliModel.error) throw new Error(cliModel.error);

const { scopedModels, diagnostics } = await resolveModelScopeWithDiagnostics(
  ["anthropic/*:high", "gpt-5"],
  modelRuntime,
);
```

### 认证

`ModelRuntime` 的凭据解析优先级：

1. 运行时覆盖（`setRuntimeApiKey`，**不落盘**）
2. `auth.json` 里的凭据（API Key 或 OAuth token）
3. 环境变量
4. 回退解析器（`models.json` 里的自定义 provider key）

```typescript
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";

// 自定义凭据/模型文件位置
const customRuntime = await ModelRuntime.create({
  authPath: "/my/app/auth.json",
  modelsPath: "/my/app/models.json",
});

// 完全不落盘
const inMemory = await ModelRuntime.create({ credentials: new InMemoryCredentialStore() });

// 临时覆盖 Key
await modelRuntime.setRuntimeApiKey("anthropic", "sk-my-temp-key");
```

:::danger 凭据操作失败时不要盲目重试

`login()` / `logout()` / `setRuntimeApiKey()` / `removeRuntimeApiKey()` 在**本地一致性达成后**才 resolve，它们不等待远程目录刷新。

如果凭据已提交但本地同步失败，会抛出 `CredentialSynchronizationError`——**先看它的 `providerId`、`operation`、`credential`、`cause`**，而不是重复执行凭据变更。

另外：网络刷新失败或超时**不会**回滚已经成功的凭据操作。

:::

### 系统提示词

```typescript
import { createAgentSession, DefaultResourceLoader } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({
  systemPromptOverride: () => "You are a helpful assistant.",
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

### 工具

内置工具名：`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`。默认启用：`read`、`bash`、`edit`、`write`。

| 选项 | 效果 |
|---|---|
| `tools: [...]` | 白名单 |
| `noTools: "all"` | 禁用所有工具 |
| `noTools: "builtin"` | 禁用内置默认工具，保留扩展和自定义工具 |
| `excludeTools: [...]` | 在 `tools` 白名单生效之后再排除 |

```typescript title="只读模式"
const { session } = await createAgentSession({ tools: ["read", "grep", "find", "ls"] });
```

```typescript title="Windows 用 powershell"
const { session } = await createAgentSession({ tools: ["read", "powershell", "edit", "write"] });
```

:::tip `edit` 工具的两个返回字段

`details.diff` 是给 Pi TUI 显示用的；`details.patch` 是**标准 unified patch**，SDK 使用者应该用这个。

:::

传自定义 `cwd` 时，`createAgentSession()` 会为该 cwd 重新构建选中的内置工具：

```typescript {2,4}
const { session } = await createAgentSession({
  cwd: "/path/to/project",
  tools: ["read", "bash", "grep"],
  sessionManager: SessionManager.inMemory("/path/to/project"),
});
```

### 自定义工具

```typescript title="defineTool"
import { Type } from "typebox";
import { createAgentSession, defineTool } from "@earendil-works/pi-coding-agent";

const myTool = defineTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something useful",
  parameters: Type.Object({
    input: Type.String({ description: "Input value" }),
  }),
  execute: async (_toolCallId, params) => ({
    content: [{ type: "text", text: `Result: ${params.input}` }],
    details: {},
  }),
});

const { session } = await createAgentSession({ customTools: [myTool] });
```

:::warning 传了 `tools` 白名单就必须把自定义工具也写进去

例如 `tools: ["read", "bash", "my_tool"]`。否则自定义工具会被白名单挡掉。

:::

### 扩展

扩展由 `ResourceLoader` 加载。`DefaultResourceLoader` 会从 `~/.pi/agent/extensions/`、`.pi/extensions/` 和 `settings.json` 的扩展来源发现扩展。

```typescript title="额外路径 + 内联扩展"
const loader = new DefaultResourceLoader({
  additionalExtensionPaths: ["/path/to/my-extension.ts"],
  extensionFactories: [
    (pi) => {
      pi.on("agent_start", () => console.log("[inline] Agent starting"));
    },
  ],
});
await loader.reload();

const { session } = await createAgentSession({ resourceLoader: loader });
```

内联扩展默认显示成 `<inline:1>`、`<inline:2>`。想显示有意义的名字，包一层：

```typescript title="命名内联扩展" {4}
import type { InlineExtension } from "@earendil-works/pi-coding-agent";

const myProvider: InlineExtension = {
  name: "my-provider",
  factory: (pi) => {
    pi.on("agent_start", () => console.log("[my-provider] Agent starting"));
  },
};
```

扩展完整 API 见 Pi 仓库的 `docs/extensions.md`（3002 行，是扩展体系的唯一权威文档）。

## 8. ResourceLoader

```typescript
import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";

const loader = new DefaultResourceLoader({ cwd, agentDir: getAgentDir() });
await loader.reload();

const extensions = loader.getExtensions();
const skills = loader.getSkills();
const prompts = loader.getPrompts();
const themes = loader.getThemes();
const contextFiles = loader.getAgentsFiles().agentsFiles;
```

## 9. 返回值

```typescript
interface CreateAgentSessionResult {
  session: AgentSession;
  extensionsResult: LoadExtensionsResult;
  modelFallbackMessage?: string;  // 会话模型无法恢复时的警告
}

interface LoadExtensionsResult {
  extensions: Extension[];
  errors: Array<{ path: string; error: string }>;
  runtime: ExtensionRuntime;
}
```

:::tip 别忽略 `extensionsResult.errors`

扩展加载失败**不会**让 `createAgentSession()` 抛错，错误装在这个数组里。自建 UI 时记得把它显示出来，否则会出现"扩展装了但没生效且没人知道"。

:::

## 10. 完整示例

```typescript title="把上面所有配置项串起来"
import { getModel } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import {
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create({
  authPath: "/custom/agent/auth.json",
  modelsPath: "/custom/agent/models.json",
});
if (process.env.MY_KEY) {
  await modelRuntime.setRuntimeApiKey("anthropic", process.env.MY_KEY);
}

const statusTool = defineTool({
  name: "status",
  label: "Status",
  description: "Get system status",
  parameters: Type.Object({}),
  execute: async () => ({
    content: [{ type: "text", text: `Uptime: ${process.uptime()}s` }],
    details: {},
  }),
});

const model = getModel("anthropic", "claude-opus-4-5");
if (!model) throw new Error("Model not found");

const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: false },
  retry: { enabled: true, maxRetries: 2 },
});

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: "/custom/agent",
  settingsManager,
  systemPromptOverride: () => "You are a minimal assistant. Be concise.",
});
await loader.reload();

const { session } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: "/custom/agent",
  model,
  thinkingLevel: "off",
  modelRuntime,
  tools: ["read", "bash", "status"],
  customTools: [statusTool],
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
  settingsManager,
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("Get status and list files.");
```

## 11. 运行模式复用

SDK 还导出了三个现成的运行模式，可以直接搭在 `createAgentSession()` 之上：

| 导出 | 作用 |
|---|---|
| `InteractiveMode` | 完整 TUI 交互模式：编辑器、对话历史、全部内置命令 |
| `runPrintMode` | 等价于 `pi -p` |
| `runRpcMode` | 等价于 `pi --mode rpc` |

它们都接受 `AgentSessionRuntime`，所以要先用 `createAgentSessionRuntime()` 造 runtime。

## 12. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 两层结构 | 单会话用 `createAgentSession()`，要换会话用 `createAgentSessionRuntime()` |
| 换会话 | `runtime.session` 变对象，**必须重新订阅、重新 bindExtensions** |
| 流式中提问 | 必须指定 `streamingBehavior`，否则抛错 |
| preflight | `preflightResult(true)` 只表示"被接受"，后续失败走事件流 |
| 凭据 | 出 `CredentialSynchronizationError` 时看字段，别盲目重试 |
| 扩展错误 | 在 `extensionsResult.errors` 里，不抛异常 |

:::info 官方文档

本页覆盖了 SDK 的主干。Skill、上下文文件、斜杠命令、会话管理、设置管理、完整 Exports 列表见官方 [SDK 文档](https://pi-doc.com/docs/latest/sdk)（对应仓库 `packages/coding-agent/docs/sdk.md`），以及 `examples/sdk/` 下从最小到完整控制的一系列示例。

:::

## 下一步

→ [RPC 模式](./rpc) — 非 Node 语言怎么接，以及那个必须知道的 `readline` 陷阱
