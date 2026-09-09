/**
 * 把 content/news/ 的两份 json 合成一份 public/data/news.json，供博客页**按需取**。
 *
 * ── 为什么要这一步 ──
 * 新闻原来是服务端渲染进博客页的。合并板块之后那一页同时装着「文章 + 世界新闻 +
 * AI 更新」三栏，未选中的两栏也留在 DOM 里（只挂 hidden），结果单页 HTML 从
 * 67 KB 涨到 187 KB —— 只想读文章的人完整扛了一份新闻页（2026-09-09 审出来的）。
 *
 * 现在新闻改成客户端在**切到那一栏时**才 fetch 这份 json。代价是新闻不再进 HTML，
 * 搜索引擎和 ⌘F 看不到它 —— 这是**故意的**：那些标题是别人家报社的，
 * 本来就不该作为这个站的正文被收录。自己写的文章仍然全部服务端渲染，一个字没少。
 *
 * ── 为什么不直接把 content/news/*.json 放进 public/ ──
 * 那两份是**内容源**（抓取脚本每天往里写，站主也可能手改 digests），
 * 形状和页面要用的不一样（boards 是数组，页面要按 key 取；解读要按日期倒排）。
 * 这一步就是把「内容源的形状」翻成「页面要用的形状」，和 lib/content.ts 里
 * 原来那个 getNews() 做的是同一件事，只是挪到了构建期。
 *
 * ── 什么时候跑 ──
 * package.json 里挂在 `prebuild` 和 `dev` 上，`npm run build` / `npm run dev`
 * 会自动跑，不用记。产物不进 git（见 .gitignore）—— 它完全由 content/ 推导得出，
 * 进了仓库只会和每天的新闻提交打架。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEWS_DIR = path.join(ROOT, "content/news");
const OUT_DIR = path.join(ROOT, "public/data");
const OUT = path.join(OUT_DIR, "news.json");

const readJson = (file, fallback) => {
  const p = path.join(NEWS_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (err) {
    console.warn(`  ⚠ ${file} 解析失败，按空处理：${err.message}`);
    return fallback;
  }
};

const latest = readJson("latest.json", { generatedAt: "", boards: [] });
const digests = readJson("digests.json", { items: [] });

const empty = (key) => ({ key, outlets: [], items: [] });
const board = (key) => latest.boards?.find((b) => b.key === key) ?? empty(key);

const data = {
  generatedAt: latest.generatedAt ?? "",
  world: board("world"),
  ai: board("ai"),
  /** 解读按日期倒排，新的在前 —— 和原来 getNews() 的行为一致 */
  digests: [...(digests.items ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data));

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(
  `→ public/data/news.json（${kb(fs.statSync(OUT).size)}）` +
    `　世界新闻 ${data.world.items.length} 条 / AI 更新 ${data.ai.items.length} 条 / 解读 ${data.digests.length} 篇`,
);
