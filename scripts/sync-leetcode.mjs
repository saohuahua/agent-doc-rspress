#!/usr/bin/env node
/**
 * 从本地 leetcode-hot100 仓库同步力扣教材到 docs/leetcode/
 *
 * - 覆盖式同步：docs/leetcode/ 下除手写落地页 index.md（见 CURATED）以外的内容
 *   每次重新生成
 * - 源文件内容基本不改（只做站点侧转换）：
 *   · 章节目录 -> 英文短名（CHAPTER_SLUGS，18 个，手写）
 *   · 题目文件名 -> `<4位题号>-<英文 slug>.md`，slug 取自源仓库 data/hot100.json
 *     （官方题单 17 类 100 题；00 章 3 篇为手写映射 EXTRA_FILES）
 *   · 文内交叉引用相对链接改写为站点绝对路径 /leetcode/...
 *     （图片/图示等静态资源保持相对路径，随目录一起拷贝）
 *   · 删除 21 处冗余的「源码见 [NNNN.ts](../../solutions/NN/NNNN.ts)。」整段：
 *     这些代码已逐字内嵌在题目页正下方的 ```ts 代码块里
 *   · 唯一的 chapters/13-堆/README.md「共享实现见 [BinaryHeap源码]」例外：
 *     删掉链接句，并把 solutions/13/heap.ts 内联为代码块，使该章自洽
 *     （全仓库唯一一处站点副本比源文件多内容的地方）
 *   · 对会被 MDX 当成 JSX 标签吞掉的裸尖括号（如表格里的 Set<number>）做转义
 *   · FIGURES.md 的三列表格改成逐图小节：Rspress 把 markdown 链接里的静态资源
 *     当成页面路由（`./a.svg` -> `a.svg.html`）必然 404，只有 `![]()` 会被打包
 * - 生成 docs/leetcode/_sidebar.json：侧栏配置（_ 前缀不会被 Rspress 路由），
 *   由 rspress.config.ts 读取挂到 '/leetcode/' 下
 * - 不迁移：PROGRESS.md（个人学习进度）、根 README.md（由手写落地页替代）
 *
 * 用法：
 *   node scripts/sync-leetcode.mjs
 *   node scripts/sync-leetcode.mjs D:/project/leetcode-hot100
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = process.argv[2] || path.resolve(__dirname, "../../leetcode-hot100");
const DEST_ROOT = path.join(__dirname, "../docs/leetcode");

/** 手写落地页：脚本不覆盖、不删除 */
const CURATED = ["index.md"];

/** 章节目录 -> 站点子路径 slug（URL 用英文） */
const CHAPTER_SLUGS = {
  "00-算法入门与TypeScript基础": "00-intro",
  "01-哈希": "01-hash",
  "02-双指针": "02-two-pointers",
  "03-滑动窗口": "03-sliding-window",
  "04-子串": "04-substring",
  "05-普通数组": "05-array",
  "06-矩阵": "06-matrix",
  "07-链表": "07-linked-list",
  "08-二叉树": "08-binary-tree",
  "09-图论": "09-graph",
  "10-回溯": "10-backtracking",
  "11-二分查找": "11-binary-search",
  "12-栈": "12-stack",
  "13-堆": "13-heap",
  "14-贪心算法": "14-greedy",
  "15-动态规划": "15-dp",
  "16-多维动态规划": "16-2d-dp",
  "17-技巧": "17-tricks",
};

/** 00 章不在官方题单里，3 篇基础教材用 slug 映射 */
const INTRO_DIR = "00-算法入门与TypeScript基础";
const INTRO_NAME = "算法入门与 TypeScript 基础";
const EXTRA_FILES = {
  [INTRO_DIR]: {
    "01-怎么开始想一道题.md": "01-how-to-think.md",
    "02-复杂度与数据结构.md": "02-complexity-and-structures.md",
    "03-TypeScript运行时与递归.md": "03-ts-runtime-and-recursion.md",
  },
};

/** 源仓库根目录的顶层文档 -> 站点文件与路由 */
const ROOT_DOCS = [
  { src: "CATALOG.md", dest: "catalog.md", route: "/leetcode/catalog", text: "官方题单与教材索引" },
  { src: "FIGURES.md", dest: "figures.md", route: "/leetcode/figures", text: "算法图示索引" },
  { src: "MIXED-PRACTICE.md", dest: "mixed.md", route: "/leetcode/mixed", text: "混合复习入口" },
];

/** 根 README 只提供路由映射（不拷贝，站点入口为手写的 docs/leetcode/index.md） */
const LANDING_ROUTE = "/leetcode/";

// ---------------------------------------------------------------- 校验

const manifestPath = path.join(SRC_ROOT, "data/hot100.json");
if (!fs.existsSync(manifestPath)) {
  console.error(`FATAL: 找不到源仓库或题单清单: ${manifestPath}`);
  console.error("用法: node scripts/sync-leetcode.mjs [leetcode-hot100仓库路径]");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const pad4 = (id) => String(id).padStart(4, "0");
const toPosix = (p) => p.split(path.sep).join("/");

/** 章节顺序：00 章在最前，其余按官方题单顺序 */
const chapters = [
  {
    dir: INTRO_DIR,
    slug: CHAPTER_SLUGS[INTRO_DIR],
    name: INTRO_NAME,
    problems: [],
    extra: EXTRA_FILES[INTRO_DIR],
  },
  ...manifest.groups.map((g) => ({
    dir: g.directory,
    slug: CHAPTER_SLUGS[g.directory],
    name: g.name,
    problems: g.problems,
    extra: null,
  })),
];

for (const ch of chapters) {
  if (!ch.slug) throw new Error(`章节目录缺少 slug 映射: ${ch.dir}`);
  const dirAbs = path.join(SRC_ROOT, "chapters", ch.dir);
  if (!fs.existsSync(dirAbs)) throw new Error(`源章节目录不存在: ${dirAbs}`);
}

// ---------------------------------------------------------------- 文件计划

/** srcRel(posix，相对源仓库根) -> { destRel, route }；route 为 null 表示静态资源 */
const fileMap = new Map();
const copyList = [];

function addFile(srcRel, destRel, route, { copy = true } = {}) {
  if (fileMap.has(srcRel)) throw new Error(`源路径重复映射: ${srcRel}`);
  fileMap.set(srcRel, { destRel, route });
  if (copy) copyList.push({ srcRel, destRel });
}

for (const ch of chapters) {
  const base = `chapters/${ch.dir}`;
  addFile(`${base}/README.md`, `${ch.slug}/index.md`, `/leetcode/${ch.slug}/`);
  addFile(`${base}/review.md`, `${ch.slug}/review.md`, `/leetcode/${ch.slug}/review`);
  for (const p of ch.problems) {
    const srcName = `${pad4(p.id)}-${p.title}.md`;
    const destName = `${pad4(p.id)}-${p.slug}.md`;
    addFile(
      `${base}/${srcName}`,
      `${ch.slug}/${destName}`,
      `/leetcode/${ch.slug}/${pad4(p.id)}-${p.slug}`,
    );
  }
  if (ch.extra) {
    for (const [srcName, destName] of Object.entries(ch.extra)) {
      addFile(
        `${base}/${srcName}`,
        `${ch.slug}/${destName}`,
        `/leetcode/${ch.slug}/${destName.replace(/\.md$/, "")}`,
      );
    }
  }
  const assetDirAbs = path.join(SRC_ROOT, base, "assets");
  if (fs.existsSync(assetDirAbs)) {
    for (const name of fs.readdirSync(assetDirAbs)) {
      addFile(`${base}/assets/${name}`, `${ch.slug}/assets/${name}`, null);
    }
  }
}

for (const rd of ROOT_DOCS) {
  addFile(rd.src, rd.dest, rd.route);
}
// 根 README 只作为链接目标存在（指向手写落地页）
fileMap.set("README.md", { destRel: "index.md", route: LANDING_ROUTE });

// 清单与磁盘对账：一题都不能缺
let problemCount = 0;
for (const ch of chapters) {
  problemCount += ch.problems.length;
  for (const p of ch.problems) {
    const srcName = `${pad4(p.id)}-${p.title}.md`;
    if (!fs.existsSync(path.join(SRC_ROOT, `chapters/${ch.dir}/${srcName}`))) {
      throw new Error(`题单清单里的文件不存在: chapters/${ch.dir}/${srcName}`);
    }
  }
}
if (problemCount !== 100) {
  console.warn(`WARN  官方题单题数与预期不同: ${problemCount}（预期 100）`);
}

// ---------------------------------------------------------------- 文本转换

/** 会被 MDX 当成 JSX 标签、在 HTML 里合法但会吞掉正文的标签白名单 */
const ALLOWED_TAGS = new Set([
  "details", "summary", "br", "hr", "img", "a", "div", "span", "p",
  "sub", "sup", "kbd", "mark", "code", "pre", "b", "i", "em", "strong",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figure", "figcaption",
  "svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "text",
]);

/**
 * 把正文里形如 `<number>`、`<number, number>` 的裸尖括号转义成 HTML 实体，
 * 避免 MDX 把它们解析成 JSX 标签（例如 `Set<number>` 会静默渲染成 `Set`）。
 * 代码块与行内代码内的内容原样保留，已知 HTML 标签白名单不动。
 */
function mdxGuard(md) {
  const fences = md.split(/(```[\s\S]*?(?:```|$))/);
  return fences
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk; // ``` 围栏代码块
      const segs = chunk.split(/(`+[^`]*`+)/);
      return segs
        .map((seg, j) => {
          if (j % 2 === 1) return seg; // 行内代码
          return seg.replace(/<(\/?)([A-Za-z][A-Za-z0-9_]*)([^>]*)>/g, (m, slash, name, rest) =>
            ALLOWED_TAGS.has(name.toLowerCase()) ? m : `&lt;${slash}${name}${rest}&gt;`,
          );
        })
        .join("");
    })
    .join("");
}

/** 删除冗余的「源码见 [NNNN.ts](../../solutions/NN/NNNN.ts)。」整段（含前后空行） */
function dropRedundantSourceLinks(md) {
  return md.replace(
    /\n\n源码见 \[[^\]]*\]\(\.\.\/\.\.\/solutions\/[^)]*\)。\n\n/g,
    "\n\n",
  );
}

/**
 * 13-堆/README.md 特例：删掉「共享实现见 [BinaryHeap源码]」句子，
 * 并在该段落之后把 solutions/13/heap.ts 内联为代码块。
 */
function inlineBinaryHeap(md, srcRel) {
  const SENTENCE = "共享实现见 [BinaryHeap源码](../../solutions/13/heap.ts)。";
  if (!md.includes(SENTENCE)) {
    if (/solutions\/13\/heap\.ts/.test(md)) {
      throw new Error(`${srcRel} 里仍有 heap.ts 引用，但未匹配到待替换句子`);
    }
    return md;
  }
  const heapAbs = path.join(SRC_ROOT, "solutions/13/heap.ts");
  if (!fs.existsSync(heapAbs)) throw new Error(`找不到待内联的源码: ${heapAbs}`);
  const heap = fs
    .readFileSync(heapAbs, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trimEnd();

  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.includes(SENTENCE));
  lines[i] = lines[i].replace(SENTENCE, "").trimStart();
  if (lines[i] === "") {
    console.warn(`WARN  ${srcRel}: 删句后该行为空，请检查上下文`);
  }
  let j = i;
  while (j < lines.length && lines[j].trim() !== "") j++;
  lines.splice(j, 0, "", "```ts", ...heap.split("\n"), "```");
  return lines.join("\n");
}

/**
 * FIGURES.md 特例：把「题号 | 图示内容 | 重点说明」三列表格改成逐图小节。
 *
 * 原因是 Rspress 会把 markdown 链接指向的任何相对或站内绝对路径都当成页面
 * 路由处理（`./a.svg` 渲染成 `a.svg.html`），静态资源链接必然 404；只有图片
 * `![]()` 才会被当作资源打包。表格里放不下可读的图，因此改为逐图展示。
 * 题号、图示名称、说明文字原样保留，链接目标仍是源仓库相对路径，
 * 由 rewriteLinks() 统一改写。
 */
function transformFigures(md, srcRel) {
  if (srcRel !== "FIGURES.md") return md;
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^\|\s*题目\s*\|/.test(l));
  if (start === -1) throw new Error(`${srcRel}: 未找到表格表头`);

  const sections = [];
  let i = start + 2; // 跳过表头与分隔行
  for (; i < lines.length && lines[i].startsWith("|"); i++) {
    const cells = lines[i].split("|").map((s) => s.trim());
    const title = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(cells[1]);
    const figure = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(cells[2]);
    if (!title || !figure) throw new Error(`${srcRel}: 表格行格式不符合预期: ${lines[i]}`);
    sections.push(
      `## ${title[1]}`,
      "",
      `[题目讲解](${title[2]})`,
      "",
      `![${figure[1]}](${figure[2]})`,
      "",
      cells[3],
      "",
    );
  }
  return [...lines.slice(0, start), ...sections, ...lines.slice(i)].join("\n");
}

/**
 * 把源文的 `<details><summary>X</summary>` 折叠块改成 Rspress 容器写法
 * `:::details X`，让提示与解析获得主题自带的卡片样式与留白。
 *
 * 源仓库是 GitHub markdown，容器语法在那里会显示成字面文本，因此只在站点侧转换。
 * 源文块内没有嵌套 details，两种写法（`<details>\n<summary>` 与
 * `<details><summary>`）由 `\s*` 一并覆盖。
 */
function convertDetails(md) {
  return md
    .replace(
      /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g,
      (_match, title, body) => `:::details ${title.trim()}\n\n${body.trim()}\n\n:::`,
    )
    // 相邻折叠块在源文里可能只隔一个换行（`</details>` 与 `<details>` 前后相接），
    // 结束标记后必须补空行，否则 Rspress 会把两个容器当成一个。
    .replace(/^:::\n(?=\S)/gm, ":::\n\n");
}

// ---------------------------------------------------------------- 题目页增强

/** 难度文案：取自官方题单清单，不新编内容 */
const DIFFICULTY_TEXT = { EASY: "简单", MEDIUM: "中等", HARD: "困难" };

/**
 * 核心行高亮：题目 id -> 实现代码里的片段（在围栏内应当唯一）。
 *
 * 站点侧给核心语句追加行尾标记 `// [!code highlight]`，该标记会被 shiki 的
 * highlight 转换器删除，读者看到的代码与源仓库 solutions 文件一致，因此不需要
 * 改动源仓库。用片段而不是行号匹配，源码增删行后依然稳定；匹配数量不等于 1 直接报错。
 *
 * 目前只策展了一部分题目；没有配置的题目直接跳过，不做高亮。
 */
const PROBLEM_HIGHLIGHTS = {
  "0001": ["seen.get(needed)", "seen.set(value, index)"],
  "0049": ["word.split('').sort().join('')", "if (group === undefined) groups.set(key, [word])"],
  "0128": ["if (values.has(value - 1)) continue"],
  "0011": ["if (height[left] <= height[right]) left++"],
  "0015": [
    "if (first > 0 && sorted[first] === sorted[first - 1]) continue",
    "while (left < right && sorted[left] === leftValue) left++",
  ],
  "0042": ["water += Math.min(leftMax[i], rightMax[i]) - height[i]"],
  "0283": ["if (nums[read] !== 0) nums[write++] = nums[read]", "while (write < nums.length) nums[write++] = 0"],
  "0003": ["if (previous !== undefined && previous >= left)"],
  "0438": [
    "if (right >= p.length) window[indexOf(s[right - p.length])]--",
    "window.every((count, index) => count === need[index])",
  ],
  "0076": ["if (count > 0) missing--", "if (remaining + 1 > 0) missing++"],
  "0239": [
    "if (head < deque.length && deque[head] <= right - k) head++",
    "while (head < deque.length && nums[deque[deque.length - 1]] <= nums[right]) deque.pop()",
  ],
  "0560": ["answer += counts.get(prefix - k) ?? 0", "counts.set(prefix, (counts.get(prefix) ?? 0) + 1)"],
};

/** srcRel -> 题单条目（含 difficulty 与 url） */
const problemBySrc = new Map();
for (const ch of chapters) {
  for (const p of ch.problems) {
    problemBySrc.set(`chapters/${ch.dir}/${pad4(p.id)}-${p.title}.md`, p);
  }
}

/** 定位 `## <head>` 到下一个二级标题之间的正文（返回字节区间） */
function sectionRange(md, head) {
  const at = md.indexOf(`${head}\n`);
  if (at === -1) throw new Error(`未找到章节: ${head}`);
  const from = at + head.length + 1;
  const to = md.indexOf("\n## ", from);
  return { from, to: to === -1 ? md.length : to };
}

/** 用 transform 替换某章节的正文 */
function replaceSection(md, head, transform) {
  const { from, to } = sectionRange(md, head);
  return md.slice(0, from) + transform(md.slice(from, to)) + md.slice(to);
}

/** 段落 -> 无序列表项；已有块级结构（列表/表格/引用/围栏）的段落原样保留 */
function toBullets(body, { bySentence }) {
  return body
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => {
      if (/^([-|>#`]|\d+\.|:::)/.test(p)) return [p];
      const items = bySentence ? p.split(/(?<=。)/) : [p];
      return items.map((s) => s.trim()).filter(Boolean).map((s) => `- ${s}`);
    })
    .join("\n");
}

/** `## 复杂度与边界`：按句列表化，并加粗复杂度记号便于扫读 */
function listifyComplexity(body) {
  const bullets = toBullets(body, { bySentence: true }).replace(
    /(?<!\*)(`?O\([^)]*\)`?)(?!\*)/g,
    "**$1**",
  );
  return `\n${bullets}\n`;
}

/** `### 变式分析与错误反例`：每个变式或反例单独成项，论证保持完整 */
function listifyVariants(body) {
  return `\n${toBullets(body, { bySentence: false })}\n`;
}

/** `## 解法复述与检查`：把问句链拆成列表，引导语与折叠解析保持不变 */
function listifyCheckQuestions(body) {
  const cut = body.indexOf(":::");
  const prose = (cut === -1 ? body : body.slice(0, cut));
  const tail = cut === -1 ? "" : body.slice(cut);
  const paragraphs = prose.split(/\n{2,}/).filter((p) => p.trim());
  const first = (paragraphs.shift() ?? "").trim();
  if (!first.includes("？")) return body;
  let lead = "";
  let rest = first;
  const colon = first.indexOf("：");
  const question = first.indexOf("？");
  if (colon !== -1 && colon < question) {
    lead = first.slice(0, colon + 1);
    rest = first.slice(colon + 1);
  }
  const bullets = rest
    .split(/(?<=？)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join("\n");
  const extra = paragraphs.length ? `\n\n${paragraphs.join("\n\n").trim()}` : "";
  const head = lead ? `${lead}\n\n` : "";
  return `\n${head}${bullets}${extra}\n\n${tail.replace(/^\n+/, "")}`;
}

/** 题面卡片：题面正文原样搬进容器，另附清单里的难度 */
function wrapProblemStatement(md, p) {
  const { from } = sectionRange(md, "## 题目");
  const sample = md.indexOf("\n### ", from);
  if (sample === -1) throw new Error("题目页缺少 `### 官方示例` 小节");
  const statement = md.slice(from, sample).trim();
  const difficulty = DIFFICULTY_TEXT[p.difficulty] ?? p.difficulty;
  const card = `\n:::info 题面\n\n**难度**：${difficulty}\n\n${statement}\n\n:::\n`;
  return md.slice(0, from) + card + md.slice(sample);
}

/** `## TypeScript 实现` 里的代码行按片段追加高亮标记 */
function highlightCoreLines(md, srcRel, snippets) {
  const { from, to } = sectionRange(md, "## TypeScript 实现");
  const fenceStart = md.indexOf("```ts", from);
  if (fenceStart === -1 || fenceStart > to) throw new Error(`${srcRel}: 未找到 ts 实现围栏`);
  const fenceEnd = md.indexOf("\n```", fenceStart + 5);
  if (fenceEnd === -1) throw new Error(`${srcRel}: ts 实现围栏没有闭合`);
  const lines = md.slice(fenceStart, fenceEnd).split("\n");
  for (const snippet of snippets) {
    const hits = lines.reduce((acc, line, i) => (line.includes(snippet) ? [...acc, i] : acc), []);
    if (hits.length !== 1) {
      throw new Error(`${srcRel}: 高亮片段匹配到 ${hits.length} 行: ${snippet}`);
    }
    lines[hits[0]] = `${lines[hits[0]]} // [!code highlight]`;
  }
  return md.slice(0, fenceStart) + lines.join("\n") + md.slice(fenceEnd);
}

/**
 * 题目页正文格式化：题面卡片 + 复杂度与变式列表化 + 核心行高亮。
 *
 * 这些写法面向站点阅读（容器卡片、列表化段落、shiki 行标记），写进源仓库会让
 * GitHub 显示成字面文本，因此只在同步时施加到站点副本上。
 */
function enrichProblem(md, srcRel) {
  const p = problemBySrc.get(srcRel);
  if (!p) return md;
  let out = wrapProblemStatement(md, p);
  out = replaceSection(out, "## 复杂度与边界", listifyComplexity);
  out = replaceSection(out, "## 解法复述与检查", listifyCheckQuestions);
  out = replaceSection(out, "### 变式分析与错误反例", listifyVariants);
  const snippets = PROBLEM_HIGHLIGHTS[pad4(p.id)];
  if (snippets?.length) out = highlightCoreLines(out, srcRel, snippets);
  return out;
}

// ---------------------------------------------------------------- 改写链接

const escapeRe =  (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const unresolved = [];

/**
 * 把 markdown 链接目标（`](target)` 与 `](<target>)` 两种写法）里的源仓库
 * 相对路径改写为站点路由：
 *   - .md 目标 -> 绝对路由 /leetcode/...
 *   - 静态资源 -> 相对当前站点页面的路径
 * 外链、锚点、已是绝对路径的目标原样保留。
 */
function rewriteLinks(md, srcRel, destRel) {
  const srcDir = path.posix.dirname(srcRel);
  const destDir = path.posix.dirname(destRel);
  return md.replace(/\]\(\s*(<[^>]*>|[^)\s]+)\s*\)/g, (full, raw) => {
    const target = raw.startsWith("<") && raw.endsWith(">") ? raw.slice(1, -1) : raw;
    if (!target || /^(https?:|mailto:|\/|#)/.test(target)) return full;
    const hashIdx = target.indexOf("#");
    const pathPart = hashIdx === -1 ? target : target.slice(0, hashIdx);
    const anchor = hashIdx === -1 ? "" : target.slice(hashIdx);
    const resolved = path.posix.normalize(path.posix.join(srcDir, pathPart));
    const entry = fileMap.get(resolved);
    if (!entry) {
      unresolved.push(`${srcRel}  ->  ${target}`);
      return full;
    }
    if (entry.route) return `](${entry.route}${anchor})`;
    // 静态资源保持相对路径（Rspack 要求 ./ 开头才会当成模块资源解析）
    let rel = path.posix.relative(destDir, entry.destRel);
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return `](${rel}${anchor})`;
  });
}

// ---------------------------------------------------------------- 同步

fs.mkdirSync(DEST_ROOT, { recursive: true });
let deleted = 0;
for (const entry of fs.readdirSync(DEST_ROOT)) {
  if (!CURATED.includes(entry)) {
    fs.rmSync(path.join(DEST_ROOT, entry), { recursive: true, force: true });
    deleted++;
  }
}

let copied = 0;
let assets = 0;
let rewritten = 0;

for (const { srcRel, destRel } of copyList) {
  const srcAbs = path.join(SRC_ROOT, srcRel);
  const destAbs = path.join(DEST_ROOT, destRel);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });

  if (!srcRel.endsWith(".md")) {
    fs.copyFileSync(srcAbs, destAbs);
    assets++;
    continue;
  }

  let content = fs
    .readFileSync(srcAbs, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
  content = dropRedundantSourceLinks(content);
  content = inlineBinaryHeap(content, srcRel);
  content = transformFigures(content, srcRel);
  content = convertDetails(content);
  content = enrichProblem(content, srcRel);
  const before = content;
  content = rewriteLinks(content, srcRel, destRel);
  if (content !== before) rewritten++;
  content = mdxGuard(content);
  if (!content.endsWith("\n")) content += "\n";
  fs.writeFileSync(destAbs, content, "utf8");
  copied++;
}

if (unresolved.length) {
  console.warn(`WARN  有 ${unresolved.length} 条链接未识别，已原样保留：`);
  for (const u of unresolved) console.warn(`  - ${u}`);
}

// ---------------------------------------------------------------- 侧栏

/** 读取站点副本的一级标题，用作侧栏文案 */
function readHeading(abs) {
  const m = fs.readFileSync(abs, "utf8").match(/^#\s+(.+)$/m);
  if (!m) throw new Error(`文档缺少一级标题: ${abs}`);
  return m[1].trim();
}

function buildSidebar() {
  return [
    {
      text: "总览",
      items: [
        { text: "力扣 Hot100 教材", link: LANDING_ROUTE },
        ...ROOT_DOCS.map((rd) => ({ text: rd.text, link: rd.route })),
      ],
    },
    ...chapters.map((ch) => ({
      text: ch.name,
      items: [
        { text: "基础教材", link: `/leetcode/${ch.slug}/` },
        ...Object.values(ch.extra ?? {}).map((dest) => ({
          text: readHeading(path.join(DEST_ROOT, ch.slug, dest)),
          link: `/leetcode/${ch.slug}/${dest.replace(/\.md$/, "")}`,
        })),
        ...ch.problems.map((p) => ({
          text: p.title,
          link: `/leetcode/${ch.slug}/${pad4(p.id)}-${p.slug}`,
        })),
        { text: "复习与迁移", link: `/leetcode/${ch.slug}/review` },
      ],
    })),
  ];
}

fs.writeFileSync(
  path.join(DEST_ROOT, "_sidebar.json"),
  JSON.stringify(buildSidebar(), null, 2) + "\n",
  "utf8",
);

console.log(`同步完成: ${copied} 个文档 + ${assets} 个静态资源 -> docs/leetcode/`);
console.log(`  - 清理旧条目: ${deleted}`);
console.log(`  - 改写内链的文档数: ${rewritten}`);
console.log(`  - 章节: ${chapters.length}，题目: ${problemCount}`);
console.log(`  - 核心行高亮的题目: ${Object.keys(PROBLEM_HIGHLIGHTS).length}`);
console.log(`  - 侧栏配置: docs/leetcode/_sidebar.json`);
console.log("下一步: npm run check && npm run build");
