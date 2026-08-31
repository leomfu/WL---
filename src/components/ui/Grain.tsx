/**
 * 颗粒噪点层（PLAN.md §5「质感层」）。
 * SVG feTurbulence 现算，不加载任何图片——深色页面全靠它压住渐变的塑料感。
 *
 * 默认单层（screen 混合）。开场页画板要求叠两层不同频率的颗粒才不像电子噪点
 * （见 design-v2/Main.dc.html）——`numOctaves`/`blend` 就是留给那层用的可调参数，
 * 其余调用点（放松区背景等）不传就还是原来的单层 screen 效果，行为不变。
 * `blend="multiply"` 是亮色内容区的纸张颗粒用的（design-v2/Home.dc.html §纹层）——
 * screen/overlay 会把底色提亮，在浅灰渐变上会发灰变脏，multiply 只压暗不提亮。
 */
export function Grain({
  id,
  opacity = 0.07,
  baseFrequency = 0.8,
  numOctaves = 3,
  blend = "screen",
}: {
  id: string;
  opacity?: number;
  baseFrequency?: number;
  numOctaves?: number;
  blend?: "screen" | "overlay" | "multiply";
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity, mixBlendMode: blend }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency={baseFrequency}
          numOctaves={numOctaves}
          stitchTiles="stitch"
        />
        {/* feTurbulence 默认输出彩色噪点（RGB 各自随机），去饱和成灰阶噪点，
            不然叠上去会在黑白页面上留极淡的彩色麻点，违反「全站只用黑白灰」 */}
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}
