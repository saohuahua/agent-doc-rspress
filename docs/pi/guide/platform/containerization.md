---
title: 容器化
description: Gondolin micro-VM、Docker、OpenShell 三种隔离模式的边界与选型
---

# 容器化

Pi 默认以你的全部权限运行。想控制它能写哪些目录、能访问什么，**只能靠 OS 或虚拟化边界**——[安全模型](../getting-started/security) 里解释了为什么不做内置沙箱。

这一篇讲三种可选的隔离方案，以及它们分别隔离了什么。

## 1. 两种思路

```
思路 A：整个 pi 进程放进隔离环境
        ┌──────────────────────────┐
        │  容器 / 沙箱              │
        │    pi 进程                │
        │    内置工具 · ! 命令       │
        │    扩展工具               │
        │    API Key ← 进到里面      │
        └──────────────────────────┘

思路 B：pi 跑在宿主，把工具执行路由进隔离环境
        ┌────────────┐      ┌──────────────────┐
        │ 宿主        │      │  micro-VM         │
        │  pi 进程    │ ───→ │   read/write/edit │
        │  认证信息   │      │   bash/grep/find  │
        │            │      │   /workspace      │
        └────────────┘      └──────────────────┘
```

## 2. 选型表

| 方案 | 隔离对象 | 适合 | 注意 |
|---|---|---|---|
| **Gondolin 扩展** | 内置工具与 `!` 命令 | 想要本地 micro-VM 隔离，但认证留在宿主 | 见 `examples/extensions/gondolin/` |
| **Docker** | 整个 `pi` 进程 | 最简单的本地隔离 | **Provider API Key 会进到容器里** |
| **OpenShell** | 整个 `pi` 进程，策略受控 | 本地或远程托管沙箱 | 需要 OpenShell 网关 |

:::danger 扩展跑在 pi 进程所在的地方

如果你用思路 B（宿主跑 pi + 工具路由扩展），**其他自定义扩展工具仍然在宿主上执行**，除非它们自己也做了委托。

这是最容易产生错误安全感的地方：以为"工具都进 VM 了"，实际上第三方扩展注册的工具还在宿主裸跑。

:::

## 3. Gondolin：本地 micro-VM

[Gondolin](https://github.com/earendil-works/gondolin) 是一个本地 Linux micro-VM。用官方示例扩展可以让 pi 留在宿主、内置工具全部进 VM。

```bash title="安装"
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

```bash title="在要挂载的项目里运行"
cd /path/to/project
pi -e ~/.pi/agent/extensions/gondolin
```

行为：

| 项 | 说明 |
|---|---|
| 挂载 | 宿主 cwd 挂到 VM 的 `/workspace` |
| 覆盖的工具 | `read`、`write`、`edit`、`bash`、`grep`、`find`、`ls` |
| `!` 命令 | 也路由进 VM |
| 写回 | `/workspace` 下的文件变更**写穿到宿主** |

环境要求：`@earendil-works/gondolin` 需要 **Node.js >= 23.6.0**，另需 QEMU（自行用包管理器安装）。

:::warning 写穿意味着宿主文件仍会被改

Gondolin 隔离的是**执行环境**，不是你的工作区文件。VM 里对 `/workspace` 的写入会直接落到宿主。

它防的是"跑飞的命令搞坏系统其他部分"，不是"改坏你的项目"——后者仍然要靠 git。

:::

## 4. Docker：整个进程

```dockerfile title="Dockerfile.pi"
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

```bash title="构建与运行"
docker build -t pi-sandbox -f Dockerfile.pi .

docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

两个挂载各自的含义：

| 挂载 | 效果 |
|---|---|
| `-v "$PWD:/workspace"` | 当前目录进容器；容器内读写**直接影响宿主文件** |
| `-v pi-agent-home:/root/.pi/agent` | 用**命名卷**保存容器内的设置和会话 |

:::danger 不要随手挂宿主的 `~/.pi/agent`

挂了它，容器就能看到**宿主的认证文件和全部历史会话**。

想要容器内独立的设置和会话，用上面那样的命名卷。

:::

## 5. OpenShell：策略受控沙箱

[NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview) 提供文件系统、进程、网络、凭据、推理五个维度的策略控制。它可以通过本地网关（Docker / Podman / VM 运行时）或远程 Kubernetes 网关运行沙箱。

```bash title="每个沙箱都需要一个活动网关"
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

```bash title="在沙箱里启动 pi"
openshell sandbox create --name pi-sandbox --from pi -- pi
```

这种模式下整个 `pi` 进程在沙箱里，内置工具、`!` 命令、扩展工具**全部**在 OpenShell 边界内执行。

:::warning 远程网关不会 bind-mount 宿主文件

沙箱里的写入**不会**反映到你的机器上。要么在沙箱内 clone 仓库，要么用文件传输命令：

```bash
openshell sandbox upload pi-sandbox ./repo /workspace
openshell sandbox download pi-sandbox /workspace/repo ./repo-out
```

:::

:::tip OpenShell 的一个独特能力：Key 不进沙箱

配置了推理路由后，沙箱内的代码调 `https://inference.local`，由网关向上游注入真正的 Provider 凭据。

这是三种方案里唯一能做到**原始 API Key 不进入隔离环境**的。把 Pi 配成对应的 OpenAI 兼容或 Anthropic 兼容端点即可。

:::

## 6. 三者对比

| 维度 | Gondolin | Docker | OpenShell |
|---|---|---|---|
| 隔离范围 | 内置工具 + `!` | 整个进程 | 整个进程 |
| 扩展工具是否被隔离 | ❌ 仍在宿主 | ✅ | ✅ |
| API Key 位置 | 宿主 | **容器内** | 可留在网关外 |
| 工作区写回宿主 | ✅ 写穿 | ✅ 按挂载 | 本地网关可以；远程不行 |
| 额外依赖 | Node ≥ 23.6 + QEMU | Docker | OpenShell 网关 |
| 上手成本 | 中 | 低 | 高 |

## 7. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 两种思路 | 进程进沙箱 vs 工具路由进沙箱 |
| Gondolin | 认证留宿主，但扩展工具不受保护 |
| Docker | 最简单，代价是 Key 进容器 |
| OpenShell | 唯一能把 Key 留在边界外的 |
| 共同前提 | 读写挂载下宿主文件仍会被改，git 依然是必需的 |

:::info 对本文档项目的意义

上游**已经**提供了这三条隔离路径（外加 `examples/extensions/sandbox/` 走 `@anthropic-ai/sandbox-runtime`：macOS 用 sandbox-exec，Linux 用 bubblewrap）。

所以"实现 Sandbox"不是差异化点，**说清楚四者的边界**才是。见交接文档 §15。

:::

## 下一步

→ [终端设置](./terminal-setup) — 各终端的按键、鼠标与图片支持差异
