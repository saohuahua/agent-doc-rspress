import * as path from 'node:path';
import * as fs from 'node:fs';
import { defineConfig } from 'rspress/config';
import { pluginMermaid } from './mermaid-plugin';

// 面经侧栏由 scripts/sync-interview.mjs 生成（条目文本取自源文件 H1）
const interviewSidebarFile = path.join(__dirname, 'docs/interview/_sidebar.json');
const interviewSidebar = fs.existsSync(interviewSidebarFile)
  ? JSON.parse(fs.readFileSync(interviewSidebarFile, 'utf8'))
  : [];

export default defineConfig({
  base: '/agent-doc-rspress/',
  plugins: [pluginMermaid()],
  markdown: {
    mdxRs: false,
  },
  root: path.join(__dirname, 'docs'),
  lang: 'zh',
  title: 'Agent 笔记',
  description: 'Agent 学习与 Pi 源码解析 · 面经八股速查',
  logoText: 'Agent 笔记',
  themeConfig: {
    nav: [
      { text: '首页', link: '/', activeMatch: '^/$' },
      { text: 'Learn Agent', link: '/learn/', activeMatch: '/learn/' },
      { text: 'Pi 指南', link: '/pi/guide/', activeMatch: '/pi/guide/' },
      { text: 'Pi 原理', link: '/pi/principle/', activeMatch: '/pi/principle/' },
      { text: '实验室', link: '/pi/lab/', activeMatch: '/pi/lab/' },
      { text: '面经', link: '/interview/', activeMatch: '/interview/' },
      { text: '使用记录', link: '/practice/', activeMatch: '/practice/' },
    ],
    sidebar: {
      '/learn/': [
        {
          text: 'Learn Agent',
          items: [
            { text: '学习路线', link: '/learn/' },
            { text: '01 普通聊天 vs Agent', link: '/learn/01-what-is-agent' },
            { text: '02 最小 Agent Loop', link: '/learn/02-minimal-loop' },
            { text: '03 工具的定义与执行', link: '/learn/03-tool-basics' },
            { text: '04 消息、角色与上下文窗口', link: '/learn/04-message-and-context' },
            { text: '05 流式输出与事件', link: '/learn/05-streaming-and-events' },
            { text: '06 多轮交互与用户插队', link: '/learn/06-multi-turn' },
            { text: '07 副作用与安全边界', link: '/learn/07-side-effects-and-safety' },
            { text: '08 会话保存与恢复', link: '/learn/08-session-and-persistence' },
          ],
        },
      ],
      '/pi/guide/': [
        {
          text: '使用指南',
          items: [
            { text: '概述', link: '/pi/guide/' },
          ],
        },
        {
          text: '从这里开始',
          items: [
            { text: '快速开始', link: '/pi/guide/getting-started/quickstart' },
            { text: '使用 Pi', link: '/pi/guide/getting-started/usage' },
            { text: 'Providers', link: '/pi/guide/getting-started/providers' },
            { text: '安全模型', link: '/pi/guide/getting-started/security' },
            { text: '设置', link: '/pi/guide/getting-started/settings' },
            { text: '快捷键', link: '/pi/guide/getting-started/keybindings' },
            { text: '会话管理', link: '/pi/guide/getting-started/sessions' },
            { text: '上下文压缩', link: '/pi/guide/getting-started/compaction' },
          ],
        },
        {
          text: '自定义',
          items: [
            { text: '自定义速查', link: '/pi/guide/customization' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: '会话文件格式', link: '/pi/guide/reference/session-format' },
            { text: '环境变量', link: '/pi/guide/reference/environment-variables' },
          ],
        },
        {
          text: '编程式使用',
          items: [
            { text: 'SDK', link: '/pi/guide/programmatic/sdk' },
            { text: 'RPC 模式', link: '/pi/guide/programmatic/rpc' },
            { text: 'JSON 模式', link: '/pi/guide/programmatic/json' },
            { text: 'TUI 组件', link: '/pi/guide/programmatic/tui' },
          ],
        },
        {
          text: '平台',
          items: [
            { text: 'Windows', link: '/pi/guide/platform/windows' },
            { text: '容器化', link: '/pi/guide/platform/containerization' },
            { text: '终端设置', link: '/pi/guide/platform/terminal-setup' },
            { text: 'Shell 别名', link: '/pi/guide/platform/shell-aliases' },
          ],
        },
      ],
      '/pi/principle/': [
        {
          text: 'Pi 原理',
          items: [
            { text: '总览与阅读路线', link: '/pi/principle/' },
            { text: '01 总体架构与设计哲学', link: '/pi/principle/01-architecture' },
            {
              text: '02 输入如何进入 Agent',
              link: '/pi/principle/02-message-journey/',
              collapsed: false,
              items: [
                { text: '02.1 输入管线', link: '/pi/principle/02-message-journey/gates' },
                { text: '02.2 从领域消息到 Provider Payload', link: '/pi/principle/02-message-journey/assembly' },
              ],
            },
            {
              text: '03 Agent 如何持续工作并最终停止',
              link: '/pi/principle/03-agent-loop/',
              collapsed: false,
              items: [
                { text: '03.1 从最小循环到生产循环', link: '/pi/principle/03-agent-loop/loop' },
                { text: '03.2 停止、续跑与无人值守预算', link: '/pi/principle/03-agent-loop/termination' },
              ],
            },
            {
              text: '04 工具怎么被安全地执行',
              link: '/pi/principle/04-tool-system/',
              collapsed: false,
              items: [
                { text: '04.1 参数怎么进来', link: '/pi/principle/04-tool-system/contract' },
                { text: '04.2 结果怎么回去', link: '/pi/principle/04-tool-system/execution' },
                { text: '04.3 内置工具的容错与截断', link: '/pi/principle/04-tool-system/builtins' },
              ],
            },
            { text: '09 扩展体系与能力边界', link: '/pi/principle/09-extension-system' },
          ],
        },
      ],
      '/pi/lab/': [
        {
          text: '实验室',
          items: [
            { text: '概述', link: '/pi/lab/' },
          ],
        },
      ],
      '/interview/': interviewSidebar,
      '/practice/': [
        {
          text: '使用记录',
          items: [
            { text: '总览与规则', link: '/practice/' },
            { text: '记录模板', link: '/practice/template' },
          ],
        },
        {
          text: '记录',
          items: [
            { text: '2026-08-26 环境基线', link: '/practice/2026-08-26-baseline' },
          ],
        },
      ],
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com',
      },
    ],
  },
});
