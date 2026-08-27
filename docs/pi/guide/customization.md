---
title: 自定义速查
description: Extension / Skill / Prompt Template / Theme / Package / 自定义模型 分别是什么，什么时候用哪个
---

# 自定义速查

Pi 的自定义手段有六种，很容易混。这一页只做一件事：**帮你在 30 秒内选对那一种**。

机制细节不在这里展开——扩展机制留给 [Pi 原理](/pi/principle/)，本页只讲定位和配置。

## 1. 先做选择

```
我想要的是……

  让模型多一个能调用的工具            → Extension（registerTool）
  在工具执行前拦一道                  → Extension（tool_call 事件）
  给模型一套"遇到 X 就按 Y 做"的说明书  → Skill
  给自己一个打字快捷方式              → Prompt Template
  换配色                             → Theme
  接一个 Pi 不认识的模型服务           → models.json 自定义 Provider
  把上面这些打包分享给别人             → Package
```

一句话区分最容易混的两个：

:::tip Skill 还是 Extension？

**Skill 是给模型看的文字**，Extension 是**在 Pi 进程里跑的代码**。

Skill 改变模型的"知道怎么做"，Extension 改变 Pi 的"允许做什么、做完怎么样"。

需要拦截、需要状态、需要 UI → Extension。只是流程说明和脚本用法 → Skill。

:::

## 2. 六种手段对比

| 手段 | 形态 | 谁在用它 | 需要项目信任 | 典型场景 |
|---|---|---|---|---|
| **Extension** | `.ts` / `.js` | Pi 运行时 | ✅ 项目级需要 | 自定义工具、权限门、Git checkpoint、自定义压缩 |
| **Skill** | `SKILL.md` + 附件 | 模型 | ✅ 项目级需要 | PDF 处理、Web 搜索、特定工作流 |
| **Prompt Template** | `.md` | 你（`/name` 展开） | ✅ 项目级需要 | `/review`、`/pr`、常用长 prompt |
| **Theme** | `.json` | TUI | ✅ 项目级需要 | 配色 |
| **Package** | npm / git / 本地路径 | 以上四种的容器 | ✅ | 分享与团队统一 |
| **自定义模型** | `models.json` | ModelRuntime | ❌ 全局 | Ollama、vLLM、LM Studio、代理 |

:::danger 三个都是"任意代码执行"

Extension 是任意 TypeScript；Skill 能指示模型执行任何动作、还能带可执行脚本；Package 两者都能装。

**装第三方的东西之前先读源码。** 见 [安全模型](./getting-started/security)。

:::

## 3. Extension

TypeScript 模块，能订阅生命周期事件、注册 LLM 可调用的工具、加命令、渲染 UI。

```typescript title="~/.pi/agent/extensions/my-extension.ts"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Dangerous!", "Allow rm -rf?");
      if (!ok) return { block: true, reason: "Blocked by user" };
    }
  });

  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone",
    parameters: Type.Object({ name: Type.String() }),
    execute: async (_id, { name }) => ({
      content: [{ type: "text", text: `Hello, ${name}!` }],
      details: {},
    }),
  });
}
```

**能力清单**

| 能力 | API |
|---|---|
| 自定义工具 | `pi.registerTool()` |
| 事件拦截（阻断/改写工具调用、注入上下文、自定义压缩） | `pi.on(...)` |
| 用户交互 | `ctx.ui.select/confirm/input/notify` |
| 自定义 TUI 组件 | `ctx.ui.custom()`，见 [TUI 组件](./programmatic/tui) |
| 自定义命令 | `pi.registerCommand()` |
| 会话持久化 | `pi.appendEntry()` |
| 自定义渲染 | `renderCall` / `renderResult` |

**位置**

| 位置 | 说明 |
|---|---|
| `~/.pi/agent/extensions/` | 全局，**支持 `/reload` 热重载** |
| `.pi/extensions/` | 项目级，需信任，支持热重载 |
| `pi -e ./path.ts` | 临时试用，**不支持热重载** |

:::warning `-e` 只适合快速试

放在自动发现目录里才能用 `/reload` 热重载。开发扩展时把它放进 `~/.pi/agent/extensions/`，改完 `/reload` 就生效，不用重启会话。

:::

## 4. Skill

自包含的能力包，模型**按需加载**。Pi 实现了 [Agent Skills 标准](https://agentskills.io/specification)。

```text title="目录结构"
my-skill/
├── SKILL.md              # 必需：frontmatter + 说明
├── scripts/process.sh    # 辅助脚本
├── references/api.md     # 按需加载的详细文档
└── assets/template.json
```

````markdown title="SKILL.md"
---
name: my-skill
description: What this skill does and when to use it. Be specific.
---

# My Skill

## Setup

```bash
cd /path/to/skill && npm install
```

## Usage

```bash
./scripts/process.sh <input>
```
````

### 它是怎么工作的

```
启动时  扫描 Skill 位置，只提取 name + description
   ↓
系统提示词  按标准以 XML 形式列出可用 Skill（只有描述）
   ↓
任务匹配时  模型用 read 加载完整 SKILL.md
   ↓
按说明执行  用相对路径引用脚本和资源
```

这叫**渐进披露**：常驻上下文的只有描述，完整说明按需加载。

:::warning 模型不总是会主动加载

官方明说 "models don't always do this"。想强制加载：在 prompt 里点名，或者直接用 `/skill:name`。

:::

### frontmatter 字段

| 字段 | 必需 | 说明 |
|---|---|---|
| `name` | ✅ | 最长 64 字符，小写字母/数字/连字符；不能有首尾连字符或连续连字符 |
| `description` | ✅ | 最长 1024 字符，**决定模型什么时候加载它** |
| `license` | — | 许可证名或指向捆绑文件 |
| `compatibility` | — | 最长 500 字符，环境要求 |
| `metadata` | — | 任意键值 |
| `allowed-tools` | — | 空格分隔的预批准工具（实验性） |
| `disable-model-invocation` | — | 为 `true` 时不出现在系统提示词，只能 `/skill:name` 调用 |

:::tip description 写好写坏差别巨大

```yaml
# 好
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents.

# 差
description: Helps with PDFs.
```

模型是靠这一句决定要不要加载的。

:::

### 位置与命令

| 类型 | 位置 |
|---|---|
| 全局 | `~/.pi/agent/skills/`、`~/.agents/skills/` |
| 项目（需信任） | `.pi/skills/`、cwd 及祖先目录的 `.agents/skills/`（到 git 仓库根为止） |
| 包 | `skills/` 目录或 `pi.skills` |
| 设置 | `skills` 数组 |
| CLI | `--skill <path>`，可重复，**即使有 `--no-skills` 也会加载** |

```bash
/skill:brave-search           # 加载并执行
/skill:pdf-tools extract      # 带参数，参数以 `User: <args>` 追加到内容后
```

### 复用其他 Harness 的 Skill

```json title="~/.pi/agent/settings.json"
{
  "skills": ["~/.claude/skills", "~/.codex/skills"]
}
```

Pi 对标准有一处**有意的宽松**：允许 skill 名与父目录名不一致——因为多个 harness 共用同一个 skill 目录时，那条规则并不合适。

## 5. Prompt Template

展开成完整 prompt 的 Markdown 片段。文件名就是命令名：`review.md` → `/review`。

```markdown title="~/.pi/agent/prompts/review.md"
---
description: Review staged git changes
argument-hint: "[scope]"
---
Review the staged changes (`git diff --cached`). Focus on:
- Bugs and logic errors
- Security issues
- Error handling gaps
```

### 参数语法

| 语法 | 含义 |
|---|---|
| `$1`、`$2` … | 位置参数 |
| `$@` / `$ARGUMENTS` | 全部参数拼接 |
| `${1:-default}` | 参数 1 存在且非空则用它，否则用默认值 |
| `${@:-default}` | 全部参数存在且非空则用，否则默认值 |
| `${@:N}` | 从第 N 个参数起（1 起算） |
| `${@:N:L}` | 从第 N 个起取 L 个 |

```bash
/review
/component Button                  # $1 = Button
/component Button "click handler"   # $@ = Button click handler
```

`argument-hint` 用 `<尖括号>` 表示必需、`[方括号]` 表示可选，会显示在自动补全里。

:::warning 模板发现不递归

`prompts/` 下的子目录**不会**被扫描。要用子目录，得在 `prompts` 设置或包清单里显式列出。

:::

## 6. Theme

定义 TUI 配色的 JSON 文件。内置 `dark` 和 `light`。

```json title="settings.json"
{ "theme": "my-theme" }
```

```bash title="只对本次运行生效"
pi --use-theme light
pi --use-theme light/dark   # 跟随终端明暗
```

首次运行时 Pi 会检测终端背景色，自动选 `dark` 或 `light`。

位置规则与 Skill 一致：全局 `~/.pi/agent/themes/*.json`，项目 `.pi/themes/*.json`（需信任），包 `themes/`，设置 `themes` 数组，CLI `--theme`。

## 7. Package

把上面四种打包，通过 npm 或 git 分享。

```bash title="安装与管理"
pi install npm:@foo/bar@1.0.0
pi install git:github.com/user/repo@v1
pi install ./relative/path/to/package
pi install npm:@foo/bar -l          # -l 写进项目设置

pi remove npm:@foo/bar
pi list
pi config                            # 启用/禁用包内单个资源
```

```bash title="不安装，只试一次"
pi -e npm:@foo/bar
```

### 三种来源

| 来源 | 写法 | 安装位置 |
|---|---|---|
| npm | `npm:@scope/pkg@1.2.3` | 用户 `~/.pi/agent/npm/`，项目 `.pi/npm/` |
| git | `git:github.com/user/repo@v1`、`ssh://git@…` | `~/.pi/agent/git/<host>/<path>` 或 `.pi/git/…` |
| 本地路径 | `/abs/path`、`./rel/path` | 不复制，直接引用 |

:::info 版本是钉死的

带版本的 npm spec 和 git 的 tag/commit ref **不会**被 `pi update --extensions` 移到新版本——它只会把已有 clone 对齐到配置的 ref。

要升级得显式 `pi install git:host/user/repo@new-ref`。

这个行为对供应链安全是好事：**升级必须是显式动作**。

:::

### 做一个包

```json title="package.json"
{
  "name": "my-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

没有 `pi` 清单时按约定目录自动发现：

| 目录 | 加载什么 |
|---|---|
| `extensions/` | `.ts` 和 `.js` |
| `skills/` | 递归找含 `SKILL.md` 的目录，加载顶层 `.md` |
| `prompts/` | `.md` |
| `themes/` | `.json` |

**依赖规则**：Pi 自带的这几个包必须放 `peerDependencies` 并用 `"*"`，不要打包进去——`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`、`@earendil-works/pi-tui`、`typebox`。其他 pi 包必须用 `bundledDependencies` 捆进 tarball。

### 只加载包里你审查过的部分

```json title="settings.json" {5-8}
{
  "packages": [
    "npm:simple-pkg",
    {
      "source": "npm:my-package",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"]
    }
  ]
}
```

| 写法 | 含义 |
|---|---|
| 省略某个键 | 加载该类型全部 |
| `[]` | 该类型一个都不加载 |
| `!pattern` | 排除匹配项 |
| `+path` / `-path` | 强制包含 / 排除精确路径 |

:::tip 审查第三方包的实用姿势

`"extensions": []` + 只列出你读过的 skill/prompt —— 这样可以用包里的说明文档，但**拒绝执行它的代码**。

:::

同一个包同时出现在全局和项目设置时，**项目条目胜出**；除非项目条目带 `autoload: false`，此时它作为增量叠加在全局条目上。

## 8. 自定义模型与 Provider

接 Ollama、vLLM、LM Studio 或任意兼容服务，走 `~/.pi/agent/models.json`：

```json title="~/.pi/agent/models.json"
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

支持的 API 类型：OpenAI Completions、OpenAI Responses、Anthropic Messages、Google Generative AI。

:::warning 本地服务也要有 apiKey 占位

Ollama 忽略 `apiKey`，但 Pi 仍然要求模型"有认证"才会出现在 `/model` 里。所以无密钥的本地服务要么留个假值，要么用 `/login` 存一个，要么选模型时 `--api-key`。

:::

:::tip `compat` 是兼容层的入口

`supportsDeveloperRole: false` 让 Pi 用 `system` 消息而不是 `developer` 角色发系统提示词；`supportsReasoningEffort: false` 关掉 `reasoning_effort` 参数。

Ollama、vLLM、SGLang 这类 OpenAI 兼容服务经常需要这两个。`compat` 可以写在 provider 级（对全部模型生效）或 model 级（覆盖单个模型）。

这套"把 provider 差异变成模型上的数据"的设计是 Pi 兼容层的核心，展开讨论见 [Pi 原理](/pi/principle/)。

:::

需要自定义 API 实现或 OAuth 流程时，只能写扩展——官方示例 `examples/extensions/custom-provider-gitlab-duo/`。

## 9. 加载优先级与开关

所有资源的发现都可以关掉，也可以精确指定：

| 类型 | 关闭发现 | 显式加载 |
|---|---|---|
| 扩展 | `--no-extensions` | `-e <source>` |
| Skill | `--no-skills` | `--skill <path>`（**仍会加载**） |
| Prompt 模板 | `--no-prompt-templates` | `--prompt-template <path>` |
| 主题 | `--no-themes` | `--theme <path>` |
| 上下文文件 | `--no-context-files` / `-nc` | — |

```bash title="只加载指定扩展，忽略所有已配置的"
pi --no-extensions -e ./my-extension.ts
```

用 `pi config` 可以交互式地启停已安装包和本地目录里的单个资源。它默认在全局设置里操作，按 Tab 切到项目级；`pi config -l` 直接从项目覆盖开始。

## 10. 本篇小结

| 选择 | 判据 |
|---|---|
| Extension | 需要代码、拦截、状态或 UI |
| Skill | 只是给模型的说明书 + 脚本 |
| Prompt Template | 只是给自己的打字快捷方式 |
| Theme | 只是配色 |
| Package | 要分享给别人或统一团队 |
| models.json | 要接 Pi 不认识的模型服务 |

安全底线：**三类东西都能执行任意代码，装之前先读源码，能只加载子集就不要全量加载。**

## 下一步

→ [会话文件格式](./reference/session-format) — 想写扩展往会话里存状态的话，先搞清楚 JSONL 的结构
