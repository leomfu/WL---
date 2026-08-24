/**
 * 开场页的星点层。
 *
 * 位置用固定种子的伪随机数在模块加载时算好——服务端和客户端跑出来一模一样，
 * 不会有 hydration mismatch，也不需要 useEffect 补渲染。
 * 46 个点各自闪各自的（dcTwinkle，错开延迟），交给 CSS 动画比 46 个 motion 组件省。
 */

type Speck = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  delay: number;
};

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
    return { left, top, size, opacity, delay };
  });
})();

export function Starfield({ animate = true }: { animate?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {SPECKS.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: animate
              ? `dcTwinkle 4200ms ease-in-out ${s.delay}ms infinite`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
