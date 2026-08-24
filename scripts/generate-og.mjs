/**
 * 生成分享图 public/og.png（1200×630）。
 *
 * 为什么是脚本而不是 app/opengraph-image.tsx：静态导出下那个约定产出的文件没有扩展名
 * （out/zh/opengraph-image），GitHub Pages 这类纯静态托管会用错的 Content-Type 发它，
 * 抓取分享图的爬虫就不认。生成成一张普通的 public/og.png 最稳。
 *
 * 改了名字或一句话定位之后跑一次：npm run og
 *
 * 只用拉丁字符：底层的 satori 要画中文得显式喂 ttf/otf 字体文件，
 * 而站点用的中文字体是 woff2。所以这张图走英文名 + 英文一句话。
 */
import { readFile, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

// site.config.ts 是 TypeScript，node 直接 import 不了，正则取这三个字段就够了
const source = await readFile(new URL("../site.config.ts", import.meta.url), "utf8");
const field = (name, fallback) =>
  source.match(new RegExp(`${name}:\\s*"([^"]*)"`))?.[1] ?? fallback;

const nameEn = field("nameEn", "[Your Name]");
const taglineEn = field("taglineEn", "");
const since = field("since", "2026");

const box = (style, children) => h("div", { style: { display: "flex", ...style } }, children);

const image = new ImageResponse(
  box(
    {
      width: "100%",
      height: "100%",
      flexDirection: "column",
      justifyContent: "space-between",
      background: "#0A0A0A",
      color: "#EDEDED",
      padding: "72px 80px",
    },
    [
      box({ key: "top", fontSize: 18, letterSpacing: 8, color: "#8A8A8A" }, "PERSONAL SITE"),
      box({ key: "mid", flexDirection: "column", gap: 22 }, [
        box({ key: "name", fontSize: 84, letterSpacing: -1 }, nameEn),
        box({ key: "tag", fontSize: 28, color: "#A3A3A3" }, taglineEn),
      ]),
      box(
        {
          key: "bottom",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 18,
          letterSpacing: 6,
          color: "#5A5A5A",
        },
        [
          h("span", { key: "l" }, "MONOCHROME BY DESIGN"),
          h("span", { key: "r" }, `SINCE ${since}`),
        ],
      ),
    ],
  ),
  { width: 1200, height: 630 },
);

const buffer = Buffer.from(await image.arrayBuffer());
await writeFile(new URL("../public/og.png", import.meta.url), buffer);
console.log(`public/og.png 已生成（${(buffer.length / 1024).toFixed(0)} KB）`);
