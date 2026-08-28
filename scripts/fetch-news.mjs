/**
 * 每日新闻抓取 —— 读 content/news/sources.json 里的 RSS/Atom，产出两份东西：
 *
 *   npm run news          → content/news/latest.json（只含 public:true 的分类）
 *                           这份会被提交进仓库、跟着站点一起发布。**仓库是公开的**，
 *                           所以非 public 的分类一个字都不写进去。
 *   npm run news:vault    → 往 Obsidian 库里写一篇当天的 markdown 日报（**全部分类**）
 *
 * 为什么是"抓下来存成文件"而不是页面上实时请求：
 * 站点是静态导出、没有后端，浏览器里直接抓这些源会撞跨域；而且实时抓意味着每个访客
 * 都替你去请求一遍别人的服务器。构建前抓一次、结果进仓库，是这个架构下唯一干净的做法。
 *
 * 没有引入任何 npm 依赖：下面那个几十行的解析器够用了（RSS 2.0 + Atom）。
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = path.join(ROOT, "content/news/sources.json");
const WEB_OUT = path.join(ROOT, "content/news/latest.json");

/** 每个源最多取几条 / 每个分类最多留几条 / 只要最近几天 */
const PER_FEED = 6;
const PER_CATEGORY = 24;
const DAYS = 7;

const UA_DEFAULT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
/** SEC 明确要求 User-Agent 写成「名字 邮箱」，不写就 403 */
const UA_SEC = "weiliang weiliang99520@gmail.com";

/* ------------------------------------------------------------------ 极简 RSS/Atom 解析 */

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const blocksOf = (xml, tag) => {
  const out = [];
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  for (const m of xml.matchAll(re)) out.push(m[0]);
  return out;
};

const textOf = (block, tags) => {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
    if (m) {
      const value = decode(m[1]);
      if (value) return value;
    }
  }
  return "";
};

/** Atom 的链接在属性里（<link rel="alternate" href="…"/>），RSS 的在标签内容里 */
const linkOf = (block) => {
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alt) return alt[1];
  const inner = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  if (inner && inner[1].trim()) return decode(inner[1]);
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return href ? href[1] : "";
};

function parseFeed(xml) {
  const items = [...blocksOf(xml, "item"), ...blocksOf(xml, "entry")];
  return items
    .map((block) => {
      const raw = textOf(block, ["pubDate", "published", "updated", "dc:date"]);
      const at = raw ? new Date(raw) : null;
      return {
        title: textOf(block, ["title"]),
        url: linkOf(block),
        at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
      };
    })
    .filter((item) => item.title && item.url);
}

/* ------------------------------------------------------------------ 抓取 */

async function pull(feed) {
  const headers = { "User-Agent": feed.ua === "sec" ? UA_SEC : UA_DEFAULT, Accept: "*/*" };
  try {
    const res = await fetch(feed.url, { headers, redirect: "follow" });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, items: [] };
    const xml = await res.text();
    const items = parseFeed(xml).slice(0, PER_FEED);
    if (items.length === 0) return { ok: false, reason: "解析不出条目", items: [] };
    return { ok: true, items };
  } catch (err) {
    return { ok: false, reason: String(err.message ?? err), items: [] };
  }
}

const config = JSON.parse(await readFile(SOURCES, "utf8"));
const args = process.argv.slice(2);
const vaultFlag = args.find((a) => a.startsWith("--vault="));
const vaultDir = vaultFlag ? vaultFlag.slice("--vault=".length) : null;

/** 用北京时间判断"今天"——这份日报是给东八区的人看的 */
const now = new Date();
const cnDate = (iso) =>
  new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const today = cnDate(now.toISOString());
const cutoff = now.getTime() - DAYS * 86400 * 1000;

const failures = [];
const categories = [];

for (const category of config.categories) {
  const seen = new Set();
  const items = [];

  for (const feed of category.feeds ?? []) {
    const result = await pull(feed);
    if (!result.ok) {
      failures.push(`${category.label} / ${feed.name}：${result.reason}`);
      continue;
    }
    for (const item of result.items) {
      const key = item.url.split("?")[0];
      if (seen.has(key)) continue;
      if (item.at && new Date(item.at).getTime() < cutoff) continue;
      seen.add(key);
      items.push({
        title: item.title.slice(0, 180),
        url: item.url,
        source: feed.name,
        sourceEn: feed.nameEn ?? feed.name,
        at: item.at,
        date: item.at ? cnDate(item.at) : today,
      });
    }
  }

  items.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  categories.push({ ...category, items: items.slice(0, PER_CATEGORY) });
  console.log(`  ${category.label}：${items.length} 条`);
}

/* ------------------------------------------------------------------ 出口一：网站 */

const publicCategories = categories.filter((c) => c.public);
await mkdir(path.dirname(WEB_OUT), { recursive: true });
await writeFile(
  WEB_OUT,
  JSON.stringify(
    {
      note: "由 scripts/fetch-news.mjs 生成，别手改。源清单在 sources.json。只含 public:true 的分类。",
      generatedAt: now.toISOString(),
      categories: publicCategories.map((c) => ({
        key: c.key,
        label: c.label,
        labelEn: c.labelEn,
        desc: c.desc,
        descEn: c.descEn,
        links: c.links ?? [],
        items: c.items,
      })),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(`\n网站数据 → content/news/latest.json（${publicCategories.length} 个公开分类）`);

/* ------------------------------------------------------------------ 出口二：知识库日报 */

if (vaultDir) {
  const lines = [
    "---",
    `title: 每日速览 ${today}`,
    `date: ${today}`,
    "tags: [每日速览, 新闻]",
    "---",
    "",
    `# 每日速览 · ${today}`,
    "",
    `> 由个人网页仓库的 scripts/fetch-news.mjs 生成于 ${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    "",
  ];

  for (const category of categories) {
    lines.push(`## ${category.label}`, "");
    if (category.desc) lines.push(`*${category.desc}*`, "");
    if (category.items.length === 0) {
      lines.push("今天没有新东西。", "");
    } else {
      for (const item of category.items) {
        lines.push(`- [${item.title}](${item.url}) — ${item.source} · ${item.date}`);
      }
      lines.push("");
    }
    if (category.links?.length) {
      lines.push(
        `常去：${category.links.map((l) => `[${l.name}](${l.url})`).join(" · ")}`,
        "",
      );
    }
  }

  if (failures.length) {
    lines.push("## 抓取失败的源", "", ...failures.map((f) => `- ${f}`), "");
  }

  const dir = path.join(vaultDir, "每日速览");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today}.md`);
  await writeFile(file, lines.join("\n"), "utf8");
  console.log(`知识库日报 → ${file}`);
}

if (failures.length) {
  console.log(`\n有 ${failures.length} 个源没抓到（不影响其它源）：`);
  for (const f of failures) console.log(`  - ${f}`);
}
