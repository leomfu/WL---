"use client";

import { memo, useEffect, useMemo, useRef, type RefObject } from "react";

/**
 * 开场页的「精密仪器」。
 *
 * ── 2026-08-31 构图重做 ──
 * 旧版把仪器画在整页 1440×900 的 viewBox 里，靠 `preserveAspectRatio="xMaxYMid slice"`
 * 让它跟页面一起缩放/裁切。缺点：slice 的缩放比例取的是 max(容器宽/1440, 容器高/900)，
 * 宽屏（比如 2000×1120）算出来的比例比 1440×900 基准本身还大，仪器被放大又被上下左右
 * 一起裁，构图跟着屏幕比例散掉。
 *
 * 现在仪器彻底脱离页面 viewBox，自己是一个独立定位、独立尺寸的正方形：
 *   - 尺寸只吃 `clamp(下限, min(76vh, 58vw), 上限)`——只跟视口里较小的那一维走，
 *     不管宽屏窄屏多离谱，构图（表盘多大、被裁掉多少）都恒定。
 *   - 定位：垂直居中，水平贴右边缘并让圆心探出一截到视口外（`right: -0.17 * 尺寸`），
 *     做出「被右边缘裁掉」的效果，且这个比例不随尺寸变化（都是同一个盒子的百分比）。
 *   - 内部 SVG 换成正方形 viewBox（0 0 672 672，圆心 336,336），不用再靠
 *     preserveAspectRatio 做非均匀缩放。
 *   手机竖屏单独给一档尺寸（见组件里 `max-sm:` 那个类）：不然 58vw 在窄屏上会比
 *   `clamp` 的下限还小，被迫吃下限，反而比宽屏还占屏幕比例。
 *
 * ── 2026-08-31 五层质感 ──
 * 在纯线框（同心圆 + 刻度）上叠五层，做出「金属仪器在弱光下」的实感，全程黑白灰、
 * 不做外发光/霓虹：
 *   1. 表圈：一个有厚度的环，用 linearGradient 沿背景主光方向（78%,30%）从背光侧
 *      rgba(237,237,237,0.03) 渐变到受光侧 rgba(237,237,237,0.22)。
 *   2. 盘面下沉：radial-gradient 中心透明、边缘 rgba(0,0,0,0.45)，叠在原有的
 *      左上高光渐变之上，做出盘面比表圈低一截的内阴影。
 *   3. 指针改 polygon 锥形实体（根宽尖细 + 尾部配重），沿一侧加一条更亮的高光细线。
 *   4. 表镜反光：一道极淡（opacity 0.05）的斜向光带，clipPath 裁在盘内。
 *   5. 数字浅浮雕：现有蚀刻数字下面叠一份下偏移 0.5px、更暗更淡的副本。
 *
 * 坐标沿用旧版的相对写法（一切基于 CX/CY 变量），所以把仪器从旧的 1196,392
 * 挪到新画布中心 336,336，只是整体平移，半径/夹角等相对几何完全不用重算。
 *
 * 功能不变：指针走真实时间，进站时（warping）在 WARP_MS 内加速倒转，
 * `prefers-reduced-motion` 降级为每 20 秒对一次表且隐藏跑秒的副盘指针。
 * 三个指针的映射关系跟旧版一致：主指针←分针角度，对角短指针←时针角度，
 * 副盘指针←秒针角度，idle 角度固定 10:09:36（服务端/客户端首帧一致）。
 */

/** 新画布：正方形，圆心居中 */
const VB = 672;
const CX = 336;
const CY = 336;

/** 副盘圆心：沿用旧版相对主盘圆心向下 166 的偏移 */
const SUB_CX = CX;
const SUB_CY = CY + 166;

/** 盘面（表镜）半径——刻度/数字/指针都活动在这个圆里 */
const PLATE_R = 300;
/** 表圈内外半径：夹在盘面边缘和画布边缘之间的一圈金属环 */
const BEZEL_OUTER = 326;
const BEZEL_INNER = 304;
const BEZEL_R = (BEZEL_OUTER + BEZEL_INNER) / 2;
const BEZEL_W = BEZEL_OUTER - BEZEL_INNER;

/** 首帧固定角度：10:09:36，和旧版 TimeDial 一样，服务端/客户端渲染一致 */
const IDLE = { hour: 304.8, minute: 57.6, second: 216 } as const;

/** 倒转过场时长（ms）——比背景的其它过场元素略快，指针先动 */
const WARP_MS = 1100;

/** 倒转圈数：时针半圈、分针 6 圈、秒针 14 圈，越细的指针转得越疯（沿用旧版数值） */
const REWIND_TURNS = { hour: 0.5, minute: 6, second: 14 } as const;

/** 减少动态效果时不逐帧走针，改成 20 秒对一次时（副盘秒针也不显示） */
const STILL_TICK_MS = 20_000;

const GLOW_REST =
  "drop-shadow(0 0 2px rgba(237,237,237,0.4)) drop-shadow(0 0 10px rgba(237,237,237,0.16))";
const GLOW_WARP =
  "drop-shadow(0 0 3px rgba(237,237,237,0.85)) drop-shadow(0 0 22px rgba(237,237,237,0.4))";

const rotate = (deg: number, cx: number, cy: number) => `rotate(${deg} ${cx} ${cy})`;

const pt = (cx: number, cy: number, angleDeg: number, r: number) => {
  const a = (angleDeg * Math.PI) / 180 - Math.PI / 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
};

/** 指针：根部宽、尖端细的锥形四边形，pre-rotation 时朝正上方（-Y）伸出 */
const taperedHand = (len: number, baseW: number, tipW: number) => {
  const tipY = CY - len;
  return `${CX - baseW},${CY} ${CX - tipW},${tipY} ${CX + tipW},${tipY} ${CX + baseW},${CY}`;
};
/** 尾部配重那截，朝正下方（+Y）伸出 */
const taperedTail = (len: number, baseW: number, tipW: number) => {
  const tipY = CY + len;
  return `${CX - baseW},${CY} ${CX - tipW},${tipY} ${CX + tipW},${tipY} ${CX + baseW},${CY}`;
};

type Tick = { x1: number; y1: number; x2: number; y2: number; o: number; w?: number };
type Numeral = { x: number; y: number; label: string; o: number };

/** 外圈 120 道细密刻度：每 10 道加长加亮，每 5 道中等（画板 renderVals() 原样移植） */
const FINE_TICKS: Tick[] = Array.from({ length: 120 }, (_, i) => {
  const major = i % 10 === 0;
  const mid = i % 5 === 0;
  const inner = major ? 272 : mid ? 280 : 284;
  const angle = (i / 120) * 360;
  const [x1, y1] = pt(CX, CY, angle, inner);
  const [x2, y2] = pt(CX, CY, angle, PLATE_R);
  return { x1, y1, x2, y2, o: major ? 0.52 : mid ? 0.3 : 0.16, w: major ? 1.1 : 0.6 };
});

/** 内圈 60 道，朝盘心方向 */
const INNER_TICKS: Tick[] = Array.from({ length: 60 }, (_, i) => {
  const angle = (i / 60) * 360;
  const [x1, y1] = pt(CX, CY, angle, 176);
  const [x2, y2] = pt(CX, CY, angle, i % 5 === 0 ? 162 : 168);
  return { x1, y1, x2, y2, o: i % 5 === 0 ? 0.26 : 0.12 };
});

/** 12 个方位刻度数字，蚀刻在两圈环之间，每 3 个亮一档 */
const NUMERALS: Numeral[] = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 360;
  const [x, y] = pt(CX, CY, angle, 224);
  return {
    x,
    y: y + 3.6,
    label: (i === 0 ? 12 : i).toString().padStart(2, "0"),
    o: i % 3 === 0 ? 0.44 : 0.2,
  };
});

/** 副盘（右下，SUB_CX/SUB_CY，r=52）的 12 道刻度 */
const SUB_TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 360;
  const [x1, y1] = pt(SUB_CX, SUB_CY, angle, 44);
  const [x2, y2] = pt(SUB_CX, SUB_CY, angle, 50);
  return { x1, y1, x2, y2 };
});

type HandRefs = {
  minuteRef: RefObject<SVGGElement | null>;
  hourRef: RefObject<SVGGElement | null>;
  secondRef: RefObject<SVGGElement | null>;
};

/**
 * 仪器本体。props 全是稳定引用（ref 对象 + 常量布尔），memo 之后父组件因为 warping
 * 重渲染时这棵子树不会被打断，指针属性不会被写回首帧角度。
 */
const Face = memo(function Face({ minuteRef, hourRef, secondRef, showSecond }: HandRefs & { showSecond: boolean }) {
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="dial-plate" cx="0.4" cy="0.32" r="0.76">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0.055} />
          <stop offset="62%" stopColor="#ededed" stopOpacity={0.018} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0} />
        </radialGradient>
        {/* 层 2 · 盘面下沉：中心透明、边缘压暗，做出比表圈低一截的内阴影 */}
        <radialGradient id="dial-sink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
        </radialGradient>
        {/* 层 1 · 表圈：沿背景主光方向（78%,30%）从背光侧到受光侧渐亮 */}
        <linearGradient id="bezel-grad" x1="16%" y1="78%" x2="80%" y2="24%">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0.03} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0.22} />
        </linearGradient>
        {/* 层 4 · 表镜反光：一道极淡的斜向光带 */}
        <linearGradient id="sheen-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0} />
          <stop offset="50%" stopColor="#ededed" stopOpacity={0.05} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0} />
        </linearGradient>
        <clipPath id="dial-clip">
          <circle cx={CX} cy={CY} r={PLATE_R} />
        </clipPath>
      </defs>

      {/* 层 1 · 表圈：夹在盘面边缘和画布边缘之间的金属环 */}
      <circle
        cx={CX}
        cy={CY}
        r={BEZEL_R}
        fill="none"
        stroke="url(#bezel-grad)"
        strokeWidth={BEZEL_W}
      />

      <circle cx={CX} cy={CY} r={PLATE_R} fill="url(#dial-plate)" />
      {/* 层 2 · 盘面下沉 */}
      <circle cx={CX} cy={CY} r={PLATE_R} fill="url(#dial-sink)" />

      <g fill="none" stroke="#ededed" strokeLinecap="butt">
        {/* 六层同心环 */}
        <circle cx={CX} cy={CY} r={302} strokeOpacity={0.2} strokeWidth={1} />
        <circle cx={CX} cy={CY} r={286} strokeOpacity={0.1} strokeWidth={0.7} />
        <circle cx={CX} cy={CY} r={252} strokeOpacity={0.16} strokeWidth={1} />
        <circle cx={CX} cy={CY} r={246} strokeOpacity={0.06} strokeWidth={0.6} />
        <circle cx={CX} cy={CY} r={176} strokeOpacity={0.09} strokeWidth={0.7} />
        <circle cx={CX} cy={CY} r={96} strokeOpacity={0.13} strokeWidth={0.8} />

        {/* 外圈细密刻度 */}
        {FINE_TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeOpacity={t.o} strokeWidth={t.w} />
        ))}
        {/* 内圈刻度 */}
        {INNER_TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeOpacity={t.o} strokeWidth={0.7} />
        ))}

        {/* 十字准线：盘心的对准标记 */}
        <line x1={CX} y1={CY - 40} x2={CX} y2={CY - 16} strokeOpacity={0.32} strokeWidth={0.8} />
        <line x1={CX} y1={CY + 16} x2={CX} y2={CY + 40} strokeOpacity={0.32} strokeWidth={0.8} />
        <line x1={CX - 40} y1={CY} x2={CX - 16} y2={CY} strokeOpacity={0.32} strokeWidth={0.8} />
        <line x1={CX + 16} y1={CY} x2={CX + 40} y2={CY} strokeOpacity={0.32} strokeWidth={0.8} />
      </g>

      {/* 层 5 · 数字浅浮雕：先画下偏移的暗色副本，再画原来蚀刻的那层盖在上面 */}
      <g fill="#000000" fontFamily="Inter, system-ui, sans-serif" fontSize={10.5} letterSpacing={1.6} textAnchor="middle">
        {NUMERALS.map((n, i) => (
          <text key={i} x={n.x + 0.4} y={n.y + 0.9} fillOpacity={n.o * 0.5}>
            {n.label}
          </text>
        ))}
      </g>
      <g fill="#ededed" fontFamily="Inter, system-ui, sans-serif" fontSize={10.5} letterSpacing={1.6} textAnchor="middle">
        {NUMERALS.map((n, i) => (
          <text key={i} x={n.x} y={n.y} fillOpacity={n.o}>
            {n.label}
          </text>
        ))}
      </g>

      {/* 层 4 · 表镜反光：clip 在盘内的斜向光带 */}
      <g clipPath="url(#dial-clip)">
        <rect
          x={CX - 480}
          y={CY - 190}
          width={960}
          height={150}
          fill="url(#sheen-grad)"
          transform={`rotate(-30 ${CX} ${CY})`}
        />
      </g>

      {/* 副盘：右下计时器风格小表盘（秒针驱动） */}
      <g fill="none" stroke="#ededed">
        <circle cx={SUB_CX} cy={SUB_CY} r={52} strokeOpacity={0.16} strokeWidth={0.8} />
        {SUB_TICKS.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeOpacity={0.22} strokeWidth={0.7} />
        ))}
        {showSecond && (
          <g ref={secondRef} transform={rotate(IDLE.second, SUB_CX, SUB_CY)}>
            <polygon
              points={`${SUB_CX - 1.1},${SUB_CY} ${SUB_CX - 0.35},${SUB_CY - 37} ${SUB_CX + 0.35},${SUB_CY - 37} ${SUB_CX + 1.1},${SUB_CY}`}
              fill="#ededed"
              fillOpacity={0.55}
              stroke="none"
            />
          </g>
        )}
      </g>
      <circle cx={SUB_CX} cy={SUB_CY} r={1.6} fill="#ededed" fillOpacity={0.6} />

      {/* 层 3 · 主指针：分针驱动，锥形实体 + 尾部配重 + 高光细线 */}
      <g ref={minuteRef} transform={rotate(IDLE.minute, CX, CY)}>
        <polygon points={taperedHand(274, 2.6, 0.6)} fill="#ededed" fillOpacity={0.74} />
        <polygon points={taperedTail(48, 2.2, 1.2)} fill="#ededed" fillOpacity={0.3} />
        <circle cx={CX} cy={CY + 45} r={3} fill="#ededed" fillOpacity={0.3} />
        <line
          x1={CX - 1.3}
          y1={CY - 12}
          x2={CX - 0.3}
          y2={CY - 260}
          stroke="#ededed"
          strokeOpacity={0.92}
          strokeWidth={0.5}
          strokeLinecap="round"
        />
      </g>
      {/* 对角短指针：时针驱动 */}
      <g ref={hourRef} transform={rotate(IDLE.hour, CX, CY)}>
        <polygon points={taperedHand(239, 2.1, 0.55)} fill="#ededed" fillOpacity={0.5} />
        <line
          x1={CX - 1}
          y1={CY - 10}
          x2={CX - 0.25}
          y2={CY - 226}
          stroke="#ededed"
          strokeOpacity={0.75}
          strokeWidth={0.45}
          strokeLinecap="round"
        />
      </g>

      {/* 中心轴：三层 */}
      <circle cx={CX} cy={CY} r={9} fill="none" stroke="#ededed" strokeOpacity={0.22} strokeWidth={0.8} />
      <circle cx={CX} cy={CY} r={4} fill="#0a0a0a" stroke="#ededed" strokeOpacity={0.55} strokeWidth={0.9} />
      <circle cx={CX} cy={CY} r={1.5} fill="#ededed" fillOpacity={0.9} />
    </svg>
  );
});

export function TimeDial({
  warping = false,
  reduced = false,
  className = "",
  style,
}: {
  warping?: boolean;
  reduced?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const minuteRef = useRef<SVGGElement | null>(null);
  const hourRef = useRef<SVGGElement | null>(null);
  const secondRef = useRef<SVGGElement | null>(null);
  /** 进站过场的起点（performance.now），null = 还没开始倒转 */
  const warpStart = useRef<number | null>(null);

  useEffect(() => {
    if (warping && warpStart.current === null) warpStart.current = performance.now();
  }, [warping]);

  useEffect(() => {
    /** 把此刻（或倒转中的此刻）写进三组指针 */
    const paint = () => {
      const now = new Date();
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      const minutes = now.getMinutes() + seconds / 60;
      const hours = (now.getHours() % 12) + minutes / 60;

      let hourDeg = hours * 30;
      let minuteDeg = minutes * 6;
      let secondDeg = seconds * 6;

      const start = warpStart.current;
      if (start !== null) {
        // p³ = ease-in，越转越快
        const p = Math.min(1, (performance.now() - start) / WARP_MS);
        const eased = p * p * p;
        hourDeg -= eased * REWIND_TURNS.hour * 360;
        minuteDeg -= eased * REWIND_TURNS.minute * 360;
        secondDeg -= eased * REWIND_TURNS.second * 360;
        secondRef.current?.setAttribute("opacity", String(1 - p));
      }

      minuteRef.current?.setAttribute("transform", rotate(minuteDeg, CX, CY));
      hourRef.current?.setAttribute("transform", rotate(hourDeg, CX, CY));
      secondRef.current?.setAttribute("transform", rotate(secondDeg, SUB_CX, SUB_CY));
    };

    if (reduced) {
      paint();
      const timer = window.setInterval(paint, STILL_TICK_MS);
      return () => window.clearInterval(timer);
    }

    let raf = 0;
    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const showSecond = useMemo(() => !reduced, [reduced]);

  return (
    <div
      className={`intro-dial pointer-events-none absolute [--dial-size:clamp(520px,min(76vh,58vw),900px)] max-sm:[--dial-size:clamp(300px,68vw,460px)] transition-[filter] duration-[900ms] ease-out ${className}`}
      style={{
        top: "50%",
        right: "calc(-0.17 * var(--dial-size))",
        width: "var(--dial-size)",
        aspectRatio: "1",
        transform: "translateY(-50%)",
        filter: warping && !reduced ? GLOW_WARP : GLOW_REST,
        ...style,
      }}
    >
      <Face minuteRef={minuteRef} hourRef={hourRef} secondRef={secondRef} showSecond={showSecond} />
    </div>
  );
}

/** 仪器圆心的近似屏幕坐标（百分比），给星点层算「离仪器多远」用。
 * 不同视口下这个值会有±几个百分点的漂移（clamp 的边界效应），但星点层要的是
 * 「近仪器更稀疏」这个定性关系，不需要逐视口精确重算。 */
export const DIAL_ANCHOR = { xPct: 82, yPct: 50 } as const;
