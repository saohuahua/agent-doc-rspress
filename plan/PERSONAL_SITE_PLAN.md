# saohuahua 个人站改版实施计划

将网站首页改成个人主页，让访客先认识 saohuahua，再浏览代表项目和精选文章。现有 Learn Agent、Pi 指南、Pi 原理、实验室、面经、力扣和使用记录集中在「技术笔记」栏目。

## 页面与访问路径

| 页面或区域 | 第一版内容 | 访问路径 |
| --- | --- | --- |
| 个人首页 | 简介、原创插画、代表项目、三篇精选文章 | `/` |
| 代表项目 | 「Agent 笔记」项目卡，简介说明它覆盖 Agent 基础、Pi 源码和实践记录 | 首页 `#projects`，主链接指向 `/notes/` |
| 技术笔记 | 分成「Agent 与 Pi」和「练习与记录」两组，每个系列显示名称和一句摘要 | `/notes/` |
| 文档详情 | 按系列阅读，继续使用现有侧栏、搜索、正文目录、代码高亮和 Mermaid 图 | 现有文档路径，例如 `/learn/` 和 `/pi/principle/` |
| GitHub | 唯一的个人社交入口，顶栏显示 GitHub 图标，提供可访问名称 | `https://github.com/saohuahua` |

顶栏左侧是站名 `saohuahua`，右侧依次为「首页」「技术笔记」、搜索、主题切换和 GitHub。首页的「查看项目」跳到同页项目区，项目卡的「浏览技术笔记」进入总览，再由总览进入具体系列。「技术笔记」在总览与文章详情页都显示为当前栏目。

### 首页文案

**标题**　你好，我是 saohuahua。

**简介**　我在研究 Agent 怎么运行，最近主要在读 Pi 的源码。我把读代码、做实验和学习中的发现整理成技术笔记，方便自己回顾，也分享给同样感兴趣的人。

**项目介绍**　Agent 笔记是一套中文技术笔记，从最小 Agent Loop 讲到 Pi 的用法、源码和扩展机制，也收录实验记录和练习。

首批精选文章建议用现有的三个入口，依次覆盖基础、运行过程和扩展机制。

1. 最小 Agent Loop → `/learn/02-minimal-loop`
2. 流式输出与事件 → `/learn/05-streaming-and-events`
3. 扩展体系与能力边界 → `/pi/principle/09-extension-system`

## 布局与视觉

- **首屏**用约 `1040px` 的内容宽度。桌面上左侧约 60% 放名字、两句简介和「查看项目」，右侧约 40% 放透明底插画，图片显示宽度约 `340–400px`。窄屏按简介、主按钮、插画的顺序堆叠，插画随屏宽缩小。
- **项目和文章**沿同一条左边线排列。代表项目用一张细边框卡片，精选文章用带分隔线的列表。标题、链接、项目区和技术笔记总览使用一致的字体层级、水平留白与键盘焦点样式。
- **字体和细节**采用系统无衬线字体。首页大标题桌面约 `52px`，手机约 `36px`，正文 `16–18px`。大面积纯色、细边线、适度留白与低圆角构成视觉基调。插画承担首页主要的装饰作用。

| 用途 | 浅色模式 | 深色模式 |
| --- | --- | --- |
| 页面背景 | `#FFFFFF` | `#141414` |
| 页面标题、正文和文字链接 | `#000000` | `#F5F5F5` |
| 次要文字 | `#555555` | `#B5B5B5` |
| 项目和文档辅助底色 | `#F7F7F7` | `#1E1E1E` |
| 分隔线与卡片边框 | `#E5E5E5` | `#383838` |
| 主按钮背景 / 文字 | `#000000` / `#FFFFFF` | `#F5F5F5` / `#141414` |

插画保留自身的灰蓝和纸张色。正文中的文字链接加下划线，交互状态同时用下划线、边框或焦点轮廓表达。浅色和深色各使用一套完整配色，图片用同一份透明底资产。

## 实施步骤

1. **接入个人首页。** 将 `docs/index.md` 替换为 `docs/index.mdx`，继续占用 `/`，使用 `pageType: custom` 并填写首页标题和描述。添加 `theme/PersonalHome.tsx` 与 `theme/personal-home.css` 承载首屏、项目和文章列表。首页图片使用已生成的 `docs/public/personal-site-hero.png`，标注宽高并等比缩放。发布前评估将 PNG 转成保留透明度的 WebP，减小首屏资源开销。
2. **建立技术笔记总览。** 新增 `docs/notes/index.md`，列出「Agent 与 Pi」下的 Learn Agent、Pi 指南、Pi 原理、实验室，以及「练习与记录」下的面经、力扣、使用记录。入口分别使用 `/learn/`、`/pi/guide/`、`/pi/principle/`、`/pi/lab/`、`/interview/`、`/leetcode/`、`/practice/`。首页的项目卡连到总览，精选文章直达正文。
3. **配置共享导航与主题。** 在 `rspress.config.ts` 更新 `title`、`description`、`logoText`、`themeConfig.nav` 和 `themeConfig.socialLinks`。为「技术笔记」配置 `activeMatch`，覆盖 `/notes/` 和现有文档系列。沿用 `theme/index.tsx` 的默认主题导出，在 `theme/styles.css` 用已核对的 `--rp-c-brand` 系列、`--rp-c-link`、背景、正文和边线变量统一共享样式。1.47.2 安装包的深色规则使用 `.dark`，实现按当前安装版本验证。首页布局样式写在首页组件作用域内。技术笔记继续使用现有的文档侧栏以及生成面经、力扣侧栏的脚本流程。
4. **检查部署和阅读体验。** 运行 `pnpm check:links` 和 `pnpm build`，用 `pnpm preview` 从 `/agent-doc-rspress/` 访问构建结果。React 组件里的内部路由和公共图片路径使用 Rspress 运行时 `withBase` 处理。链接脚本覆盖 Markdown 链接，首页 React 链接、页内锚点和图片额外做浏览器验证。

## 验收

- 桌面宽屏显示左右两栏。手机显示单栏，项目和文章条目清晰，无横向滚动。插画在两种主题下边缘清晰可见。
- 浅色主题以白底黑字为主，深色主题文字和按钮清晰。首页、总览和正文的导航、链接、分隔线与焦点样式一致。
- 可从首页进入项目区、技术笔记总览、三个精选文章及 GitHub。总览的七个系列入口可达，文章页的搜索、侧栏、目录、代码高亮和 Mermaid 能正常使用。
- 在 `/agent-doc-rspress/` 下检查首页及至少一篇旧文章的直接访问和刷新，确认图片、站内链接与导航选中状态正确。

## 参考与插画

- [Rspress 主题配置参考](https://rspress.rs/zh/api/config/config-theme) · [对应的 Rspress 1.x 主题配置](https://v1.rspress.rs/zh/api/config/config-theme)
- [Rspress CSS 变量参考](https://rspress.rs/zh/ui/vars) · [Rspress 1.x 自定义页面与样式](https://v1.rspress.rs/zh/guide/basic/custom-page)
- [透明底插画 PNG](../docs/public/personal-site-hero.png)，由内置图片生成工具生成，尺寸 `1254 × 1254`。

插画生成提示词

```text
Generate one original illustration for the right side of a Chinese developer's personal website hero, about reading source code and writing technical notes. A single cohesive editorial still life seen from a gentle three-quarter overhead angle: an open ivory notebook with hand-drawn ink-blue diagram nodes and a few abstract annotation strokes, a thin code-editor panel leaning behind it with only a handful of abstract monospace-like bars, and a slim dark-blue pen resting across one page. Refined print-editorial illustration with delicate pencil edges, a subtle dry-ink texture, sparse linework and soft matte shading. Palette: muted slate blue, warm ivory paper, graphite, with one restrained ochre pencil mark. The notebook and code panel form one compact, centered composition with generous transparent padding around every side; near-square framing, with a readable silhouette at 300–400 pixels wide and good contrast on both warm white and deep charcoal backgrounds. Genuine transparent background, no backdrop or rectangular canvas edge. No readable text, letters, logos, watermark, people or generic AI imagery. One image.
```
