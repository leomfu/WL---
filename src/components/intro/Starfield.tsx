import { DIAL_ANCHOR } from "./TimeDial";

/**
 * 开场页背景的极淡星点层（2026-08-31 新增，站主选的方向：天文感）。
 *
 * 风险是做成常见的「星空壁纸」，三条做法上的约束避开它：
 *   1. 数量少、亮度低：一共 ~44 颗，34 颗几乎看不见（opacity 0.05–0.12），
 *      8 颗中等（0.15–0.28），只有 2 颗算「亮星」（0.42）。
 *   2. 和仪器有物理关系：星点密度随「离仪器圆心的距离」变化——离仪器越近越稀疏、
 *      越暗，当作被仪器的反光洗掉了。做法是候选点按到 `DIAL_ANCHOR`（仪器圆心的
 *      近似百分比坐标，定义在 TimeDial.tsx）的距离算一个「保留概率」，越近越容易被
 *      丢弃，然后把保留下来的点按距离从远到近分成 亮/中/暗 三档——亮星必然是离
 *      仪器最远的那两颗。这样星场的疏密是「因为画面里有个发光的东西」，不是随手撒的。
 *   3. 动效克制：只有 2 颗亮星 + 4 颗中等星做极缓呼吸（周期 6–11 秒、彼此错相，
 *      靠 CSS 变量喂给同一条 globals.css 里的 `dcStarBreathe` keyframe），振幅
 *      不超过 opacity ±0.06；`prefers-reduced-motion` 由全局 CSS 兜底（所有动画
 *      duration 被钉到 0.01ms），这里不用再单独判断。其余 38 颗完全静止。
 *
 * 坐标用固定种子的线性同余生成器算，服务端和客户端算出来一模一样，不会
 * hydration mismatch，也不需要 useEffect 补渲染。
 */

type Star = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  breathe?: { duration: number; delay: number; peak: number };
};

const TOTAL = 44;
const BRIGHT_COUNT = 2;
const MEDIUM_COUNT = 8;
const BREATHE_MEDIUM_COUNT = 4;

/** 星场纵向只占画面上面 82%，给底部的文字块留出干净的区域 */
const TOP_SPAN = 82;

const STARS: Star[] = (() => {
  let seed = 20260831;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  type Candidate = { left: number; top: number; dist: number };
  const kept: Candidate[] = [];

  // 候选点做「离仪器越近越容易被丢弃」的拒绝采样，直到凑够 TOTAL 颗。
  // 200 次兜底：正常情况平均保留率远高于 1/200，不会触发。
  for (let i = 0; i < TOTAL * 20 && kept.length < TOTAL; i++) {
    const left = rnd() * 100;
    const top = rnd() * TOP_SPAN;

    const dx = left - DIAL_ANCHOR.xPct;
    // 纵向按 1.6 倍加权：屏幕通常比高更宽，同样的百分比差在纵向对应更长的实际像素距离
    const dy = (top - DIAL_ANCHOR.yPct) * 1.6;
    const dist = Math.hypot(dx, dy);

    const keepProb = Math.min(1, Math.max(0.05, dist / 42));
    if (rnd() < keepProb) kept.push({ left, top, dist });
  }

  // 按离仪器的距离从远到近排：最远的两颗当亮星，接下来 8 颗中等，其余全暗淡。
  kept.sort((a, b) => b.dist - a.dist);

  return kept.map((c, i) => {
    let size: number;
    let opacity: number;
    let breathe: Star["breathe"];

    if (i < BRIGHT_COUNT) {
      size = 1.6;
      opacity = 0.42;
    } else if (i < BRIGHT_COUNT + MEDIUM_COUNT) {
      size = 1.0 + rnd() * 0.3;
      opacity = 0.15 + rnd() * 0.13;
    } else {
      size = 0.5 + rnd() * 0.4;
      opacity = 0.05 + rnd() * 0.07;
    }

    const mediumIndex = i - BRIGHT_COUNT;
    const isBreathingMedium = mediumIndex >= 0 && mediumIndex < BREATHE_MEDIUM_COUNT;
    if (i < BRIGHT_COUNT || isBreathingMedium) {
      const duration = 6 + rnd() * 5;
      breathe = {
        duration,
        delay: rnd() * duration,
        peak: Math.min(1, opacity + 0.04 + rnd() * 0.02),
      };
    }

    return { left: c.left, top: c.top, size, opacity, breathe };
  });
})();

export function Starfield() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {STARS.map((s, i) => {
        const style: React.CSSProperties = {
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: s.size,
          height: s.size,
          opacity: s.opacity,
        };

        if (s.breathe) {
          Object.assign(style, {
            "--o0": s.opacity,
            "--o1": s.breathe.peak,
            animation: `dcStarBreathe ${s.breathe.duration}s ease-in-out ${s.breathe.delay}s infinite`,
          } as React.CSSProperties);
        }

        return <div key={i} className="absolute rounded-full bg-white" style={style} />;
      })}
    </div>
  );
}
