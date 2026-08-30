#!/usr/bin/env node
/**
 * 摄影板块的图片流水线 —— `npm run photos`
 *
 *   photos-src/<辑的英文名>/*.jpg   ← 你把原图丢这里（这个目录不进 git）
 *        ↓
 *   public/images/photos/<辑>/xxx.webp        展示图（长边 2000，点开放大时看的）
 *   public/images/photos/<辑>/thumb/xxx.webp  缩略图（宽 600，网格里看的）
 *   content/photos/<辑>.json                  这一辑的数据（标题/地点/日期 + 照片清单）
 *
 * 原图不进仓库。仓库里只有压过的 webp。
 *
 * 已有的 json 会被**合并**而不是覆盖：标题、地点、日期这些你填过的字段原样保留，
 * 只有 photos 那一段按 photos-src 里的实际文件重写（每张照片的 caption 也按文件名保留）。
 *
 * 用法：
 *   npm run photos              只处理有变动的（源文件比产物新才重新压）
 *   npm run photos -- --force   全部重压
 *   npm run photos -- 辑名      只处理某一辑
 *
 * sharp 是 next 的传递依赖，直接借用，没有为它新增 package.json 依赖
 * （scripts/generate-intro-assets.mjs 也是这么干的）。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "photos-src");
const OUT_DIR = path.join(ROOT, "public/images/photos");
const DATA_DIR = path.join(ROOT, "content/photos");

/** 网格里那张：宽 600 就够（2 倍屏下网格一格约 220px） */
const THUMB_WIDTH = 600;
/** 点开放大那张：长边 2000，超过才缩，不放大 */
const DISPLAY_LONG_EDGE = 2000;
const THUMB_QUALITY = 76;
const DISPLAY_QUALITY = 82;

const SUPPORTED = /\.(jpe?g|png|webp|tiff?|avif)$/i;

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlySlug = args.find((a) => !a.startsWith("-"));

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    [
      "",
      "✗ 找不到 sharp（这个脚本靠它压图）。",
      "  sharp 本来是 next 带进来的传递依赖，装一次依赖就有：",
      "",
      "      npm install",
      "",
      "  装完再跑一次 npm run photos。",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(
    [
      "",
      `✗ 没有 photos-src/ 目录（应该在 ${SRC_DIR}）。`,
      "  这是放原图的地方，一辑一个子文件夹，比如：",
      "",
      "      photos-src/busan-2025/IMG_0001.jpg",
      "      photos-src/busan-2025/IMG_0002.jpg",
      "",
      "  建好目录、把照片丢进去，再跑一次。详细步骤见 docs/如何添加照片.md。",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const slugs = fs
  .readdirSync(SRC_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith("."))
  .map((e) => e.name)
  .filter((name) => !onlySlug || name === onlySlug)
  .sort();

if (slugs.length === 0) {
  console.error(
    onlySlug
      ? `✗ photos-src/ 里没有叫 ${onlySlug} 的文件夹。`
      : "✗ photos-src/ 是空的 —— 一辑一个子文件夹，照片放进去再跑。",
  );
  process.exit(1);
}

/** 文件名 → 安全的输出名：小写、空格和奇怪字符换成 - */
function outName(file) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 源文件比产物新（或产物不存在）才需要重新压 */
function stale(src, ...outs) {
  if (force) return true;
  const srcTime = fs.statSync(src).mtimeMs;
  return outs.some((o) => !fs.existsSync(o) || fs.statSync(o).mtimeMs < srcTime);
}

const NEW_ALBUM_TEMPLATE = (slug) => ({
  slug,
  /** "feature" = 专题（列表页上半部的大图卡片）；"archive" = 档案（下半部按年份分组） */
  kind: "archive",
  title: "待填写标题",
  titleEn: "Untitled",
  location: "",
  locationEn: "",
  /** 拍摄日期。多天就再填 dateEnd，页面会显示成 2026.08.14 — 08.16 */
  date: new Date().toISOString().slice(0, 10),
  dateEnd: "",
  summary: "",
  summaryEn: "",
  photos: [],
});

let totalPhotos = 0;
const created = [];

for (const slug of slugs) {
  const srcAlbum = path.join(SRC_DIR, slug);
  const outAlbum = path.join(OUT_DIR, slug);
  const outThumb = path.join(outAlbum, "thumb");
  fs.mkdirSync(outThumb, { recursive: true });

  const files = fs
    .readdirSync(srcAlbum)
    .filter((f) => SUPPORTED.test(f))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const skipped = fs
    .readdirSync(srcAlbum)
    .filter((f) => !SUPPORTED.test(f) && !f.startsWith("."));

  if (skipped.length > 0) {
    console.warn(
      `  ! ${slug}：跳过 ${skipped.length} 个不认识的文件（${skipped.slice(0, 3).join(", ")}${
        skipped.length > 3 ? " …" : ""
      }）。` +
        (skipped.some((f) => /\.heic$/i.test(f))
          ? "\n    HEIC 是 iPhone 的格式，这里读不了 —— 用「导出为 JPEG」再放进来（做法见 docs/如何添加照片.md）。"
          : ""),
    );
  }

  const photos = [];
  let redone = 0;

  for (const file of files) {
    const src = path.join(srcAlbum, file);
    const base = outName(file);
    const displayPath = path.join(outAlbum, `${base}.webp`);
    const thumbPath = path.join(outThumb, `${base}.webp`);

    if (stale(src, displayPath, thumbPath)) {
      const image = sharp(src).rotate(); // rotate() 不带参数 = 按 EXIF 摆正
      const meta = await image.metadata();
      const long = Math.max(meta.width ?? 0, meta.height ?? 0);
      const scale = long > DISPLAY_LONG_EDGE ? DISPLAY_LONG_EDGE / long : 1;

      await image
        .clone()
        .resize({
          width: Math.round((meta.width ?? 0) * scale),
          withoutEnlargement: true,
        })
        .webp({ quality: DISPLAY_QUALITY })
        .toFile(displayPath);

      await image
        .clone()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbPath);

      redone += 1;
    }

    const out = await sharp(displayPath).metadata();
    photos.push({ file: `${base}.webp`, width: out.width, height: out.height });
  }

  /* ---------- 合并进 content/photos/<slug>.json ---------- */
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dataPath = path.join(DATA_DIR, `${slug}.json`);
  let album;

  if (fs.existsSync(dataPath)) {
    album = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    // 你写过的 caption 按文件名认回去
    const captions = new Map(
      (album.photos ?? []).map((p) => [p.file, { caption: p.caption, captionEn: p.captionEn }]),
    );
    album.photos = photos.map((p) => {
      const kept = captions.get(p.file);
      return kept?.caption || kept?.captionEn ? { ...p, ...kept } : p;
    });
  } else {
    album = { ...NEW_ALBUM_TEMPLATE(slug), photos };
    created.push(slug);
  }

  album.slug = slug;
  fs.writeFileSync(dataPath, `${JSON.stringify(album, null, 2)}\n`);

  totalPhotos += photos.length;
  console.log(
    `  ✓ ${slug}：${photos.length} 张（重压 ${redone} 张）→ public/images/photos/${slug}/`,
  );
}

console.log(`\n共 ${slugs.length} 辑 / ${totalPhotos} 张。`);

if (created.length > 0) {
  console.log(
    [
      "",
      `新建了 ${created.length} 份数据文件，标题地点日期还是空的，去填一下：`,
      ...created.map((s) => `    content/photos/${s}.json`),
      "",
      '  kind 填 "feature"（专题，列表页上半部的大图）或 "archive"（档案，按年份列）。',
      "  填完跑 npm run build 看一眼，没问题就提交。",
      "",
    ].join("\n"),
  );
}
