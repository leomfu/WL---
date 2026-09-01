"use client";

import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "~/site.config";

/**
 * 首页顶上那一屏 —— 站主那张「背影走在空旷马路上」的照片，按 mono-color 单色印刷
 * 设计系统（github.com/yanliudesign/mono-color-skill）重做成一张编辑式海报。
 *
 * ── 为什么是手写 SVG 不是生成图 ──
 * 那个 skill 的默认交付是「提示词 + 生成的位图」，但它同时写明：没有图像生成能力时
 * 停在提示词。我没有生成图片的能力，而站上这一屏必须真的变；所以改成按它的
 * **设计系统**手写矢量 —— 同一套配方，只是渲染器换成了浏览器。
 * 好处是顺带保住了这个站「一张位图都不加载」的底线，任何屏幕都清晰。
 *
 * ── 配方（manifest）──
 *   subject         一个人背对镜头走在空旷的校园马路上
 *   intent          personal statement
 *   representation  abstract symbol extraction（手写矢量做不了照片级还原）
 *   identity anchors ①背影 + 书包 ②被拉长的影子 ③公路与黄色中线 ④远处的楼与细树
 *   substrate       Neutral White #FAFAF7 —— 和站点内容区的 #fafafa 几乎同色，
 *                   海报因此像直接印在页面上，不会像贴上去的一块图
 *   palette         Ultramarine + Safety Orange（目录里这一对指定用于 movement /
 *                   youth culture / active urban subjects，正好是这张照片）
 *   plate roles     群青 = 结构与节奏（路面、影子、人、楼、树）
 *                   橙   = **只给中线**这一个锚点。skill 明令 accent 不许当装饰撒。
 *   layout          image field —— 标题穿过影子，不做「标题一边照片一边」的安全分栏
 *   focal event     异常尺度关系：影子被放大到横贯整页，远比人本身大
 *   release zone    上半页大片留白，只有一条地平线和一处楼影
 *   disruption      标题被影子啃掉下半截（反白）
 *   manual gesture  右上角一个套准十字 + 一行极小的印刷注记（只用这一个手势家族）
 *   imperfections   两处，都是可控的：①橙版套准偏移 1.5px ②路面网点
 *
 * ── 「纸把图咬开」是怎么实现的 ──
 * 印刷里反白字是同一版上的镂空。这里的做法：标题先用群青画一遍（压在纸上那半截），
 * 再画油墨块盖住它，最后把同一行标题用**纸色**画一遍并 clip 到油墨块里 ——
 * 于是落在墨上的那半截自动变成反白。见下面 clip-ink。
 */

/* ── 画布：宽幅横版（网页 hero，不是 skill 默认的 3:4 竖版）───────────── */
const W = 1600;
const H = 900;
/** 地平线 / 灭点 —— 路、树、楼全都收敛到这里 */
const HORIZON = 430;
const VP_X = 1060;

/* ── 油墨（design-system/colors.json）──────────────────────────────── */
const PAPER = "#FAFAF7";
const INK = "#263E99"; // Ultramarine，主版，70–85%
const ACCENT = "#E55D2B"; // Safety Orange，副版，只画中线

/* ── 结构 ─────────────────────────────────────────────────────────── */

/** 路面：从灭点铺到画面底部，两侧都出血 */
const ROAD =
  `M ${VP_X} ${HORIZON} C 990 560, 620 700, -90 900 L 1700 900 C 1500 720, 1180 560, ${VP_X} ${HORIZON} Z`;

/**
 * 影子：焦点事件。照片里影子本来就长，这里把它放大到横贯整页并在左边缘裁断 ——
 * 「异常尺度关系」是 skill 列出的强焦点之一，比加任何特效都诚实。
 */
const SHADOW =
  "M 1096 566 C 940 604, 560 648, -110 660 L -110 812 C 420 792, 880 700, 1104 596 Z";

/** 人：背对镜头、迈步中。四肢用粗描边圆线帽 —— 圆线帽天然是关节，不会画崩 */
const FIG = {
  headCx: 1090,
  headCy: 398,
  headRx: 19,
  headRy: 22,
  /** 书包是背影最强的识别锚点，给它一块独立的方形质量 */
  pack: { x: 1063, y: 432, w: 54, h: 78, r: 14 },
  hood: "M 1066 434 C 1064 414, 1116 414, 1114 434 Z",
  legs: [
    { x1: 1080, y1: 506, x2: 1073, y2: 566, w: 17 },
    { x1: 1101, y1: 506, x2: 1110, y2: 558, w: 17 },
  ],
  arms: [
    { x1: 1066, y1: 444, x2: 1058, y2: 498, w: 11 },
    { x1: 1115, y1: 444, x2: 1122, y2: 494, w: 11 },
  ],
};

/**
 * 黄色中线 —— 橙版唯一的内容。做成一段段独立的梯形而不是一条虚线：
 * 近处宽而长、远处窄而短，透视才对。
 */
const DASHES = (() => {
  const near = { x: 1306, y: 900 };
  const far = { x: VP_X + 16, y: HORIZON + 26 };
  return [0, 0.17, 0.335, 0.48, 0.605, 0.71, 0.8, 0.874].map((t, i) => {
    const x = near.x + (far.x - near.x) * t;
    const y = near.y + (far.y - near.y) * t;
    const hw = 15 * (1 - t) + 1.6;
    const len = 78 * (1 - t) + 7;
    // 越远越贴近灭点方向，梯形跟着收窄
    const hw2 = hw * 0.72;
    return {
      key: i,
      d: `M ${x - hw} ${y} L ${x + hw} ${y} L ${x + hw2 - 6} ${y - len} L ${x - hw2 - 6} ${y - len} Z`,
    };
  });
})();

/** 远处那排细树：重复的节奏，高度往灭点收 */
const TREES = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8;
  const x = 1130 + t * 470;
  const h = 40 + t * 108;
  return { key: i, x, y: HORIZON + 4, h, w: 2.4 + t * 1.6 };
});

export function PosterHero() {
  const t = useTranslations("intro");
  const locale = useLocale();
  const en = locale === "en";
  const name = en ? siteConfig.nameEn : siteConfig.name;

  /** 中文九个字一行放得下；英文那句长得多，拆两行并压小 */
  const headline = t("tagline");
  const enLines = headline.split(" — ");
  const titleSize = en ? 62 : 104;

  return (
    <div className="poster relative w-full overflow-hidden" style={{ background: PAPER }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${headline} — ${name}`}
      >
        <defs>
          {/* 网点：近看是点，缩略图上仍是一块灰 —— skill 对复制层的要求 */}
          <pattern id="po-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1.35" fill={INK} />
          </pattern>
          <pattern id="po-dots-fine" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1" fill={INK} />
          </pattern>

          {/* 反白用的镂空范围：所有主版墨块合成一个 clip */}
          <clipPath id="clip-ink">
            <path d={ROAD} />
            <path d={SHADOW} />
          </clipPath>

          {/* 路面往灭点方向淡出，露出纸 —— 「纸把图咬开」，不是靠外框留白 */}
          <linearGradient id="po-fade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="58%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <mask id="po-road-mask">
            <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill="url(#po-fade)" />
          </mask>
        </defs>

        {/* 纸 */}
        <rect x="0" y="0" width={W} height={H} fill={PAPER} />

        {/* 释放区：上半页只有一条地平线和一片淡楼影 */}
        <rect x="1332" y="150" width="212" height={HORIZON - 150} fill="url(#po-dots-fine)" opacity="0.55" />
        <line x1="96" y1={HORIZON} x2="1504" y2={HORIZON} stroke={INK} strokeWidth="1.6" />

        {/* 标题第一遍：群青。压在纸上的那半截最终就是它 */}
        <g fontFamily="var(--font-serif, Georgia), serif" fill={INK}>
          {en ? (
            <text x="120" y="640" fontSize={titleSize} fontWeight={300}>
              <tspan x="120">{enLines[0]}</tspan>
              <tspan x="120" dy="76">
                {enLines[1] ? `— ${enLines[1]}` : ""}
              </tspan>
            </text>
          ) : (
            <text x="120" y="712" fontSize={titleSize} fontWeight={300} letterSpacing="6">
              {headline}
            </text>
          )}
        </g>

        {/* ── 主版墨块 ────────────────────────────────────────── */}
        <g mask="url(#po-road-mask)">
          <path d={ROAD} fill={INK} opacity="0.92" />
          {/* 路面的网点：近处密，让沥青有颗粒 */}
          <path d={ROAD} fill="url(#po-dots)" opacity="0.5" />
        </g>

        {/* 树和楼在路的后面、影子的前面 */}
        <g fill={INK}>
          {TREES.map((tr) => (
            <rect key={tr.key} x={tr.x} y={tr.y - tr.h} width={tr.w} height={tr.h} />
          ))}
        </g>

        {/* 影子 —— 焦点事件 */}
        <path d={SHADOW} fill={INK} opacity="0.86" />

        {/* 人 */}
        <g fill={INK} stroke={INK} strokeLinecap="round">
          {FIG.arms.map((a, i) => (
            <line key={`a${i}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} strokeWidth={a.w} />
          ))}
          {FIG.legs.map((l, i) => (
            <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={l.w} />
          ))}
          <path d={FIG.hood} />
          <rect
            x={FIG.pack.x}
            y={FIG.pack.y}
            width={FIG.pack.w}
            height={FIG.pack.h}
            rx={FIG.pack.r}
          />
          <ellipse cx={FIG.headCx} cy={FIG.headCy} rx={FIG.headRx} ry={FIG.headRy} />
        </g>

        {/* 标题第二遍：纸色，clip 在墨块里 —— 落到墨上的那半截自动反白 */}
        <g clipPath="url(#clip-ink)" fontFamily="var(--font-serif, Georgia), serif" fill={PAPER}>
          {en ? (
            <text x="120" y="640" fontSize={titleSize} fontWeight={300}>
              <tspan x="120">{enLines[0]}</tspan>
              <tspan x="120" dy="76">
                {enLines[1] ? `— ${enLines[1]}` : ""}
              </tspan>
            </text>
          ) : (
            <text x="120" y="712" fontSize={titleSize} fontWeight={300} letterSpacing="6">
              {headline}
            </text>
          )}
        </g>

        {/* ── 副版：橙。整张图里只有中线是它 ──────────────────
            故意整体偏移 1.5px —— 双色印刷的套准误差，skill 允许的两处可控瑕疵之一 */}
        <g fill={ACCENT} transform="translate(1.5 -1)" style={{ mixBlendMode: "multiply" }}>
          {DASHES.map((d) => (
            <path key={d.key} d={d.d} />
          ))}
        </g>

        {/* ── 文字：眉标 / 加油 / 署名 ─────────────────────── */}
        <g fill={INK}>
          <text
            x="120"
            y="250"
            fontSize="19"
            letterSpacing="7"
            fontFamily="var(--font-sans, system-ui), sans-serif"
          >
            {t("eyebrow")}
          </text>
          {t("taglineTail") && (
            <text
              x="120"
              y={en ? 766 : 776}
              fontSize="26"
              letterSpacing="10"
              fontFamily="var(--font-sans, system-ui), sans-serif"
            >
              {t("taglineTail")}
            </text>
          )}
          <text
            x="120"
            y={en ? 812 : 822}
            fontSize="18"
            letterSpacing="1.5"
            opacity="0.7"
            fontFamily="var(--font-sans, system-ui), sans-serif"
          >
            {name} · {t("taglineSub")}
          </text>
        </g>

        {/* 手动手势：套准十字 + 一行印刷注记。只用这一个手势家族 */}
        <g stroke={INK} strokeWidth="1.2" fill="none">
          <circle cx="1504" cy="118" r="11" />
          <line x1="1504" y1="99" x2="1504" y2="137" />
          <line x1="1485" y1="118" x2="1523" y2="118" />
        </g>
        <text
          x="1504"
          y="160"
          fontSize="13"
          letterSpacing="3"
          textAnchor="middle"
          fill={INK}
          opacity="0.55"
          fontFamily="var(--font-mono, ui-monospace), monospace"
        >
          2 INKS
        </text>
      </svg>
    </div>
  );
}
