/**
 * 每日抓取 —— 读 content/news/sources.json 里的 RSS/Atom，写 content/news/latest.json。
 *
 * 两个板块：
 *   world  世界新闻 —— 各家报社今天的头条，只存标题和链接，不抓正文（版权，也没必要）
 *   ai     AI 更新 —— Claude / Anthropic / OpenAI 等的官方更新，是「解读」那一栏的原料
 *
 * 为什么是"抓下来存成文件"而不是页面上实时请求：站点是静态导出、没有后端，
 * 浏览器直接抓这些源会撞跨域；实时抓还意味着每个访客都替你去请求一遍别人的服务器。
 * 构建前抓一次、结果进仓库，是这个架构下唯一干净的做法。
 *
 * 零 npm 依赖：下面几十行的解析器覆盖 RSS 2.0 + Atom 够用了。
 *
 *   npm run news
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = path.join(ROOT, "content/news/sources.json");
const OUT = path.join(ROOT, "content/news/latest.json");

/** 每家最多留几条 / 每个板块最多留几条 / 只要最近几天 */
const PER_FEED = { world: 5, ai: 8 };
const PER_BOARD = { world: 30, ai: 24 };
const DAYS = { world: 2, ai: 14 };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

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

const blocksOf = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi"))].map((m) => m[0]);

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
  return [...blocksOf(xml, "item"), ...blocksOf(xml, "entry")]
    .map((block) => {
      const raw = textOf(block, ["pubDate", "published", "updated", "dc:date"]);
      const at = raw ? new Date(raw) : null;
      return {
        title: textOf(block, ["title"]),
        summary: textOf(block, ["description", "summary"]).slice(0, 300),
        url: linkOf(block),
        at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
      };
    })
    .filter((item) => item.title && item.url);
}

async function pull(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, items: [] };
    const items = parseFeed(await res.text());
    return items.length ? { ok: true, items } : { ok: false, reason: "解析不出条目", items: [] };
  } catch (err) {
    return { ok: false, reason: String(err.message ?? err), items: [] };
  }
}

/* ------------------------------------------------------------------ 抓 */

const config = JSON.parse(await readFile(SOURCES, "utf8"));
const now = new Date();
/** 按北京时间归日 —— 看这一页的人在东八区 */
const cnDate = (iso) => new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const failures = [];
const boards = [];

for (const board of config.boards) {
  const cutoff = now.getTime() - (DAYS[board.key] ?? 3) * 86400 * 1000;
  const seen = new Set();
  const items = [];

  for (const feed of board.feeds) {
    const result = await pull(feed.url);
    if (!result.ok) {
      failures.push(`${board.key} / ${feed.name}：${result.reason}`);
      continue;
    }
    let taken = 0;
    for (const item of result.items) {
      if (taken >= (PER_FEED[board.key] ?? 5)) break;
      const key = item.url.split("?")[0];
      if (seen.has(key)) continue;
      if (item.at && new Date(item.at).getTime() < cutoff) continue;
      seen.add(key);
      taken += 1;
      items.push({
        title: item.title.slice(0, 200),
        url: item.url,
        source: feed.name,
        sourceEn: feed.nameEn ?? feed.name,
        at: item.at,
        date: item.at ? cnDate(item.at) : cnDate(now.toISOString()),
      });
    }
  }

  items.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  boards.push({
    key: board.key,
    outlets: board.outlets ?? [],
    items: items.slice(0, PER_BOARD[board.key] ?? 24),
  });
  console.log(`  ${board.key}：${items.length} 条`);
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    { note: "由 scripts/fetch-news.mjs 生成，别手改。源清单在 sources.json。", generatedAt: now.toISOString(), boards },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(`\n→ content/news/latest.json`);

if (failures.length) {
  console.log(`\n${failures.length} 个源没抓到（不影响其它源）：`);
  for (const f of failures) console.log(`  - ${f}`);
}
