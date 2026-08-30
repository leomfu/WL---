#!/usr/bin/env node
/**
 * 开场页背景素材生成（一次性脚本，留档用，日常不需要跑）
 *
 *   node scripts/generate-intro-assets.mjs [原图路径]
 *
 * 产出两个文件：
 *   public/images/intro/shanghai.webp        —— 压缩后的外滩夜景原图
 *   public/images/intro/shanghai-depth.jpg   —— 深度图（近似版）
 *
 * ── 深度图的约定：越亮 = 越近 ──
 * 这一版**不是真的深度估计**，是照着画面构图手写的分层近似：
 * 一条按 y 走的基础剖面（天空最远 → 楼群 → 江面 → 堤岸 → 木板路最近），
 * 再叠两处局部：中间的男孩、左右两根路灯杆。最后整体高斯模糊 ——
 * 硬边在视差位移里会直接撕裂成锯齿，糊一点反而对。
 *
 * ⚠️ 想升级成真深度图：把原图丢给能出 depth map 的模型（近白远黑，灰度），
 * 导出成同名的 shanghai-depth.jpg 覆盖即可，代码一行都不用改。
 *
 * sharp 是 next 的传递依赖，这里直接借用，没有为它新增 package.json 依赖。
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public/images/intro");

const SRC =
  process.argv[2] ??
  "/Users/fuweiliang/Downloads/ChatGPT Image 2026年8月30日 12_38_41.png";

/** 原图输出宽度。原图本身 1672px，不做无意义的放大 */
const PHOTO_WIDTH = 1672;
/** 深度图分辨率：960 宽足够，反正还要糊 */
const DEPTH_W = 960;
const DEPTH_H = 540;

// ---------------------------------------------------------------- 原图

async function buildPhoto() {
  const meta = await sharp(SRC).metadata();
  const width = Math.min(PHOTO_WIDTH, meta.width ?? PHOTO_WIDTH);

  // 质量从高往低试，第一个 ≤400KB 的就留下
  for (const quality of [82, 78, 74, 70, 66, 62]) {
    const buf = await sharp(SRC)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (buf.length <= 400 * 1024 || quality === 62) {
      await sharp(buf).toFile(path.join(OUT_DIR, "shanghai.webp"));
      console.log(
        `shanghai.webp  ${width}px  q=${quality}  ${(buf.length / 1024).toFixed(0)}KB`,
      );
      return;
    }
  }
}

// ---------------------------------------------------------------- 深度图

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * 基础剖面：按画面从上到下的层次给深度。
 * [y（0=顶 1=底）, 深度（0=最远 1=最近）]
 */
const PROFILE = [
  [0.0, 0.02], // 天顶
  [0.26, 0.03], // 天空，东方明珠塔尖以上
  [0.42, 0.13], // 楼群上部
  [0.68, 0.24], // 楼群基座 / 对岸灯带
  [0.71, 0.3], // 江面远端
  [0.78, 0.45], // 江面近端
  [0.8, 0.54], // 堤岸 / 护栏
  [0.845, 0.6], // 木板路远端
  [1.0, 0.97], // 画面最下沿，离镜头最近
];

function profileAt(y) {
  for (let i = 1; i < PROFILE.length; i += 1) {
    const [y0, d0] = PROFILE[i - 1];
    const [y1, d1] = PROFILE[i];
    if (y <= y1) return d0 + (d1 - d0) * smooth((y - y0) / (y1 - y0));
  }
  return PROFILE[PROFILE.length - 1][1];
}

/** 椭圆软斑：返回 0~1 的权重 */
function blob(x, y, cx, cy, rx, ry) {
  const r = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return r >= 1 ? 0 : smooth(1 - r);
}

async function buildDepth() {
  const raw = Buffer.alloc(DEPTH_W * DEPTH_H);

  for (let py = 0; py < DEPTH_H; py += 1) {
    const y = (py + 0.5) / DEPTH_H;
    const base = profileAt(y);
    for (let px = 0; px < DEPTH_W; px += 1) {
      const x = (px + 0.5) / DEPTH_W;
      let d = base;

      // 男孩：画面正中偏下，最近的主体
      d += 0.3 * blob(x, y, 0.503, 0.785, 0.055, 0.115);

      // 左右两根路灯杆：站在近处的堤岸上，比楼群近得多
      d += 0.28 * blob(x, y, 0.122, 0.665, 0.035, 0.18);
      d += 0.28 * blob(x, y, 0.888, 0.665, 0.035, 0.18);

      raw[py * DEPTH_W + px] = Math.round(clamp01(d) * 255);
    }
  }

  await sharp(raw, { raw: { width: DEPTH_W, height: DEPTH_H, channels: 1 } })
    .blur(11) // 模糊掉所有硬边，避免视差位移时撕出锯齿
    .jpeg({ quality: 86 })
    .toFile(path.join(OUT_DIR, "shanghai-depth.jpg"));

  console.log(`shanghai-depth.jpg  ${DEPTH_W}×${DEPTH_H}（越亮越近）`);
}

await buildPhoto();
await buildDepth();
