#!/usr/bin/env node
/**
 * 源码引用批量校验
 *
 * 校验 docs/ 中所有形如 `packages/xxx/src/yyy.ts` 或 `packages/xxx/src/yyy.ts:123`
 * 的引用，对照本机 Pi 源码检查：
 *
 *   1. 路径是否存在                          -> ERROR
 *   2. `:行号` 是否超出文件行数                -> ERROR
 *   3. 同一行提到的符号是否出现在该行号附近      -> ERROR（带行号时）
 *   4. 同一行提到的符号是否出现在该文件/目录中    -> WARN （不带行号时）
 *
 * 用法：
 *   node scripts/check-source-refs.mjs
 *   PI_ROOT=D:/project/ts-pi/pi node scripts/check-source-refs.mjs
 *   node scripts/check-source-refs.mjs --json
 */

import fs from "node:fs";
import path from "node:path";

const PI_ROOT = (process.env.PI_ROOT ?? "D:/project/ts-pi/pi").replace(/\\/g, "/");
const DOCS_ROOT = "docs";
const JSON_OUT = process.argv.includes("--json");

/** 带行号引用时，符号允许出现在该行号 ± 这个范围内（上游会漂移） */
const LINE_TOLERANCE = 3;

if (!fs.existsSync(PI_ROOT)) {
  console.error(`FATAL: Pi 源码目录不存在: ${PI_ROOT}`);
  console.error("设置 PI_ROOT 环境变量指向本机 Pi 仓库根目录。");
  process.exit(2);
}

// ---------------------------------------------------------------- 收集文档

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith(".md") || name.endsWith(".mdx")) acc.push(p.split(path.sep).join("/"));
  }
  return acc;
}

// ---------------------------------------------------------------- 解析引用

const CODE_SPAN = /`([^`\n]+)`/g;
const PATH_LIKE = /^packages\/[A-Za-z0-9._/-]+(?::\d+(?:-\d+)?)?$/;
/** 短引用：`agent-harness.ts:351` 或 `harness/session/types.ts:328`，靠后缀在 packages/ 下唯一解析 */
const SHORT_REF = /^((?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:ts|tsx|js|mjs|md)):(\d+)$/;

/** basename -> 仓库相对路径列表 */
const basenameIndex = new Map();
(function indexPackages(dir = path.join(PI_ROOT, "packages")) {
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      let s;
      try {
        s = fs.statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        if (name !== "node_modules" && name !== "dist" && name !== ".git") stack.push(p);
      } else if (/\.(ts|tsx|js|mjs|md)$/.test(name)) {
        const rel = p.split(path.sep).join("/").slice(PI_ROOT.length + 1);
        if (!basenameIndex.has(name)) basenameIndex.set(name, []);
        basenameIndex.get(name).push(rel);
      }
    }
  }
})();

function isRef(span) {
  return PATH_LIKE.test(span) || SHORT_REF.test(span);
}

/** 把一个引用 span 解析成 { relPath, line } 或 { error } */
function resolveRef(span) {
  if (PATH_LIKE.test(span)) {
    const [relPath, lineSpec] = span.split(":");
    return { relPath, line: lineSpec ? Number(lineSpec.split("-")[0]) : undefined };
  }
  const m = SHORT_REF.exec(span);
  const suffix = m[1];
  const candidates = suffix.includes("/")
    ? [...basenameIndex.values()].flat().filter((rel) => rel.endsWith(`/${suffix}`))
    : (basenameIndex.get(suffix) ?? []);
  if (candidates.length === 0) return { error: `找不到匹配 ${suffix} 的源文件` };
  if (candidates.length > 1) {
    return {
      error: `短引用 ${span} 不唯一（${candidates.length} 个同名文件），请改写完整路径：${candidates
        .slice(0, 4)
        .join(", ")}`,
    };
  }
  return { relPath: candidates[0], line: Number(m[2]) };
}

const FILE_NAME_LIKE = /\.(ts|tsx|js|mjs|cjs|json|md|mdx|jsonl|lock|sh)$/i;

function spanToSymbol(raw) {
  if (PATH_LIKE.test(raw)) return undefined;
  // HarnessTool.replay: "safe" \| "never"  ->  HarnessTool.replay
  // agentLoop()                            ->  agentLoop
  const head = raw.split(/[:=（(\s]/)[0].replace(/\\/g, "").trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(head)) return undefined;
  if (head.length < 3) return undefined;
  if (FILE_NAME_LIKE.test(head)) return undefined; // usage.md、types.ts 之类不是符号
  return { raw, symbol: head };
}

/**
 * 从一行 markdown 里抽出待校验的符号。
 *
 * 表格行按 learn/ 的约定处理：第 1 列是「本篇概念」（伪代码，不该去 Pi 里找），
 * 最后一列是路径，只校验中间列里的符号。
 */
function extractTableSymbols(line) {
  const out = [];
  const cells = line.split("|").slice(1, -1);
  for (let c = 1; c < cells.length; c++) {
    if ([...cells[c].matchAll(CODE_SPAN)].some((m) => isRef(m[1]))) continue;
    for (const m of cells[c].matchAll(CODE_SPAN)) {
      const s = spanToSymbol(m[1]);
      if (s) out.push(s);
    }
  }
  return out;
}

/**
 * prose 行：一行里可能有多个引用和多个符号，
 * 只把每个引用和**距离最近的符号**配对（限 PROSE_PAIR_DISTANCE 字符内）。
 * 这匹配两种书写习惯：`symbol`（`file:line`） 与 `file:line` `symbol`。
 */
const PROSE_PAIR_DISTANCE = 40;

function extractProseSpans(line) {
  const spans = [];
  for (const m of line.matchAll(CODE_SPAN)) {
    spans.push({ raw: m[1], index: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return spans;
}

function nearestSymbolFor(spans, refSpan) {
  let best;
  for (const s of spans) {
    if (s === refSpan) continue;
    const sym = spanToSymbol(s.raw);
    if (!sym) continue;
    const distance =
      s.end <= refSpan.index ? refSpan.index - s.end : Math.max(0, s.index - refSpan.end);
    if (distance > PROSE_PAIR_DISTANCE) continue;
    if (!best || distance < best.distance) best = { ...sym, distance };
  }
  return best ? [best] : [];
}

/** 在文件或目录中查找符号，返回命中的行号（1 起算），找不到返回 [] */
function findSymbol(absTarget, symbol) {
  const needles = [symbol];
  if (symbol.includes(".")) needles.push(symbol.split(".").pop());
  const hits = [];

  const scanFile = (file) => {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      return;
    }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (needles.some((n) => lines[i].includes(n))) hits.push({ file, line: i + 1 });
    }
  };

  const stat = fs.statSync(absTarget);
  if (stat.isDirectory()) {
    const stack = [absTarget];
    while (stack.length) {
      const dir = stack.pop();
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const s = fs.statSync(p);
        if (s.isDirectory()) {
          if (name !== "node_modules" && name !== "dist") stack.push(p);
        } else if (/\.(ts|tsx|js|mjs|md)$/.test(name)) {
          scanFile(p);
        }
      }
    }
  } else {
    scanFile(absTarget);
  }
  return hits;
}

// ---------------------------------------------------------------- 主流程

const errors = [];
const warnings = [];
let refCount = 0;

for (const doc of walk(DOCS_ROOT)) {
  const lines = fs.readFileSync(doc, "utf8").split(/\r?\n/);

  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // 行内或上一行的 <!-- refcheck:ignore --> 可跳过该行
    if (line.includes("refcheck:ignore") || (i > 0 && lines[i - 1].includes("refcheck:ignore"))) {
      continue;
    }

    const spans = extractProseSpans(line);
    const refSpans = spans.filter((s) => isRef(s.raw));
    if (refSpans.length === 0) continue;

    const isTableRow = /^\s*\|/.test(line);
    const where = `${doc}:${i + 1}`;

    for (const refSpan of refSpans) {
      const ref = refSpan.raw;
      refCount++;

      const resolved = resolveRef(ref);
      if (resolved.error) {
        errors.push({ where, ref, kind: "unresolved-ref", message: resolved.error });
        continue;
      }
      const { relPath, line: declaredLine } = resolved;
      const abs = path.join(PI_ROOT, relPath);

      if (!fs.existsSync(abs)) {
        errors.push({ where, ref, kind: "path-missing", message: `路径不存在: ${relPath}` });
        continue;
      }

      const isDir = fs.statSync(abs).isDirectory();
      const symbols = isTableRow ? extractTableSymbols(line) : nearestSymbolFor(spans, refSpan);

      if (declaredLine !== undefined) {
        if (isDir) {
          errors.push({ where, ref, kind: "line-on-dir", message: `目录引用不该带行号: ${ref}` });
          continue;
        }
        const total = fs.readFileSync(abs, "utf8").split(/\r?\n/).length;
        if (declaredLine > total) {
          errors.push({
            where,
            ref,
            kind: "line-out-of-range",
            message: `行号 ${declaredLine} 超出文件行数 ${total}`,
          });
          continue;
        }
      }

      // 符号校验
      for (const { raw, symbol } of symbols) {
        const hits = findSymbol(abs, symbol);
        if (hits.length === 0) {
          warnings.push({
            where,
            ref,
            kind: "symbol-not-found",
            message: `符号 \`${raw}\` 在 ${relPath} 中找不到`,
          });
          continue;
        }
        if (declaredLine !== undefined) {
          const near = hits.some((h) => Math.abs(h.line - declaredLine) <= LINE_TOLERANCE);
          if (!near) {
            errors.push({
              where,
              ref,
              kind: "symbol-line-mismatch",
              message: `符号 \`${raw}\` 不在 ${relPath}:${declaredLine} 附近，实际出现在 ${hits
                .slice(0, 5)
                .map((h) => h.line)
                .join(", ")}${hits.length > 5 ? " …" : ""}`,
            });
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- 输出

if (JSON_OUT) {
  console.log(JSON.stringify({ piRoot: PI_ROOT, refCount, errors, warnings }, null, 2));
} else {
  console.log(`Pi 源码: ${PI_ROOT}`);
  console.log(`扫描到 ${refCount} 条源码引用\n`);

  for (const e of errors) console.log(`ERROR  ${e.where}\n       ${e.message}`);
  if (errors.length && warnings.length) console.log("");
  for (const w of warnings) console.log(`WARN   ${w.where}\n       ${w.message}`);

  console.log("");
  console.log(
    errors.length === 0
      ? `OK: 无错误${warnings.length ? `，${warnings.length} 条警告` : ""}`
      : `FAILED: ${errors.length} 个错误，${warnings.length} 条警告`,
  );
}

process.exit(errors.length === 0 ? 0 : 1);
