/**
 * 把 scripts/music-chart.txt 解析成 content/music/chart.json —— 「按心情听」歌单。
 *
 * 音源改用 **Apple 官方 30 秒预览**（iTunes Search API，免费、不用 key、不用登录）：
 *   https://itunes.apple.com/search?term=<关键词>&entity=song&limit=N&country=CN
 * 每条结果自带 previewUrl（30 秒 m4a 直链，Apple 自己的 CDN，本来就是给外部试听用的，
 * 不下载、不进 git——20 首下下来 20MB 太重，且这条链接本身可重跑刷新）。
 *
 * 为什么不再用网易云直链（对照 scripts/fetch-netease.mjs）：那条路子要逐首验证
 * 外链能不能真放出声（版权锁掉的很多），Apple 预览没有这个问题——**前提是网络能连上**
 * `audio-ssl.itunes.apple.com`，这一点在大陆裸连下没有验证过，见下面的「未验证点」。
 *
 *   用法：npm run chart
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIST = path.join(ROOT, "scripts/music-chart.txt");
const OUT = path.join(ROOT, "content/music/chart.json");
const COVER_DIR = path.join(ROOT, "public/images/records");
/** 封面卡片同 records 那面墙一个尺寸档位 */
const COVER_SIZE = 480;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

/**
 * 按顺序尝试的 App Store 国家/地区代码。CN 优先（部署面向的观众），
 * 但有些歌（比如东南亚流行）压根没进 CN 的曲库，退而求其次试邻近地区。
 */
const COUNTRIES = ["CN", "US", "MY", "SG", "TW", "HK", "GB"];

/** 归一化：去空格/标点、转小写，方便做子串比对（中英文都适用） */
function norm(s) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[\s·・.\-_'’,，、&/()（）]/g, "");
}

/** 歌手可能是 "A / B" 或 "A & B" 这种多人组合，切开逐个比对 */
function artistTokens(s) {
  return (s ?? "")
    .split(/[/&,、，xX]| feat\.?| with /i)
    .map((t) => norm(t))
    .filter((t) => t.length >= 2);
}

/**
 * 搜一个词条，把所有国家/地区商店的结果**合并去重**再返回——不能拿到第一个非空结果就
 * 停下：CN 商店常常"有结果但歌手对不上"（比如同名曲被别的歌手占了），得等把几个地区都
 * 搜过、再统一挑歌手对得上的那条，不然会在真正对的版本（可能在 MY/SG 等地区商店）之前
 * 就误判"有结果了"而提前退出。
 */
async function searchAcrossCountries(term) {
  const byId = new Map();
  const countriesHit = [];
  for (const country of COUNTRIES) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10&country=${country}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) continue;
    const data = await res.json();
    const results = data?.results ?? [];
    if (results.length) countriesHit.push(country);
    for (const r of results) {
      if (!byId.has(r.trackId)) byId.set(r.trackId, { ...r, _country: country });
    }
  }
  return { results: [...byId.values()], countries: countriesHit };
}

/** 在候选里挑「歌手对得上、标题最接近」的一条；挑不出返回 null */
function pickBest(results, wantTitle, wantArtist) {
  const wantTitleNorm = norm(wantTitle);
  const wantTokens = artistTokens(wantArtist);

  const artistOk = results.filter((r) => {
    const candidateNorm = norm(r.artistName);
    return wantTokens.some((tok) => candidateNorm.includes(tok));
  });
  if (!artistOk.length) return null;

  // 标题完全对上（忽略括注，如 "(Live)"）的优先；同分再挑 trackId 最小的（通常是原版/更早收录）
  const scored = artistOk
    .map((r) => {
      const bareTitle = norm(r.trackName.replace(/[（(][^）)]*[）)]/g, ""));
      const exact = bareTitle === wantTitleNorm;
      const contains = bareTitle.includes(wantTitleNorm) || wantTitleNorm.includes(bareTitle);
      const isAltVersion = /live|remix|cover|acoustic|instrumental|karaoke|抒情版|dj|钢琴曲/i.test(
        r.trackName,
      );
      return { r, score: (exact ? 100 : contains ? 50 : 0) - (isAltVersion ? 10 : 0) };
    })
    .sort((a, b) => b.score - a.score || a.r.trackId - b.r.trackId);

  const top = scored[0];
  return top && top.score > 0 ? top.r : null;
}

/** artworkUrl100 → 600x600bb 高清封面地址 */
function hiResArtwork(url) {
  return url ? url.replace(/\d+x\d+bb(\.\w+)$/, `600x600bb$1`) : null;
}

function slugFromQuery(q) {
  return q
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- 解析 scripts/music-chart.txt ----
const raw = await readFile(LIST, "utf8");
const scenes = [];
let current = null;

for (const rawLine of raw.split("\n")) {
  const trimmedRaw = rawLine.trim();

  // 场景标题行自己就以 "##" 开头，必须先于「去行内注释」判断，否则会被当成注释吃掉
  const sceneMatch = trimmedRaw.match(/^##\s*(\S+)\s*\|\s*(.+?)\s*\/\s*(.+)$/);
  if (sceneMatch) {
    current = {
      key: sceneMatch[1],
      label: sceneMatch[2].trim(),
      labelEn: sceneMatch[3].trim(),
      tracks: [],
    };
    scenes.push(current);
    continue;
  }

  // 普通行：去掉行内 "# 备注" 部分（不会跟 "##" 场景标题混淆，因为上面已经 continue 掉了）
  const line = trimmedRaw.replace(/#.*$/, "").trim();
  if (!line) continue;

  if (!current) continue; // 场景标题之前的裸行忽略（不应该有）

  const placeholder = /\?\s*$/.test(line);
  const query = line.replace(/\?\s*$/, "").trim();
  const sepIdx = query.indexOf(" - ");
  if (sepIdx < 0) {
    console.log(`  ✗ 这一行看不出「歌名 - 歌手」的结构，跳过：${query}`);
    continue;
  }
  const title = query.slice(0, sepIdx).trim();
  const artist = query.slice(sepIdx + 3).trim();
  current.tracks.push({ query, title, artist, placeholder });
}

const totalLines = scenes.reduce((n, s) => n + s.tracks.length, 0);
if (totalLines === 0) {
  console.log("清单是空的，什么也没做。");
  process.exit(0);
}
console.log(`清单 ${scenes.length} 个场景、共 ${totalLines} 首，开始去 iTunes 核对…\n`);

await mkdir(COVER_DIR, { recursive: true });

let sharp = null;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.warn(
    "⚠️ 没找到 sharp（Next 的传递依赖，本机通常已有）。封面会跳过下载，只写文字信息。" +
      " 需要封面的话：npm i -D sharp，取完图再卸掉，重跑一次。",
  );
}

/**
 * `desc`/`descEn`/`descDraft` 是站主（或代笔）手填的一句歌曲描述，不是从 iTunes 查来的，
 * 重跑这个脚本会整份重写 chart.json，不额外处理的话手改的描述会被冲掉。
 * 做法跟 fetch-netease.mjs 保留 previewStart 一样：先把旧文件读出来，按
 * `场景 key + query`（query 就是 music-chart.txt 那一行原文，同一首歌重跑基本不变）
 * 记一份，写新文件时按同样的 key 找回来贴上去。
 */
const keepDesc = new Map();
if (fs.existsSync(OUT)) {
  try {
    const old = JSON.parse(await readFile(OUT, "utf8"));
    for (const scene of old.scenes ?? []) {
      for (const t of scene.tracks ?? []) {
        if (t.desc || t.descEn) {
          keepDesc.set(`${scene.key}::${t.query}`, {
            desc: t.desc,
            descEn: t.descEn,
            descDraft: t.descDraft,
          });
        }
      }
    }
  } catch {
    // 旧文件读不出来就当没有，不阻塞这次生成
  }
}
if (keepDesc.size) console.log(`保留 ${keepDesc.size} 条手填的歌曲描述\n`);

const skipped = [];
const outScenes = [];

for (const scene of scenes) {
  console.log(`## ${scene.label} / ${scene.labelEn}`);
  const outTracks = [];

  for (const item of scene.tracks) {
    const { results } = await searchAcrossCountries(`${item.title} ${item.artist}`);
    const best = pickBest(results, item.title, item.artist);

    if (!best) {
      console.log(`  ✗ 「${item.query}」——没找到歌手对得上的版本，跳过`);
      skipped.push(item.query);
      continue;
    }

    let cover = null;
    if (sharp && best.artworkUrl100) {
      const slug = `chart-${best.trackId}`;
      const file = path.join(COVER_DIR, `${slug}.webp`);
      cover = `/images/records/${slug}.webp`;
      if (!fs.existsSync(file)) {
        try {
          const artRes = await fetch(hiResArtwork(best.artworkUrl100), {
            headers: { "User-Agent": UA },
          });
          if (artRes.ok) {
            const buf = Buffer.from(await artRes.arrayBuffer());
            await sharp(buf).resize(COVER_SIZE, COVER_SIZE, { fit: "cover" }).webp({ quality: 82 }).toFile(file);
          } else {
            cover = null;
          }
        } catch {
          cover = null;
        }
      }
    }

    const kept = keepDesc.get(`${scene.key}::${item.query}`);

    outTracks.push({
      query: item.query,
      title: best.trackName,
      artist: best.artistName,
      album: best.collectionName ?? null,
      previewUrl: best.previewUrl ?? null,
      cover,
      platformUrl: best.trackViewUrl ?? null,
      durationMs: best.trackTimeMillis ?? null,
      placeholder: item.placeholder,
      ...(kept ?? {}),
    });

    console.log(
      `  ${item.placeholder ? "○" : "✓"} ${best.trackName} - ${best.artistName}` +
        `（${best._country}${item.placeholder ? "，代选" : ""}${best.previewUrl ? "" : "，⚠️ 无预览直链"}）`,
    );
  }

  outScenes.push({ key: scene.key, label: scene.label, labelEn: scene.labelEn, tracks: outTracks });
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      note:
        "由 scripts/fetch-music-chart.mjs 生成，别手改；要增删歌改 scripts/music-chart.txt 后跑 npm run chart。",
      scenesNote:
        "⚠️ 场景名（key/label/labelEn）是代拟的，请站主改成自己的说法——改 scripts/music-chart.txt 里 `## key | 中文 / English` 那一行，重跑脚本。",
      placeholderNote:
        "placeholder: true 的条目是代选（不是站主明确点名的歌），标了这个字段方便站主一眼看出哪些该删该换。",
      unverifiedNote:
        "previewUrl 指向 audio-ssl.itunes.apple.com。本机（挂着代理）实测直链可用（HTTP 200，约 1MB 的 audio/x-m4p），但没有条件验证大陆裸连能否直连这个域名——上线前建议站主自己在真实网络环境下测一次。某条没有 previewUrl 时页面应退化成只显示封面 + platformUrl 外链，不要假设「一定能播」。",
      descNote:
        "⚠️ desc/descEn 是 AI 代拟的初稿（每条都标了 descDraft: true），只依据编曲/乐器/节奏/公认情绪基调写的一句话，不涉及站主的私人感受——这是个人站，别人代写的感受不该冒充成站主自己的。站主应该把它们换成自己的话，写法和保留机制见 docs/如何加歌.md。",
      skipped,
      scenes: outScenes,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

const written = outScenes.reduce((n, s) => n + s.tracks.length, 0);
console.log(`\n写入 ${written} 首到 content/music/chart.json（${outScenes.length} 个场景）。`);
if (skipped.length) {
  console.log(`跳过 ${skipped.length} 首（没找到歌手对得上的版本，如实跳过，没有塞错的进去）：`);
  for (const q of skipped) console.log(`  - ${q}`);
}
