#!/usr/bin/env node
/**
 * 会话 JSONL 统计 —— 给 practice/ 记录采集客观指标
 *
 * 用法：
 *   node scripts/session-stats.mjs <session.jsonl>
 *   node scripts/session-stats.mjs --latest              # 当前目录对应的最新会话
 *   node scripts/session-stats.mjs --latest --cwd D:/x   # 指定项目目录
 *   node scripts/session-stats.mjs <file> --json
 *
 * 会话目录约定见 docs/pi/guide/reference/session-format.md
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const agentDir = process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");

function sessionDirFor(cwd) {
  // ~/.pi/agent/sessions/--<cwd 中每个 \ / : 换成 - >--
  // 例：D:/project/agent-doc-rspress -> --D--project-agent-doc-rspress--
  const encoded = cwd.replace(/[\\/:]/g, "-");
  return path.join(agentDir, "sessions", `--${encoded}--`);
}

function resolveTarget() {
  const cwdFlagIdx = args.indexOf("--cwd");
  const positional = args.filter(
    (a, i) => !a.startsWith("--") && !(cwdFlagIdx >= 0 && i === cwdFlagIdx + 1),
  );
  if (positional.length > 0) return positional[0];

  if (!args.includes("--latest")) {
    console.error("用法: node scripts/session-stats.mjs <session.jsonl> | --latest [--cwd <dir>]");
    process.exit(2);
  }
  const cwdIdx = args.indexOf("--cwd");
  const cwd = cwdIdx >= 0 ? args[cwdIdx + 1] : process.cwd();
  const dir = sessionDirFor(cwd);
  if (!fs.existsSync(dir)) {
    // 回退：在 sessions/ 下按 mtime 找最新
    const root = path.join(agentDir, "sessions");
    const all = [];
    for (const d of fs.readdirSync(root)) {
      const sub = path.join(root, d);
      if (!fs.statSync(sub).isDirectory()) continue;
      for (const f of fs.readdirSync(sub)) {
        if (f.endsWith(".jsonl")) all.push(path.join(sub, f));
      }
    }
    if (all.length === 0) {
      console.error(`找不到任何会话文件（${root}）`);
      process.exit(2);
    }
    all.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    console.error(`# 未找到 ${dir}，回退到全局最新会话`);
    return all[0];
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (files.length === 0) {
    console.error(`目录里没有会话文件: ${dir}`);
    process.exit(2);
  }
  return files[0];
}

const file = resolveTarget();
const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);

const stats = {
  file,
  entries: lines.length,
  byType: {},
  byRole: {},
  toolCalls: {},
  toolErrors: 0,
  compactions: 0,
  branchSummaries: 0,
  modelChanges: 0,
  thinkingChanges: 0,
  models: new Set(),
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
  firstTs: undefined,
  lastTs: undefined,
  stopReasons: {},
};

for (const line of lines) {
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  stats.byType[e.type] = (stats.byType[e.type] ?? 0) + 1;
  if (e.timestamp) {
    stats.firstTs ??= e.timestamp;
    stats.lastTs = e.timestamp;
  }
  if (e.type === "compaction") stats.compactions++;
  if (e.type === "branch_summary") stats.branchSummaries++;
  if (e.type === "model_change") stats.modelChanges++;
  if (e.type === "thinking_level_change") stats.thinkingChanges++;
  if (e.type !== "message") continue;

  const m = e.message;
  stats.byRole[m.role] = (stats.byRole[m.role] ?? 0) + 1;

  if (m.role === "assistant") {
    if (m.model) stats.models.add(`${m.provider ?? "?"}/${m.model}`);
    if (m.stopReason) stats.stopReasons[m.stopReason] = (stats.stopReasons[m.stopReason] ?? 0) + 1;
    for (const c of m.content ?? []) {
      if (c.type === "toolCall") stats.toolCalls[c.name] = (stats.toolCalls[c.name] ?? 0) + 1;
    }
  }
  if (m.role === "toolResult" && m.isError) stats.toolErrors++;

  const u = m.usage;
  if (u) {
    stats.usage.input += u.input ?? 0;
    stats.usage.output += u.output ?? 0;
    stats.usage.cacheRead += u.cacheRead ?? 0;
    stats.usage.cacheWrite += u.cacheWrite ?? 0;
    stats.usage.cost += u.cost?.total ?? 0;
  }
}

const durationMs =
  stats.firstTs && stats.lastTs ? new Date(stats.lastTs) - new Date(stats.firstTs) : 0;
const fmtDuration = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};
const n = (x) => x.toLocaleString("en-US");

const out = { ...stats, models: [...stats.models], durationMs, duration: fmtDuration(durationMs) };

if (asJson) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const totalTools = Object.values(stats.toolCalls).reduce((a, b) => a + b, 0);
  console.log(`会话文件   ${file}`);
  console.log(`条目总数   ${stats.entries}  ${JSON.stringify(stats.byType)}`);
  console.log(`时间跨度   ${out.duration}   (${stats.firstTs} -> ${stats.lastTs})`);
  console.log(`模型       ${out.models.join(", ") || "-"}`);
  console.log("");
  console.log(`消息       user ${stats.byRole.user ?? 0} / assistant ${stats.byRole.assistant ?? 0} / toolResult ${stats.byRole.toolResult ?? 0}`);
  console.log(`stopReason ${JSON.stringify(stats.stopReasons)}`);
  console.log(`工具调用   ${totalTools} 次  ${JSON.stringify(stats.toolCalls)}`);
  console.log(`工具报错   ${stats.toolErrors} 次`);
  console.log("");
  console.log(`压缩       ${stats.compactions} 次`);
  console.log(`分支摘要   ${stats.branchSummaries} 次`);
  console.log(`换模型     ${stats.modelChanges} 次   换 thinking ${stats.thinkingChanges} 次`);
  console.log("");
  console.log(`token      input ${n(stats.usage.input)} / output ${n(stats.usage.output)}`);
  console.log(`           cacheRead ${n(stats.usage.cacheRead)} / cacheWrite ${n(stats.usage.cacheWrite)}`);
  console.log(
    `成本       $${stats.usage.cost.toFixed(4)}${stats.usage.cost === 0 ? "   <- 为 0 通常表示该 provider 没有价格表，不代表免费" : ""}`,
  );
}
