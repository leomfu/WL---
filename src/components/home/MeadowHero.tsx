"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "~/site.config";

/**
 * 首页顶上那一屏：**一个男孩躺在草坪上，手枕在脑后**。
 *
 * ── 为什么是代码画的，不是一张照片 ──
 * 这个站从开场页起就是「全部用代码画，一张位图都不加载」。而且静态导出没开图片优化，
 * 一张够清晰的大图在手机上是实打实的负担。代码画还有照片给不了的东西：**它会动，
 * 而且会跟着你此刻的真实时间换天色**。
 *
 * ── 时间感 ──
 * 原来的开场页正中是一只钟，用户要求拿掉。但整个站的主线是时间（放松区的时间盘、
 * 番茄钟、时刻表的站台钟都在这条线上），所以时间没有消失，只是从「读数」变成了「光」：
 * 早晨清透、正午高光、黄昏橘金、夜里星空。**没有钟，但时间还在。**
 *
 * ── 怎么做到不 hydration mismatch ──
 * 服务端不知道访客此刻几点，所以首帧一律按 day 那套色渲染；所有跟时间有关的颜色都是
 * CSS 变量，挂载后由 effect 直接写到根节点的 style 上（`setProperty`），
 * 不经过 React state —— 既不会首帧不一致，也不违反 React 19「不要在 effect 里 setState」。
 * 和 intro/TimeDial 是同一套路子。
 *
 * ── 随机但确定 ──
 * 草叶、云、星点的位置都由一个定种子的伪随机数发生器生成（mulberry32），
 * 服务端和浏览器算出来完全一样。**不要换成 Math.random()**，那样每次渲染都不同，
 * 服务端和客户端的 DOM 对不上。
 */

/* ── 画布 ─────────────────────────────────────────────── */
const VB_W = 1440;
const VB_H = 900;
/** 地平线：天空和草地的分界 */
const HORIZON = 622;

/* ── 定种子伪随机 ──────────────────────────────────────── */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = (r: () => number, min: number, max: number) => min + r() * (max - min);

/* ── 四档天色 ──────────────────────────────────────────
   用户要「鲜一点，真的草绿蓝天」，所以饱和度没有压。
   往下滚一屏就是严格黑白灰的内容区，靠这一屏底部的渐隐收口（见组件末尾那层）。 */
type Phase = "dawn" | "day" | "dusk" | "night";

const PALETTE: Record<Phase, Record<string, string>> = {
  dawn: {
    "--sky-top": "#1F3B66",
    "--sky-mid": "#7C9DC6",
    "--sky-low": "#F2C79B",
    "--sky-horizon": "#FDE7C7",
    "--sun-x": "1096px",
    "--sun-y": "486px",
    "--sun-s": "1.16",
    "--sun": "#FFF1D4",
    "--sun-glow": "rgba(255,206,142,0.55)",
    "--hill-far": "#6B8A72",
    "--hill-near": "#47654F",
    "--grass-top": "#74A452",
    "--grass-bot": "#2F4C29",
    "--blade": "#41682F",
    "--blade-lit": "#93BE62",
    "--figure": "#1E2C1B",
    "--cloud": "rgba(255,238,222,0.8)",
    "--cloud-op": "0.9",
    "--star-op": "0",
    "--ink": "#FFF6EA",
    "--ink-dim": "rgba(255,246,234,0.74)",
  },
  day: {
    "--sky-top": "#1E6FC4",
    "--sky-mid": "#57A2E2",
    "--sky-low": "#A6D6F5",
    "--sky-horizon": "#DCEFFB",
    "--sun-x": "1148px",
    "--sun-y": "196px",
    "--sun-s": "0.92",
    "--sun": "#FFFEF4",
    "--sun-glow": "rgba(255,252,214,0.5)",
    "--hill-far": "#6E9B6C",
    "--hill-near": "#4C7A45",
    "--grass-top": "#7FC24E",
    "--grass-bot": "#357030",
    "--blade": "#4C8A34",
    "--blade-lit": "#A6DC68",
    "--figure": "#22371D",
    "--cloud": "rgba(255,255,255,0.92)",
    "--cloud-op": "1",
    "--star-op": "0",
    "--ink": "#FFFFFF",
    "--ink-dim": "rgba(255,255,255,0.78)",
  },
  dusk: {
    "--sky-top": "#252F63",
    "--sky-mid": "#7B5A92",
    "--sky-low": "#E8895F",
    "--sky-horizon": "#FBC77E",
    "--sun-x": "1042px",
    "--sun-y": "588px",
    "--sun-s": "1.4",
    "--sun": "#FFD79A",
    "--sun-glow": "rgba(255,150,80,0.5)",
    "--hill-far": "#4A4A63",
    "--hill-near": "#333A48",
    "--grass-top": "#4E7A3E",
    "--grass-bot": "#20361F",
    "--blade": "#2F5528",
    "--blade-lit": "#7EA553",
    "--figure": "#141E13",
    "--cloud": "rgba(255,196,158,0.7)",
    "--cloud-op": "0.85",
    "--star-op": "0.35",
    "--ink": "#FFF3E4",
    "--ink-dim": "rgba(255,243,228,0.74)",
  },
  night: {
    "--sky-top": "#070C1C",
    "--sky-mid": "#101B3A",
    "--sky-low": "#1B2B4E",
    "--sky-horizon": "#2C4066",
    "--sun-x": "1150px",
    "--sun-y": "182px",
    "--sun-s": "0.76",
    "--sun": "#EFF3FF",
    "--sun-glow": "rgba(190,212,255,0.34)",
    "--hill-far": "#1A2438",
    "--hill-near": "#131A2A",
    "--grass-top": "#22432A",
    "--grass-bot": "#0D1A12",
    "--blade": "#18301C",
    "--blade-lit": "#3C6B3E",
    "--figure": "#070D08",
    "--cloud": "rgba(150,170,210,0.22)",
    "--cloud-op": "0.5",
    "--star-op": "1",
    "--ink": "#EAF1FF",
    "--ink-dim": "rgba(234,241,255,0.7)",
  },
};

function phaseOf(hour: number): Phase {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/* ── 场景元素：全部定种子生成 ──────────────────────────── */

/** 远处那排草：贴着地平线，矮而密，把地平线的硬边化掉 */
const FAR_BLADES = (() => {
  const r = mulberry32(0x5eed);
  return Array.from({ length: 130 }, () => {
    const x = rnd(r, -20, VB_W + 20);
    const h = rnd(r, 10, 30);
    const lean = rnd(r, -7, 7);
    return { x, y: rnd(r, HORIZON - 2, HORIZON + 14), h, lean, w: rnd(r, 1.4, 2.6) };
  });
})();

/** 前景的草：高、粗、会摇，压在人物腿脚上，做出「躺在草里」而不是「躺在草前面」 */
const NEAR_BLADES = (() => {
  const r = mulberry32(0xb1ade);
  return Array.from({ length: 64 }, (_, i) => {
    const depth = r();
    const y = rnd(r, 700, VB_H + 30);
    return {
      key: i,
      x: rnd(r, -40, VB_W + 40),
      y,
      h: rnd(r, 70, 210) * (0.6 + depth * 0.7),
      lean: rnd(r, -34, 34),
      w: rnd(r, 3, 7.5),
      lit: r() > 0.55,
      /** 摇摆：每根自己的角度和周期，错开才像风 */
      a: rnd(r, -2.6, -0.4),
      b: rnd(r, 0.4, 3.0),
      dur: rnd(r, 4.2, 8.6),
      delay: rnd(r, -6, 0),
    };
  });
})();

/** 云：每朵是几个椭圆叠起来的一团，整团缓慢横向漂 */
const CLOUDS = (() => {
  const r = mulberry32(0xc10d);
  return Array.from({ length: 5 }, (_, i) => ({
    key: i,
    y: rnd(r, 90, 380),
    scale: rnd(r, 0.6, 1.5),
    dur: rnd(r, 150, 300),
    delay: rnd(r, -160, 0),
    op: rnd(r, 0.45, 1),
    puffs: Array.from({ length: 5 }, () => ({
      cx: rnd(r, -90, 90),
      cy: rnd(r, -14, 14),
      rx: rnd(r, 40, 86),
      ry: rnd(r, 20, 38),
    })),
  }));
})();

/** 星点：只有夜里才亮（靠 --star-op 整组控制），位置只落在天空那半边 */
const STARS = (() => {
  const r = mulberry32(0x57a5);
  return Array.from({ length: 120 }, (_, i) => ({
    key: i,
    x: rnd(r, 0, VB_W),
    y: rnd(r, 0, HORIZON - 40),
    r: rnd(r, 0.6, 1.9),
    o: rnd(r, 0.3, 1),
    dur: rnd(r, 2.6, 7),
    delay: rnd(r, -6, 0),
  }));
})();

/**
 * 人物剪影。四肢用「粗描边 + 圆线帽」画 —— 这是画人形最稳的办法：
 * 圆线帽天然就是关节，不用去描一条闭合轮廓，也就不会画崩。
 * 姿势：头在左，膝盖弓起，两臂向后张开、手枕在脑后。
 */
const FIG = {
  head: { cx: 566, cy: 612, rx: 27, ry: 25 },
  torso: { x1: 628, y1: 620, x2: 744, y2: 632, w: 54 },
  /** 远端那条手臂稍高一点、细一点，画在身体后面，做出两条手臂的厚度 */
  armFar: { p: [640, 610, 596, 546, 549, 592], w: 17 },
  armNear: { p: [632, 622, 586, 560, 540, 604], w: 19 },
  legFar: { p: [748, 634, 794, 566, 820, 646], w: 22 },
  legNear: { p: [742, 636, 808, 552, 838, 648], w: 25 },
  foot: { x1: 838, y1: 648, x2: 862, y2: 640, w: 14 },
};

const limb = (p: number[]) => `M ${p[0]} ${p[1]} L ${p[2]} ${p[3]} L ${p[4]} ${p[5]}`;

export function MeadowHero() {
  const t = useTranslations("intro");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;

  /** 挂载后按访客本地时间换一套色；每 5 分钟对一次，跨过日落也会自己变 */
  useEffect(() => {
    const apply = () => {
      const node = rootRef.current;
      if (!node) return;
      const vars = PALETTE[phaseOf(new Date().getHours())];
      for (const [k, v] of Object.entries(vars)) node.style.setProperty(k, v);
    };
    apply();
    const timer = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  /** 首帧（服务端 + hydration）固定用 day，effect 之后才换成真实时段 */
  const initialVars = useMemo(() => PALETTE.day as React.CSSProperties, []);

  return (
    <div
      ref={rootRef}
      style={initialVars}
      className="meadow relative isolate h-[min(84vh,760px)] w-full overflow-hidden"
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="mh-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--sky-top)" }} />
            <stop offset="42%" style={{ stopColor: "var(--sky-mid)" }} />
            <stop offset="78%" style={{ stopColor: "var(--sky-low)" }} />
            <stop offset="100%" style={{ stopColor: "var(--sky-horizon)" }} />
          </linearGradient>
          <linearGradient id="mh-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--grass-top)" }} />
            <stop offset="100%" style={{ stopColor: "var(--grass-bot)" }} />
          </linearGradient>
          <radialGradient id="mh-sunglow">
            <stop offset="0%" style={{ stopColor: "var(--sun-glow)" }} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* 天 */}
        <rect x="0" y="0" width={VB_W} height={HORIZON + 4} fill="url(#mh-sky)" />

        {/* 星：整组靠 --star-op 开关，白天就是 0 */}
        <g className="mh-stars">
          {STARS.map((s) => (
            <circle
              key={s.key}
              cx={s.x}
              cy={s.y}
              r={s.r}
              className="mh-star"
              style={
                {
                  "--o": s.o,
                  animationDuration: `${s.dur}s`,
                  animationDelay: `${s.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>

        {/* 日 / 月 —— 位置和大小跟着时段变。
            注意：cx/cy/r 这些**几何属性吃不进 var()**，所以画在原点、靠 CSS transform 挪过去；
            transform-box/origin 显式钉死，否则 scale 会绕 viewBox 中心缩放，位置就飞了。 */}
        <g className="mh-sun">
          <circle cx={0} cy={0} r={200} fill="url(#mh-sunglow)" />
          <circle cx={0} cy={0} r={50} className="mh-sun-disc" />
        </g>

        {/* 云 */}
        <g className="mh-clouds">
          {CLOUDS.map((c) => (
            <g
              key={c.key}
              className="mh-cloud"
              style={
                {
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                  opacity: c.op,
                } as React.CSSProperties
              }
            >
              <g transform={`translate(0 ${c.y}) scale(${c.scale})`}>
                {c.puffs.map((p, i) => (
                  <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} className="mh-puff" />
                ))}
              </g>
            </g>
          ))}
        </g>

        {/* 远山：两层，把天和地连起来 */}
        <path
          d={`M0 ${HORIZON - 46} C 220 ${HORIZON - 96}, 430 ${HORIZON - 22}, 660 ${HORIZON - 52} S 1130 ${HORIZON - 104}, ${VB_W} ${HORIZON - 44} L ${VB_W} ${HORIZON + 10} L 0 ${HORIZON + 10} Z`}
          className="mh-hill-far"
        />
        <path
          d={`M0 ${HORIZON - 14} C 260 ${HORIZON - 48}, 520 ${HORIZON + 4}, 830 ${HORIZON - 26} S 1240 ${HORIZON - 54}, ${VB_W} ${HORIZON - 16} L ${VB_W} ${HORIZON + 12} L 0 ${HORIZON + 12} Z`}
          className="mh-hill-near"
        />

        {/* 草地 */}
        <rect x="0" y={HORIZON} width={VB_W} height={VB_H - HORIZON} fill="url(#mh-grass)" />

        {/* 贴地平线那排矮草 */}
        <g strokeLinecap="round" fill="none" opacity="0.75" className="mh-far-blades">
          {FAR_BLADES.map((b, i) => (
            <path
              key={i}
              d={`M ${b.x} ${b.y} Q ${b.x + b.lean * 0.4} ${b.y - b.h * 0.6} ${b.x + b.lean} ${b.y - b.h}`}
              strokeWidth={b.w}
            />
          ))}
        </g>

        {/* 人：躺着，膝盖弓起，手枕在脑后。
            整组往下平移 46 —— FIG 里那套坐标算出来身体主体在 545~660，
            而地平线在 622，不移的话大半个身子落在天空里，读起来像躺在山脊上。
            下移之后躯干整个在草地里，只有弓起的膝盖探出地平线，那是对的。
            要微调姿势改 FIG 就行，这个 translate 只管整体高度。 */}
        <g
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mh-figure"
          transform="translate(0 46)"
        >
          {/* 远端的手臂和腿先画，压在身体下面 */}
          <path d={limb(FIG.armFar.p)} fill="none" strokeWidth={FIG.armFar.w} opacity="0.82" />
          <path d={limb(FIG.legFar.p)} fill="none" strokeWidth={FIG.legFar.w} opacity="0.82" />
          {/* 躯干 */}
          <line
            x1={FIG.torso.x1}
            y1={FIG.torso.y1}
            x2={FIG.torso.x2}
            y2={FIG.torso.y2}
            strokeWidth={FIG.torso.w}
          />
          {/* 头 + 一点头发的隆起 */}
          <ellipse cx={FIG.head.cx} cy={FIG.head.cy} rx={FIG.head.rx} ry={FIG.head.ry} />
          <ellipse cx={FIG.head.cx - 9} cy={FIG.head.cy - 9} rx={22} ry={18} />
          {/* 脖子 */}
          <line x1={588} y1={616} x2={630} y2={620} strokeWidth={26} />
          {/* 近端的手臂和腿 */}
          <path d={limb(FIG.armNear.p)} fill="none" strokeWidth={FIG.armNear.w} />
          <path d={limb(FIG.legNear.p)} fill="none" strokeWidth={FIG.legNear.w} />
          <line
            x1={FIG.foot.x1}
            y1={FIG.foot.y1}
            x2={FIG.foot.x2}
            y2={FIG.foot.y2}
            strokeWidth={FIG.foot.w}
          />
        </g>

        {/* 前景的草：画在人后面一层，压住腿脚 —— 「躺在草里」而不是「躺在草前面」 */}
        <g strokeLinecap="round" fill="none" className="mh-field">
          {NEAR_BLADES.map((b) => (
            <g
              key={b.key}
              className="mh-blade"
              transform={`translate(${b.x} ${b.y})`}
              style={
                {
                  "--a": `${b.a}deg`,
                  "--b": `${b.b}deg`,
                  animationDuration: `${b.dur}s`,
                  animationDelay: `${b.delay}s`,
                } as React.CSSProperties
              }
            >
              <path
                d={`M 0 0 Q ${b.lean * 0.35} ${-b.h * 0.58} ${b.lean} ${-b.h}`}
                className={b.lit ? "mh-lit" : "mh-dark"}
                strokeWidth={b.w}
              />
            </g>
          ))}
        </g>
      </svg>

      {/* 文字：压在天空那半边 */}
      <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 lg:px-[92px]">
        <div className="max-w-[680px]">
          <span
            className="block text-[10.5px] uppercase tracking-[0.34em]"
            style={{ color: "var(--ink-dim)" }}
          >
            {t("eyebrow")}
          </span>
          <h1
            className="mt-5 font-serif text-[38px] leading-[1.16] tracking-[-0.01em] sm:text-[54px] lg:text-[66px]"
            style={{ fontWeight: 200, color: "var(--ink)" }}
          >
            {t("tagline")}
          </h1>
          {t("taglineTail") && (
            <span
              className="mt-3 block text-[13px] tracking-[0.16em] sm:text-[15px]"
              style={{ color: "var(--ink-dim)" }}
            >
              {t("taglineTail")}
            </span>
          )}
          <span
            className="mt-6 block text-[12px] tracking-[0.05em] sm:text-[13.5px]"
            style={{ color: "var(--ink-dim)" }}
          >
            {name} · {t("taglineSub")}
          </span>
        </div>
      </div>

      {/* 底部收口：这一屏是彩色的，下面整站是黑白灰，靠这层渐隐把跳变接住 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background:
            "linear-gradient(to bottom, rgba(250,250,250,0) 0%, rgba(250,250,250,0.72) 62%, var(--color-paper) 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}
