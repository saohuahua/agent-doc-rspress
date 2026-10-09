#!/usr/bin/env node
/**
 * 从本地 interview 仓库同步面经内容到 docs/interview/
 *
 * - 覆盖式同步：agent/ frontend/ coding/ 三个子目录中「由本脚本生成的文件」
 *   每次重新生成；curated 文件（frontend/js-*.md 三篇拆分稿、vue.md）和手写
 *   docs/interview/index.md 不受影响
 * - 源文件内容一字不改（只做站点侧转换）：中文文件名 -> 英文 slug，
 *   文内指向源文件名的交叉引用链接同步改写为新 slug，
 *   页面一级标题替换为 TITLES 里整理的干净标题
 * - 生成 docs/interview/_sidebar.json：侧栏配置，条目文本取自 TITLES，
 *   由 rspress.config.ts 读取挂到 '/interview/' 下
 * - 排除：agent.json（简历，含隐私）、空文件、未映射的 md 文件、
 *   研究/调研/计划类文档（详见 KNOWN_SKIP），以及已拆分的面经/Javascript.md
 *
 * 用法：
 *   node scripts/sync-interview.mjs
 *   node scripts/sync-interview.mjs D:/project/interview
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTERVIEW_ROOT = process.argv[2] || path.resolve(__dirname, "../../interview");
const DEST_ROOT = path.join(__dirname, "../docs/interview");

/** 目录映射：源目录（相对 interview 仓库） -> 站点子目录 -> 文件名 slug 映射 */
const SECTIONS = [
  {
    src: "agent 相关/agent面经",
    dest: "agent",
    group: "Agent 面经",
    files: {
      "00-Agent基础概念.md": "00-agent-basics.md",
      "01-Agent Runtime与架构.md": "01-agent-runtime-architecture.md",
      "02-LangChain与LangGraph.md": "02-langchain-langgraph.md",
      "02-Memory与Context工程.md": "02-memory-and-context.md",
      "03-Skill相关.md": "03-skills.md",
      "05-RAG相关.md": "05-rag.md",
      "06-MCP相关.md": "06-mcp.md",
      "2026秋招Agent全栈面经统一版.md": "2026-autumn-agent-interview-collection.md",
    },
  },
  {
    src: "面经",
    dest: "frontend",
    group: "前端面经",
    files: {
      "HTML5.md": "html5.md",
      "CSS3.md": "css3.md",
      "Flex.md": "flex.md",
      "TypeScript.md": "typescript.md",
      "nuxt.md": "nuxt.md",
      "nodejs.md": "nodejs.md",
      "git.md": "git.md",
      "打包工具.md": "bundlers.md",
      "前端安全.md": "web-security.md",
      "前端性能优化.md": "web-performance.md",
      "计网.md": "network.md",
      "AI.md": "ai-interview.md",
    },
  },
  {
    src: "手撕",
    dest: "coding",
    group: "手撕代码",
    files: {
      "链表.md": "linked-list.md",
    },
  },
];

/**
 * 已知跳过（空文件、研究/调研/计划类文档、已拆分/已整理为 curated 的文档），不出警告：
 * - 面经/Javascript.md：已拆分整理为 curated 的 js-basics / js-core / js-browser
 * - 面经/Vue.md：已整理为站点侧 curated 的 vue.md（二级目录重构、内容审查）
 * - 面经/面试题补充计划.md、前端_AI面经调研_50篇.md、2026-09-前端AI合并面经速报.md：
 *   研究/计划类文档，不属于面经本身，不进站点
 * - agent 面经/00-Agent基础概念-审查与调研.md、2026秋招Agent全栈速成高频分析报告.md：
 *   同为调研/报告类，不进站点（真面经内容见 2026秋招Agent全栈面经统一版）
 */
const KNOWN_SKIP = new Set([
  "agent 相关/AI.md",
  "agent 相关/agent面经/00-Agent基础概念-审查与调研.md",
  "agent 相关/agent面经/2026秋招Agent全栈速成高频分析报告.md",
  "面经/Javascript.md",
  "面经/Vue.md",
  "面经/面试题补充计划.md",
  "面经/前端_AI面经调研_50篇.md",
  "面经/2026-09-前端AI合并面经速报.md",
]);

/** curated 文件：脚本不覆盖、不删除（Javascript.md 的三篇拆分稿、整理后的 vue.md、站点侧新增的 Agent 评估） */
const CURATED = {
  frontend: ["js-basics.md", "js-core.md", "js-browser.md", "vue.md"],
  agent: ["07-agent-evaluation.md"],
};

/**
 * 站点侧新增稿（源仓库没有对应文件）在侧栏中的位置：
 * key 为 section.dest，value 是 { slug: 插在哪个 slug 之前 }；没配就追加到末尾。
 */
const CURATED_POSITION = {
  agent: { "07-agent-evaluation": "2026-autumn-agent-interview-collection" },
};

/**
 * 侧栏与页面标题（slug -> 干净标题）。
 * 同步时用于重写站点副本的一级标题（源文件不动），侧栏条目也取自这里。
 */
const TITLES = {
  // agent 面经
  "00-agent-basics": "Agent 基础概念",
  "01-agent-runtime-architecture": "Agent Runtime 与架构",
  "02-langchain-langgraph": "LangChain 与 LangGraph",
  "02-memory-and-context": "Memory 与 Context 工程",
  "03-skills": "Skill 机制",
  "05-rag": "RAG 面经",
  "06-mcp": "MCP 面经",
  "07-agent-evaluation": "Agent 评估",
  "2026-autumn-agent-interview-collection": "2026 秋招 Agent 面经合集",
  // 前端面经
  "js-basics": "JavaScript 语言基础",
  "js-core": "JavaScript 核心机制",
  "js-browser": "JavaScript 浏览器与工程",
  typescript: "TypeScript",
  css3: "CSS 基础",
  flex: "Flex 布局",
  html5: "HTML5 基础",
  vue: "Vue",
  nuxt: "Nuxt",
  nodejs: "Node.js",
  bundlers: "打包工具",
  network: "计算机网络",
  git: "Git",
  "web-security": "前端安全",
  "web-performance": "前端性能优化",
  "ai-interview": "AI 面经",
  // 手撕代码
  "linked-list": "链表题集",
};

/**
 * frontend/ 侧栏分组（扁平主题命名，同时是页面顺序的唯一来源）。
 * 含 curated slug 时直接从 TITLES 取标题，不查源文件。
 */
const FRONTEND_GROUPS = [
  { label: "JavaScript", slugs: ["js-basics", "js-core", "js-browser"] },
  { label: "TypeScript", slugs: ["typescript"] },
  { label: "CSS", slugs: ["css3", "flex"] },
  { label: "HTML", slugs: ["html5"] },
  { label: "Vue / Nuxt", slugs: ["vue", "nuxt"] },
  { label: "Node.js", slugs: ["nodejs"] },
  { label: "打包工具", slugs: ["bundlers"] },
  { label: "网络", slugs: ["network"] },
  { label: "Git", slugs: ["git"] },
  { label: "前端安全", slugs: ["web-security"] },
  { label: "性能优化", slugs: ["web-performance"] },
  { label: "AI 面经", slugs: ["ai-interview"] },
];

// ---------------------------------------------------------------- 校验

if (!fs.existsSync(INTERVIEW_ROOT)) {
  console.error(`FATAL: 找不到 interview 仓库: ${INTERVIEW_ROOT}`);
  console.error("用法: node scripts/sync-interview.mjs [interview仓库路径]");
  process.exit(1);
}

const allSlugs = new Set();
for (const s of SECTIONS) {
  for (const slug of Object.values(s.files)) {
    if (allSlugs.has(slug)) throw new Error(`slug 冲突: ${slug}`);
    allSlugs.add(slug);
  }
}
// curated slug 也计入，保证侧栏链接与页面顺序检查一致
for (const slugs of Object.values(CURATED)) {
  for (const slug of slugs) allSlugs.add(slug);
}

/** 源文件名 -> 新 slug（不含扩展名），用于改写交叉引用链接 */
const linkMap = new Map();
for (const s of SECTIONS) {
  for (const [srcName, slug] of Object.entries(s.files)) {
    linkMap.set(srcName, slug.replace(/\.md$/, ""));
  }
}
// 源文件里指向 Javascript.md 的内链，改指到拆分后的第一篇
linkMap.set("Javascript.md", "js-basics");

// ---------------------------------------------------------------- 改写链接

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 把 ](./源文件名.md) / ](源文件名.md) / ](../源文件名.md) 形式的内链
 * 改写为新 slug（去掉 .md，符合仓库 check-links 约定），锚点保留。
 * 只处理同目录引用；若出现跨目录引用（如 ../面经/xxx.md），需在映射里补规则。
 */
function rewriteLinks(md) {
  for (const [srcName, slug] of linkMap) {
    const re = new RegExp(`(\\]\\(\\s*(?:\\.{1,2}\\/)?)${escapeRe(srcName)}(?=[)#])`, "g");
    md = md.replace(re, `$1${slug}`);
  }
  return md;
}

/**
 * 处理图片引用：图片文件存在于源目录 -> 拷贝到站点同名位置；
 * 不存在（如 QQ 截图没随仓库保存）-> 替换为占位说明，保证构建不挂。
 * 外链和根路径引用不动。
 */
function processImages(md, srcDir, destDir) {
  return md.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (full, alt, target) => {
    if (/^(https?:|\/|#)/.test(target)) return full;
    const abs = path.resolve(srcDir, target);
    if (fs.existsSync(abs)) {
      const destAbs = path.resolve(destDir, target);
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.copyFileSync(abs, destAbs);
      return full;
    }
    return `> 📷 图片缺失（源文件未随仓库保存）：\`${target}\`。补图后重跑 \`npm run sync:interview\``;
  });
}

// ---------------------------------------------------------------- 标题整理

/**
 * 站点副本的一级标题替换为 TITLES 里的干净标题：
 * 有 H1 整行替换；有 frontmatter 替换/补 title 行；都没有则插入 H1。
 */
function applyTitle(content, slug) {
  const title = TITLES[slug];
  if (!title) return content;
  if (/^#\s+.+$/m.test(content)) {
    return content.replace(/^#\s+.+$/m, `# ${title}`);
  }
  if (content.startsWith("---")) {
    const end = content.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = content.slice(0, end);
      if (/^title:\s*.+$/m.test(fm)) {
        return content.replace(/^(title:\s*).+$/m, `$1${title}`);
      }
      return `${fm}\ntitle: ${title}\n${content.slice(end)}`;
    }
  }
  return `# ${title}\n\n${content}`;
}

// ---------------------------------------------------------------- 侧栏生成

/** 取源文件第一个 H1（TITLES 没有时的兜底） */
function h1Of(srcAbs, fallback) {
  const md = fs.readFileSync(srcAbs, "utf8").replace(/^\uFEFF/, "");
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function titleOf(section, slug) {
  if (TITLES[slug]) return TITLES[slug];
  const srcName = Object.keys(section.files).find((k) => section.files[k] === `${slug}.md`);
  if (!srcName) return slug;
  const srcAbs = path.join(INTERVIEW_ROOT, section.src, srcName);
  return fs.existsSync(srcAbs) ? h1Of(srcAbs, slug) : slug;
}

function buildSidebar() {
  const sidebar = [
    { text: "总览", items: [{ text: "面经速查", link: "/interview/" }] },
  ];

  for (const section of SECTIONS) {
    if (section.dest === "frontend") {
      // frontend 按 FRONTEND_GROUPS 扁平主题分组（含 curated slug）
      for (const group of FRONTEND_GROUPS) {
        const items = group.slugs.map((slug) => {
          const link = `/interview/${section.dest}/${slug}`;
          return { text: titleOf(section, slug), link };
        });
        sidebar.push({ text: group.label, items });
      }
    } else {
      const items = Object.values(section.files).map((slug) => {
        const link = `/interview/${section.dest}/${slug.replace(/\.md$/, "")}`;
        return { text: titleOf(section, slug.replace(/\.md$/, "")), link };
      });
      // 站点侧新增稿：源仓库没有对应文件，但侧栏里要有入口
      for (const name of CURATED[section.dest] || []) {
        const slug = name.replace(/\.md$/, "");
        const link = `/interview/${section.dest}/${slug}`;
        if (items.some((it) => it.link === link)) continue;
        const entry = { text: titleOf(section, slug), link };
        const before = CURATED_POSITION[section.dest]?.[slug];
        const at = before ? items.findIndex((it) => it.link === `/interview/${section.dest}/${before}`) : -1;
        if (at >= 0) items.splice(at, 0, entry);
        else items.push(entry);
      }
      sidebar.push({ text: section.group, items });
    }
  }

  return sidebar;
}

// ---------------------------------------------------------------- 同步

fs.mkdirSync(DEST_ROOT, { recursive: true });

let copied = 0;
let rewrote = 0;
let deleted = 0;

for (const section of SECTIONS) {
  const srcDir = path.join(INTERVIEW_ROOT, section.src);
  const destDir = path.join(DEST_ROOT, section.dest);

  fs.mkdirSync(destDir, { recursive: true });
  // 只清理脚本生成的文件：curated 文件（js 三篇）保留
  const curated = CURATED[section.dest] || [];
  for (const entry of fs.readdirSync(destDir)) {
    if (!curated.includes(entry)) {
      fs.rmSync(path.join(destDir, entry), { recursive: true, force: true });
      deleted++;
    }
  }

  if (!fs.existsSync(srcDir)) {
    console.warn(`WARN  源目录不存在: ${srcDir}`);
    continue;
  }

  for (const name of fs.readdirSync(srcDir)) {
    if (!name.endsWith(".md")) continue;
    const rel = `${section.src}/${name}`;
    if (!(name in section.files)) {
      if (!KNOWN_SKIP.has(rel)) console.warn(`SKIP  未映射，跳过: ${rel}`);
      continue;
    }

    let content = fs.readFileSync(path.join(srcDir, name), "utf8");
    content = content.replace(/^\uFEFF/, ""); // 去 BOM（站点侧友好，源文件不动）
    const slug = section.files[name].replace(/\.md$/, "");
    const rewritten = rewriteLinks(content);
    if (rewritten !== content) rewrote++;
    content = applyTitle(rewritten, slug);
    content = processImages(content, srcDir, destDir);
    fs.writeFileSync(path.join(destDir, section.files[name]), content, "utf8");
    copied++;
  }
}

// 侧栏配置（脚本所有，避免重跑同步时被清掉；_ 前缀文件不会被 Rspress 路由）
fs.writeFileSync(
  path.join(DEST_ROOT, "_sidebar.json"),
  JSON.stringify(buildSidebar(), null, 2) + "\n",
  "utf8",
);

console.log(`同步完成: ${copied} 个文件 -> ${path.relative(process.cwd(), DEST_ROOT)}`);
console.log(`  - 清理旧文件: ${deleted}`);
console.log(`  - 改写内链的文件数: ${rewrote}`);
console.log(`  - 侧栏配置: docs/interview/_sidebar.json`);
console.log("下一步: npm run check && npm run build");
