/**
 * 颗粒噪点层（PLAN.md §5「质感层」）。
 * SVG feTurbulence 现算，不加载任何图片——深色页面全靠它压住渐变的塑料感。
 */
export function Grain({
  id,
  opacity = 0.07,
  baseFrequency = 0.8,
}: {
  id: string;
  opacity?: number;
  baseFrequency?: number;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency={baseFrequency}
          numOctaves={3}
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}
