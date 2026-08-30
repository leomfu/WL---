/**
 * 把「我听的」那面墙的封面**下载到本地**，转成 webp 存进 public/images/records/。
 *
 *   node scripts/fetch-record-covers.mjs          只补缺的
 *   node scripts/fetch-record-covers.mjs --force  全部重下
 *
 * 为什么不直接热链网易云的图（实测 p1/p2.music.126.net 不校验 Referer，200 能取到）：
 * - 那是别人家的 CDN，链接里带着一串 hash，专辑换图或者对象过期就整面墙开天窗；
 * - 站点是纯静态导出（images.unoptimized），热链的图不过 next/image 优化，
 *   一张原图 3.7MB，`?param=` 缩过也还有 200KB，九张就是 2MB 白扔；
 * - 存到本地之后**页面对网易云零依赖**，跟站上其它图一个待遇。
 * 代价是加条目时要跑一次这个脚本，值。
 *
 * sharp 不在 package.json 里 —— 它是 Next 的传递依赖，本机已经有了。
 * 这个脚本是内容维护用的，不参与构建；万一哪天 sharp 没了，下面会提示怎么办。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_FILE = path.join(ROOT, "content/music/records.json");
const OUT_DIR = path.join(ROOT, "public/images/records");
/** 卡片最大也就 220px 宽，2x 屏按 440 算，480 足够 */
const SIZE = 480;

const force = process.argv.includes("--force");

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    "没找到 sharp（它平时是 Next 的传递依赖）。临时装一个：npm i -D sharp，取完图再卸掉。",
  );
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
fs.mkdirSync(OUT_DIR, { recursive: true });

let done = 0;
let skipped = 0;

for (const item of data.items) {
  if (!item.coverSource || !item.cover) continue;

  const file = path.join(ROOT, "public", item.cover.replace(/^\//, ""));
  if (!force && fs.existsSync(file)) {
    skipped += 1;
    continue;
  }

  // 网易云的图床支持 ?param=WxH 服务端缩图，先让它缩一道，省下载
  const url = `${item.coverSource}?param=${SIZE}y${SIZE}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    console.warn(`× ${item.id} 取不到封面（HTTP ${res.status}）—— 这条会退化成文字卡片`);
    continue;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .resize(SIZE, SIZE, { fit: "cover" })
    .webp({ quality: 78 })
    .toFile(file);

  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`✓ ${item.id} → ${item.cover}（${kb}KB）`);
  done += 1;
}

console.log(`\n新下载 ${done} 张，跳过已有 ${skipped} 张。`);
