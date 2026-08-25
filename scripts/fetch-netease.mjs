/**
 * 把 scripts/netease-songs.txt 里的歌解析成 content/music/netease.json。
 *
 * 为什么要这一步：网易云没有给第三方站点用的播放接口，能用的只有
 * `song/media/outer/url` 这个老外链，而且**大部分歌因为版权放不出来**。
 * 所以曲目清单在**构建前**就定下来（这个脚本跑一次，结果提交进仓库），
 * 线上不再请求网易云的接口 —— 部署平台的构建机连不连得上国内都无所谓。
 *
 *   用法：npm run music
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIST = path.join(ROOT, "scripts/netease-songs.txt");
const OUT = path.join(ROOT, "content/music/netease.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const HEADERS = { "User-Agent": UA, Referer: "https://music.163.com/" };

const api = async (url) => {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

/** 歌名 → id（取搜索结果第一条） */
async function search(term) {
  const url = `https://music.163.com/api/search/get?s=${encodeURIComponent(term)}&type=1&limit=1`;
  const data = await api(url);
  const song = data?.result?.songs?.[0];
  return song ? String(song.id) : null;
}

/** 批量取详情：名字 / 歌手 / 时长 */
async function detail(ids) {
  const url = `https://music.163.com/api/song/detail?ids=${encodeURIComponent(JSON.stringify(ids.map(Number)))}`;
  const data = await api(url);
  return new Map(
    (data.songs ?? []).map((s) => [
      String(s.id),
      {
        title: s.name,
        artist: (s.artists ?? []).map((a) => a.name).join(" / "),
        duration: Math.round((s.duration ?? 0) / 1000),
      },
    ]),
  );
}

/**
 * 外链能不能真放出声：能放时返回 audio/*，被版权锁住时会 302 到 music.163.com/404
 * （一个 html 页面）。只取前几 KB，不用真的下整首。
 */
async function playable(id) {
  const res = await fetch(`https://music.163.com/song/media/outer/url?id=${id}.mp3`, {
    headers: { ...HEADERS, Range: "bytes=0-2000" },
    redirect: "follow",
  });
  return (res.headers.get("content-type") ?? "").includes("audio");
}

const raw = await readFile(LIST, "utf8");
const entries = raw
  .split("\n")
  .map((line) => line.replace(/#.*$/, "").trim())
  .filter(Boolean);

if (entries.length === 0) {
  console.log("清单是空的，什么也没做。");
  process.exit(0);
}

console.log(`清单 ${entries.length} 条，开始解析…`);

const ids = [];
for (const entry of entries) {
  if (/^\d+$/.test(entry)) {
    ids.push(entry);
    continue;
  }
  const found = await search(entry);
  if (found) {
    console.log(`  搜到「${entry}」→ ${found}`);
    ids.push(found);
  } else {
    console.log(`  ✗ 没搜到「${entry}」，跳过`);
  }
}

const details = await detail(ids);
const tracks = [];
const rejected = [];

for (const id of ids) {
  const info = details.get(id);
  if (!info) {
    rejected.push({ id, reason: "查不到这首歌" });
    continue;
  }
  const ok = await playable(id);
  if (ok) {
    tracks.push({ id, ...info });
    console.log(`  ✅ ${info.title} - ${info.artist}`);
  } else {
    rejected.push({ id, reason: "版权限制，外链放不出来", ...info });
    console.log(`  ❌ ${info.title} - ${info.artist}（版权限制）`);
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      note: "由 scripts/fetch-netease.mjs 生成，别手改；要增删歌改 scripts/netease-songs.txt 后跑 npm run music",
      playlistUrl: "https://music.163.com/#/playlist?id=7044876104",
      tracks,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`\n能放的 ${tracks.length} 首已写进 content/music/netease.json`);
if (rejected.length) {
  console.log(`放不了的 ${rejected.length} 首（没写进去）：`);
  for (const r of rejected) console.log(`  - ${r.title ?? r.id}：${r.reason}`);
}
