#!/usr/bin/env node
/**
 * 首页 hero 的图片流水线 —— `npm run hero`
 *
 *   hero-src/road.png                 ← 原图丢这里（这个目录不进 git）
 *        ↓
 *   public/images/hero/road.webp      双色调成品（进仓库）
 *
 * 和 build-photos.mjs 同一套约定：原图不进仓库，仓库里只有压过的 webp；
 * sharp 借用 next 的传递依赖，不为它新增 package.json 依赖。
 *
 * ── 这个脚本在做什么 ──
 * 把一张普通照片印成 mono-color 设计系统里的**双色调**（github.com/yanliudesign/mono-color-skill）：
 *   纸    #FAFAF7  Neutral White —— 和站点内容区的 #fafafa 几乎同色
 *   主版  #263E99  Ultramarine   —— 承担整张照片的影调
 *   副版  #E55D2B  Safety Orange —— **只给路面那条黄色中线**，一个识别锚点
 *
 * 副版不是滤镜叠色，是真的在原图里把中线那些像素挑出来单独上墨：
 * 判据是「黄」在 RGB 里的特征（红绿都高、蓝明显低），见 isAccent()。
 * skill 明令 accent 不许当装饰均匀撒开，所以这里必须是选出来的，不是铺上去的。
 *
 * ── 影调曲线 ──
 * 高光在 0.8 以上就**硬剪到纸色**（skill：clipped highlights where paper shows through）——
 * 于是照片顶部那片天空会直接融进页面，看不到图片的矩形边，
 * 「纸把图咬开」就不需要额外画遮罩了，是影调本身带来的。
 * 暗部则压深到接近实地墨。
 *
 * 用法：npm run hero        （源比产物新才重压）
 *      npm run hero -- --force
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "hero-src/road.png");
const OUT = path.join(ROOT, "public/images/hero/road.webp");

const PAPER = [0xfa, 0xfa, 0xf7];
const INK = [0x26, 0x3e, 0x99];
const ACCENT = [0xe5, 0x5d, 0x2b];

/** 成品宽度。源图裁完只有 900，这里适度放大到 1400 —— 双色调能盖掉一部分放大带来的软，
 *  但盖不全；拿到相机原图重跑一次会明显更实。 */
const OUT_WIDTH = 1400;
const QUALITY = 88;

/** 手机截图上下有黑边，逐行求平均亮度把内容带找出来，不写死坐标 */
async function contentBand(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rowMean = (y) => {
    let s = 0, n = 0;
    for (let x = 0; x < info.width; x += 8) { s += data[y * info.width + x]; n++; }
    return s / n;
  };
  let top = 0, bottom = info.height - 1;
  while (top < info.height && rowMean(top) < 12) top++;
  while (bottom > 0 && rowMean(bottom) < 12) bottom--;
  return { left: 0, top, width: info.width, height: bottom - top + 1 };
}

/** 黄：红绿都高、蓝明显低。路面中线和少量落叶会被选中，那正是我们要的那个锚点 */
const isAccent = (r, g, b) => r > 130 && g > 100 && b < 100 && r - b > 72 && g - b > 52;

/**
 * 影调曲线：先归一化，再 S 形加对比，最后两端硬剪。
 * clipHi 以上全部变成纸（高光露纸），clipLo 以下全部变成实地墨。
 */
function tone(l) {
  const contrast = 1.28, pivot = 0.5;
  let v = (l - pivot) * contrast + pivot;
  v = Math.min(1, Math.max(0, v));
  const clipLo = 0.06, clipHi = 0.8;
  if (v <= clipLo) return 0;
  if (v >= clipHi) return 1;
  return (v - clipLo) / (clipHi - clipLo);
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`× 没找到原图：${path.relative(ROOT, SRC)}\n  把照片放成这个路径再跑一次。`);
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  if (!force && fs.existsSync(OUT) && fs.statSync(OUT).mtimeMs > fs.statSync(SRC).mtimeMs) {
    console.log("· 产物比源新，跳过（要重压加 --force）");
    return;
  }

  const band = await contentBand(SRC);
  console.log(`· 内容带 ${band.width}×${band.height}（已去掉截图黑边）`);

  const { data, info } = await sharp(SRC)
    .extract(band)
    .resize({ width: OUT_WIDTH, kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 3);
  let accentPixels = 0;
  for (let i = 0, p = 0; i < data.length; i += info.channels, p += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Rec.709 亮度
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const t = tone(l);
    const accent = isAccent(r, g, b);
    const plate = accent ? ACCENT : INK;
    /* 副版单独限一个最低密度：黄线在原图里本来就亮，照亮度映射会被洗成纸色，
       那就等于没有副版了。压到 0.42 封顶，中线才是一条实地的橙。 */
    const tp = accent ? Math.min(t, 0.42) : t;
    if (accent) accentPixels++;
    out[p] = mix(plate[0], PAPER[0], tp);
    out[p + 1] = mix(plate[1], PAPER[1], tp);
    out[p + 2] = mix(plate[2], PAPER[2], tp);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: QUALITY })
    .toFile(OUT);

  const pct = ((accentPixels / (info.width * info.height)) * 100).toFixed(2);
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`✓ ${path.relative(ROOT, OUT)}  ${info.width}×${info.height}  ${kb}KB`);
  console.log(`  副版（橙）占 ${pct}% —— 只有中线那一路，符合 accent 不当装饰撒的要求`);
}

main().catch((e) => { console.error(e); process.exit(1); });
