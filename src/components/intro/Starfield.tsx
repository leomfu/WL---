/**
 * 开场页的星点层。
 *
 * 位置用固定种子的伪随机数在模块加载时算好——服务端和客户端跑出来一模一样，
 * 不会有 hydration mismatch，也不需要 useEffect 补渲染。
 * 46 个点各自闪各自的（dcTwinkle，错开延迟），交给 CSS 动画比 46 个 motion 组件省。
 *
 * warp=true（进站过场）时换一套动画：每个点绕自身中心转到「背对画面中心」的方向，
 * 再沿这个方向加速甩出去并横向拉长（dcWarp），一颗点就变成一道向外的光束。
 * 角度 / 距离 / 拉伸倍数都是每颗点自己的常量，通过 CSS 变量喂给同一条 keyframes。
 */

type Speck = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  delay: number;
  /** 背离画面中心的方向（deg） */
  angle: number;
  /** warp 时甩出去的距离（px） */
  travel: number;
  /** warp 终点的横向拉伸倍数 */
  stretch: number;
};

/** 与 TimeDial 里的指针倒转时长保持一致（那边也是 700） */
const WARP_MS = 700;

const SPECKS: Speck[] = (() => {
  let seed = 20260824;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return Array.from({ length: 46 }, () => {
    const left = rnd() * 100;
    const top = rnd() * 78;
    const size = rnd() < 0.72 ? 1 : 1.6;
    const opacity = 0.18 + rnd() * 0.42;
    const delay = Math.round(rnd() * 4200);

    // 以画面中心 (50%, 50%) 为原点算方向；正落在中心的点给个最小半径，免得原地不动
    const dx = left - 50;
    const dy = top - 50;
    const dist = Math.max(Math.hypot(dx, dy), 6);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return {
      left,
      top,
      size,
      opacity,
      delay,
      angle: Math.round(angle * 10) / 10,
      travel: Math.round(80 + dist * 5.4),
      stretch: Math.round(16 + dist * 0.95),
    };
  });
})();

export function Starfield({
  animate = true,
  warp = false,
}: {
  animate?: boolean;
  warp?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {SPECKS.map((s, i) => {
        const base: React.CSSProperties = {
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: s.size,
          height: s.size,
          opacity: s.opacity,
        };

        const style: React.CSSProperties = warp
          ? ({
              ...base,
              "--warp-a": `${s.angle}deg`,
              "--warp-d": `${s.travel}px`,
              "--warp-x": `${s.stretch}`,
              animation: `dcWarp ${WARP_MS}ms cubic-bezier(0.5, 0, 0.85, 0.25) forwards`,
              willChange: "transform, opacity",
            } as React.CSSProperties)
          : {
              ...base,
              animation: animate
                ? `dcTwinkle 4200ms ease-in-out ${s.delay}ms infinite`
                : undefined,
            };

        return <div key={i} className="absolute rounded-full bg-white" style={style} />;
      })}
    </div>
  );
}
