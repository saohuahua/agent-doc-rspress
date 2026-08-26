---
title: Providers
description: 订阅登录、API Key、云厂商配置与凭据解析顺序
---

# Providers

Pi 不绑定任何一家模型厂商。它支持两类认证：**订阅制走 OAuth**，**API Key 走环境变量或凭据文件**。

这一篇解决三个问题：我该用哪种认证、Key 放在哪、多个来源冲突时听谁的。

## 1. 全景图

```
┌─────────────────────────────────────────────────────────┐
│ 凭据来源（优先级从高到低）                                  │
│                                                         │
│  1. CLI  --api-key                                      │
│  2. ~/.pi/agent/auth.json   ← API Key 或 OAuth token     │
│  3. 环境变量                 ← ANTHROPIC_API_KEY 等       │
│  4. models.json 里的自定义 provider key                   │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 模型目录                                                  │
│                                                         │
│  内置 catalog（随 pi 发布）                                │
│    + 已配置 provider 拉取的新 catalog                      │
│    → 缓存到 ~/.pi/agent/models-store.json（供离线使用）     │
└─────────────────────────────────────────────────────────┘
```

## 2. 订阅登录

在交互模式运行 `/login`，然后选 Provider：

| Provider | 说明 |
|---|---|
| ChatGPT Plus/Pro (Codex) | 需要 ChatGPT Plus 或 Pro 订阅；OpenAI 官方认可（[Codex for OSS](https://developers.openai.com/community/codex-for-oss)） |
| Claude Pro/Max | 第三方 harness 的用量走 [extra usage](https://claude.ai/settings/usage) **按 token 计费**，不占 Claude 套餐额度 |
| GitHub Copilot | 回车走 github.com，或输入 GHES 域名 |
| xAI (Grok/X 订阅) | `/login xai` → 选 **Use a subscription** |
| OpenRouter | OAuth 换发一个用户自持的 API Key，从 OpenRouter 余额扣费 |
| Radius | 动态 `pi-messages` 网关 |

`/logout` 清除凭据。Token 存在 `~/.pi/agent/auth.json`，过期自动刷新。OpenRouter 是例外——它铸造的是不会自动过期的用户 API Key。

:::warning Claude Pro/Max 的计费容易误解

用第三方 harness（也就是 Pi）不是"套餐内白嫖"，走的是 extra usage，**按 token 另算钱**。

:::

:::tip 无浏览器环境（SSH / 远程机）

OpenRouter 的 PKCE 回调打不到 loopback。此时把最终的重定向 URL（或授权码）粘贴进登录提示框即可。

:::

## 3. API Key

用 `/login` 选一个 API Key 类型的 Provider 存进 `auth.json`，或者直接设环境变量：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

### 环境变量与 auth.json 键名对照

| Provider | 环境变量 | `auth.json` 键 |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic` |
| OpenAI | `OPENAI_API_KEY` | `openai` |
| Google Gemini | `GEMINI_API_KEY` | `google` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek` |
| xAI | `XAI_API_KEY` | `xai` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` |
| Mistral | `MISTRAL_API_KEY` | `mistral` |
| Groq | `GROQ_API_KEY` | `groq` |
| Cerebras | `CEREBRAS_API_KEY` | `cerebras` |
| NVIDIA NIM | `NVIDIA_API_KEY` | `nvidia` |
| Ant Ling | `ANT_LING_API_KEY` | `ant-ling` |
| Amazon Bedrock | `AWS_BEARER_TOKEN_BEDROCK` | `amazon-bedrock` |
| Azure OpenAI Responses | `AZURE_OPENAI_API_KEY` | `azure-openai-responses` |
| Cloudflare AI Gateway | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_GATEWAY_ID` | `cloudflare-ai-gateway` |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` | `cloudflare-workers-ai` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` |
| Hugging Face | `HF_TOKEN` | `huggingface` |
| Fireworks | `FIREWORKS_API_KEY` | `fireworks` |
| Together AI | `TOGETHER_API_KEY` | `together` |
| Baseten | `BASETEN_API_KEY` | `baseten` |
| OpenCode Zen | `OPENCODE_API_KEY` | `opencode` |
| OpenCode Go | `OPENCODE_API_KEY` | `opencode-go` |
| Radius | `RADIUS_API_KEY` | `radius` |
| ZAI Coding Plan（全球） | `ZAI_API_KEY` | `zai` |
| ZAI Coding Plan（中国） | `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` |
| Kimi For Coding | `KIMI_API_KEY` | `kimi-coding` |
| MiniMax | `MINIMAX_API_KEY` | `minimax` |
| MiniMax（中国） | `MINIMAX_CN_API_KEY` | `minimax-cn` |
| Qwen Token Plan（现有目录） | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan` |
| Qwen Token Plan（个人版） | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan-individual` |
| Qwen Token Plan（中国） | `QWEN_TOKEN_PLAN_CN_API_KEY` | `qwen-token-plan-cn` |
| Xiaomi MiMo | `XIAOMI_API_KEY` | `xiaomi` |
| Xiaomi MiMo Token Plan（中国） | `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` |
| Xiaomi MiMo Token Plan（阿姆斯特丹） | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` |
| Xiaomi MiMo Token Plan（新加坡） | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` |

权威来源是源码里的 `envMap`：`packages/ai/src/env-api-keys.ts`。表格可能随版本变化，以源码为准。

:::info 国内可用的 Provider

上表里 ZAI（智谱）、Kimi For Coding、MiniMax、Qwen Token Plan、Xiaomi MiMo 都有中国区入口，且都是 API Key 直连——对国内用户来说这是最省事的路径。

:::

## 4. auth.json

凭据文件在 `~/.pi/agent/auth.json`：

```json title="~/.pi/agent/auth.json"
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "openai": { "type": "api_key", "key": "sk-..." },
  "google": { "type": "api_key", "key": "..." },
  "deepseek": { "type": "api_key", "key": "sk-..." }
}
```

文件以 `0600` 权限创建（仅本人读写）。**auth.json 的优先级高于环境变量。**

### Provider 级环境变量

API Key 凭据可以带一个 `env` 对象。这些值在解析凭据、provider/model 请求头、以及 provider 配置（Cloudflare account id、Azure 设置、Vertex project/location、Bedrock 设置、`PI_CACHE_RETENTION`、`HTTP_PROXY`/`HTTPS_PROXY`）时，**优先于进程环境变量**：

```json title="给单个 provider 挂专属环境" {5-9}
{
  "cloudflare-ai-gateway": {
    "type": "api_key",
    "key": "$CLOUDFLARE_API_KEY",
    "env": {
      "CLOUDFLARE_API_KEY": "...",
      "CLOUDFLARE_ACCOUNT_ID": "account-id",
      "CLOUDFLARE_GATEWAY_ID": "gateway-id"
    }
  }
}
```

当你希望 Pi 用一套和项目 shell 不同的 provider 配置时，用这个。

### key 字段的四种写法

`key` 支持命令执行、环境变量插值和字面量：

| 写法 | 规则 | 例子 |
|---|---|---|
| **Shell 命令** | 以 `!` 开头，整个值作为命令执行，取 stdout（进程内缓存） | `"!op read 'op://vault/item/credential'"` |
| **环境插值** | `$VAR` 或 `${VAR}`，可嵌在更长的字面量里 | `"${KEY_PREFIX}_${KEY_SUFFIX}"` |
| **转义** | `$$` 表示字面量 `$`；`$!` 表示字面量 `!` 且不触发命令 | `"$$literal-dollar-prefix"` |
| **字面量** | 直接使用。纯大写字符串如 `MY_API_KEY` 是字面量，不是变量 | `"sk-ant-..."` |

```json title="从系统钥匙串取 Key，避免明文落盘"
{ "type": "api_key", "key": "!security find-generic-password -ws 'anthropic'" }
```

:::warning 两个易踩的坑

1. `$FOO_BAR` 解析的是变量 `FOO_BAR`。如果 `BAR` 是字面文本，要写成 `${FOO}_BAR`。
2. 环境变量不存在时，值会保持"未解析"状态而不是变成空串。

:::

OAuth 凭据在 `/login` 后也存在这个文件里，自动管理。

## 5. 云厂商

### Azure OpenAI

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# 也支持 cognitiveservices.azure.com / openai.azure.com
# 根端点会自动规范化到 /openai/v1
# 或者用资源名代替 base url
export AZURE_OPENAI_RESOURCE_NAME=your-resource

# 可选
export AZURE_OPENAI_API_VERSION=2024-02-01
export AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-4=my-gpt4,gpt-4o=my-gpt4o
```

### Amazon Bedrock

用 `/login amazon-bedrock` 存 Bedrock API Key，或者用下面任意一种 AWS 凭据源：

```bash
# 方式 1：AWS Profile
export AWS_PROFILE=your-profile

# 方式 2：IAM Keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# 方式 3：Bearer Token
export AWS_BEARER_TOKEN_BEDROCK=...

# 可选 region，默认 us-east-1
export AWS_REGION=us-west-2
```

也支持 ECS task role（`AWS_CONTAINER_CREDENTIALS_*`）和 IRSA（`AWS_WEB_IDENTITY_TOKEN_FILE`）。

```bash
pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

对于 ID 中含可识别模型名的 Claude 模型（基础模型和系统推理配置），prompt caching 自动开启。**application inference profile 的 ARN 不含模型名**，需要显式打开：

```bash
export AWS_BEDROCK_FORCE_CACHE=1
```

连 Bedrock 代理时可用：

| 环境变量 | 作用 |
|---|---|
| `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` | 代理地址（AWS SDK 标准变量） |
| `AWS_BEDROCK_SKIP_AUTH=1` | 代理不需要认证时设置 |
| `AWS_BEDROCK_FORCE_HTTP1=1` | 代理只支持 HTTP/1.1 时设置 |

### Cloudflare AI Gateway

```bash
export CLOUDFLARE_API_KEY=...           # 也可以用 /login
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...        # 在 dash.cloudflare.com → AI → AI Gateway 创建
pi --provider cloudflare-ai-gateway --model "claude-sonnet-4-5"
```

它可以路由到 OpenAI、Anthropic 和 Workers AI：Workers AI 走统一 API（`/compat`）和带前缀的模型 ID（`workers-ai/@cf/...`）；OpenAI 走 `/openai` 直通路由和原生模型 ID；Anthropic 走 `/anthropic` 直通路由和原生模型 ID。

网关认证用 `CLOUDFLARE_API_KEY` 作为 `cf-aig-authorization`，上游认证有四种模式：

| 模式 | 请求认证 | 上游认证 |
|---|---|---|
| Workers AI | 仅 Cloudflare token | Cloudflare 原生 |
| 统一计费 | 仅 Cloudflare token | Cloudflare 处理上游认证并扣 credits |
| Stored BYOK | 仅 Cloudflare token | Cloudflare 注入在控制台存的 provider key |
| Inline BYOK | Cloudflare token + 上游 `Authorization` 头 | 请求自带上游 key |

普通使用优先选统一计费或 Stored BYOK。Inline BYOK 需要额外配置上游 `Authorization` 头（比如通过 `models.json` 的 provider/model override）。

### Cloudflare Workers AI

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
pi --provider cloudflare-workers-ai --model "@cf/moonshotai/kimi-k2.6"
```

Pi 会自动设置 `x-session-affinity` 以获得前缀缓存折扣。

### Google Vertex AI

用 Application Default Credentials：

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1
```

也可以把 `GOOGLE_APPLICATION_CREDENTIALS` 指向 service account key 文件。

## 6. 本地模型

### llama.cpp

Pi 支持 llama.cpp 的 router server：`/login llama.cpp` 配置，`/llama` 管理已加载模型，`/model` 选择。

### 其他本地推理

Ollama、LM Studio、vLLM 以及任何说得通支持 API 的服务（OpenAI Completions、OpenAI Responses、Anthropic Messages、Google Generative AI），都可以通过 `models.json` 声明为自定义 Provider。

需要自定义 API 实现或 OAuth 流程的，则要写扩展——官方示例见 `examples/extensions/custom-provider-gitlab-duo/`。

## 7. 凭据解析顺序

:::tip 冲突时听谁的

1. CLI 的 `--api-key`
2. `auth.json` 条目（API Key 或 OAuth token）
3. 环境变量
4. `models.json` 里的自定义 provider key

**记住第 2 条高于第 3 条**：如果你 `export` 了新 Key 却发现 Pi 还在用旧的，多半是 `auth.json` 里有一条老记录压着。

:::

## 8. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 两类认证 | 订阅走 `/login` OAuth，API Key 走环境变量或 auth.json |
| 凭据位置 | `~/.pi/agent/auth.json`，0600 权限，优先于环境变量 |
| 不落明文 | `key` 支持 `!command`，可从钥匙串/1Password 读 |
| 模型目录 | 内置 + 动态刷新，缓存在 `models-store.json` 供离线用 |
| Claude 订阅 | 第三方 harness 走 extra usage，按 token 计费 |

## 下一步

→ [安全模型](./security) — Pi 默认允许模型做什么，边界在哪里，以及为什么"权限提示"不等于"沙箱"
