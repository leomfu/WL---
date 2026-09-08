"use client";

import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "~/site.config";

/**
 * 首页顶上那一屏 —— 站主那张「背影走在空旷马路上」的照片，按 mono-color 单色印刷
 * 设计系统（github.com/yanliudesign/mono-color-skill）排成一张编辑式海报。
 *
 * ── 图从哪来 ──
 * **是那张真照片，不是画的。** 原图放在 hero-src/（不进 git），
 * `npm run hero`（scripts/build-hero.mjs）把它印成双色调再输出 webp 进仓库 ——
 * 和 npm run photos / og / news 是同一套「本地跑、产物进仓库」的约定。
 * 换照片就替换 hero-src/road.png 重跑一次，这个组件不用动。
 *
 * ── 配方（SKILL.md 要求的 manifest）──
 *   subject         一个人背对镜头走在空旷的校园马路上
 *   representation  faithful reproduction（照片本身转网点/双色，不是抽象重画）
 *   substrate       Neutral White #FAFAF7 —— 和内容区的 #fafafa 几乎同色，
 *                   海报因此像印在页面上；照片的高光被硬剪到纸色，
 *                   天空那一带直接融进页面，看不到图片的矩形上边
 *   palette         Ultramarine + Safety Orange（目录指定用于 movement /
 *                   youth culture / active urban subjects）
 *   plate roles     群青 = 整张照片的影调；橙 = **只有路面那条中线**（占 0.77% 像素）
 *   layout          image field：照片占约 70%、在右边缘出血；标题**穿进**照片
 *   focal event     标题横穿路面并在照片里反白，正好停在走路的人跟前
 *   release zone    左侧和下方的纸
 *   manual gesture  一个套准十字 + 一行印刷注记（只用这一个手势家族）
 *
 * ── 反白是真镂空 ──
 * 标题画两遍：先群青画一遍（落在纸上的那半截就是它），再画照片盖住，
 * 最后同一行用**纸色**画一遍并 clip 到照片矩形里 —— 落进照片的那半截自动变反白。
 * 别改成给文字加白描边，那是描边不是镂空。
 */

const W = 1600;
const H = 900;

/** 照片在版面里的位置：右边缘出血（skill 要求「在至少一个边缘果断裁切」） */
const IMG = { x: 470, y: 108, w: 1190, h: 720 };

const PAPER = "#FAFAF7";
const INK = "#263E99";

/**
 * 标题。要画两遍（群青一遍、纸色一遍 clip 在照片里），内容必须完全一致，
 * 所以抽成一个组件；**放在模块级而不是渲染函数里** —— React 19 的
 * react-hooks/static-components 不允许在渲染中创建组件。
 */
function Title({
  fill,
  en,
  headline,
  enLines,
  size,
}: {
  fill: string;
  en: boolean;
  headline: string;
  enLines: string[];
  size: number;
}) {
  return (
    <g fontFamily="var(--font-serif, Georgia), serif" fill={fill}>
      {en ? (
        <text x="110" y="548" fontSize={size} fontWeight={300}>
          <tspan x="110">{enLines[0]}</tspan>
          <tspan x="110" dy="70">
            {enLines[1] ? `— ${enLines[1]}` : ""}
          </tspan>
        </text>
      ) : (
        <text x="110" y="600" fontSize={size} fontWeight={300} letterSpacing="6">
          {headline}
        </text>
      )}
    </g>
  );
}

export function PosterHero() {
  const t = useTranslations("intro");
  const locale = useLocale();
  const en = locale === "en";
  const name = en ? siteConfig.nameEn : siteConfig.name;

  const headline = t("tagline");
  /** 英文那句长得多，在破折号处拆两行并压小 */
  const enLines = headline.split(" — ");
  const size = en ? 58 : 96;

  return (
    <div className="relative w-full" style={{ background: PAPER }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${headline} — ${name}`}
      >
        <defs>
          {/* slice 会让 <image> 溢出自己的框，必须裁；这个矩形同时是反白的镂空范围 */}
          <clipPath id="ph-frame">
            <rect x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} />
          </clipPath>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill={PAPER} />

        {/* 标题第一遍：群青。压在纸上的那半截最终就是它 */}
        <Title fill={INK} en={en} headline={headline} enLines={enLines} size={size} />

        {/* 照片 —— 双色调由 scripts/build-hero.mjs 生成，这里只负责摆放 */}
        <image
          href="/images/hero/road.webp"
          x={IMG.x}
          y={IMG.y}
          width={IMG.w}
          height={IMG.h}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#ph-frame)"
        />

        {/* 标题第二遍：纸色，clip 在照片里 —— 落进照片的那半截自动反白 */}
        <g clipPath="url(#ph-frame)">
          <Title fill={PAPER} en={en} headline={headline} enLines={enLines} size={size} />
        </g>

        {/* 眉标 / 加油 / 署名 —— 都留在纸上，小字压在照片上会读不清 */}
        <g fill={INK} fontFamily="var(--font-sans, system-ui), sans-serif">
          <text x="110" y="156" fontSize="18" letterSpacing="7">
            {t("eyebrow")}
          </text>
          {t("taglineTail") && (
            <text x="110" y={en ? 688 : 672} fontSize="25" letterSpacing="10">
              {t("taglineTail")}
            </text>
          )}
          <text x="110" y="872" fontSize="17" letterSpacing="1.4" opacity="0.72">
            {name} · {t("taglineSub")}
          </text>
        </g>

        {/* 手动手势：套准十字 + 印刷注记。整版只用这一个手势家族 */}
        <g stroke={INK} strokeWidth="1.2" fill="none">
          <circle cx="1418" cy="866" r="9" />
          <line x1="1418" y1="851" x2="1418" y2="881" />
          <line x1="1403" y1="866" x2="1433" y2="866" />
        </g>
        <text
          x="1444"
          y="871"
          fontSize="12.5"
          letterSpacing="3"
          fill={INK}
          opacity="0.55"
          fontFamily="var(--font-mono, ui-monospace), monospace"
        >
          2 INKS · ULTRAMARINE / SAFETY ORANGE
        </text>
      </svg>
    </div>
  );
}
