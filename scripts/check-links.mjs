// 校验 docs/ 内部相对/绝对链接是否指向存在的页面
import fs from "node:fs";
import path from "node:path";

const root = "docs";

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (f.endsWith(".md") || f.endsWith(".mdx")) acc.push(p.split(path.sep).join("/"));
  }
  return acc;
}

const files = walk(root);
const routes = new Set();
for (const f of files) {
  let r = f.replace(/^docs/, "").replace(/\.mdx?$/, "");
  routes.add(r);
  if (r.endsWith("/index")) routes.add(r.slice(0, -"index".length));
}

let bad = 0;
const re = /\]\((\.{1,2}\/[^)#\s]*|\/[^)#\s]*?)(#[^)\s]*)?\)/g;

for (const f of files) {
  const md = fs.readFileSync(f, "utf8");
  const dir = path.posix.dirname(f.replace(/^docs/, ""));
  let m;
  while ((m = re.exec(md))) {
    const link = m[1];
    if (!link) continue;
    let target = link.startsWith("/") ? link : path.posix.normalize(path.posix.join(dir, link));
    const ok =
      routes.has(target) ||
      routes.has(target.replace(/\/$/, "")) ||
      routes.has(target + "/index") ||
      routes.has(target.replace(/\/$/, "") + "/index");
    if (!ok) {
      console.log(`BAD  ${f}  ->  ${link}   (resolved: ${target})`);
      bad++;
    }
  }
}

console.log(bad === 0 ? "OK: all internal links resolve" : `FAILED: ${bad} broken link(s)`);
process.exit(bad === 0 ? 0 : 1);
