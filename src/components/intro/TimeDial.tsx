"use client";

import { memo, useEffect, useMemo, useRef, type RefObject } from "react";

/**
 * 开场页的「精密仪器」—— 对照 design-v2/Main.dc.html 还原：多层同心环 + 120 道外圈细密
 * 刻度 + 60 道内圈刻度 + 12 个蚀刻方位数字 + 右下副盘，全部用代码画（SVG），没有位图。
 *
 * 几何坐标沿用画板的 1440×900 基准（圆心 1196,392 半径 302，被右边缘裁掉一部分）。
 * 响应式靠 SVG 自身的 viewBox + preserveAspectRatio="xMaxYMid slice" 做——
 * 不需要在 JS 里重新计算任何像素：整块仪器随容器等比缩放，并且始终把「右边缘裁切」
 * 那一侧贴住容器右边，窄屏上構图不会塌（clock 中心永远落在可见范围内）。
 *
 * 功能沿用上一版 TimeDial：指针走真实时间，进站时（warping）在 WARP_MS 内加速倒转，
 * `prefers-reduced-motion` 降级为每 20 秒对一次表且隐藏跑秒的副盘指针。
 * 画板的静态示意图只画了一组「主指针」，但要保留三个指针的完整倒转行为，所以做了
 * 一次取舍映射：
 *   - 主指针（长指针 + 尾巴，朝画面左上那一侧）← 分针角度，动得最明显
 *   - 对角短指针（十字准线下方那根斜线）        ← 时针角度，动得最慢
 *   - 右下副盘的指针（计时器风格小表盘）        ← 秒针角度，逐帧平滑转动
 * 这样「走真实时间 + 倒转穿梭」的三档转速（0.5 / 6 / 14 圈）原样保留，只是换了个
 * 仪表壳子。三组指针的 idle 角度延用旧版的 10:09:36（服务端首帧和客户端一致，不会
 * hydration mismatch）。
 *
 * ── 发光 ──
 * 全站黑白灰是硬规则，开场页色彩上色的例外是上一版 CityDepth 背景专属的效果，这版
 * 背景已经删掉，所以这里的「倒转时发光变亮」改成纯白强度变化（不再变暖调），仪器本身
 * 保持黑白灰。
 */

const CX = 1196;
const CY = 392;
/** 画板基准画布，仅用于生成下面这些静态坐标；渲染时靠 viewBox 缩放，不再需要它 */
const VB_W = 1440;
const VB_H = 900;

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

type Tick = { x1: number; y1: number; x2: number; y2: number; o: number; w?: number };
type Numeral = { x: number; y: number; label: string; o: number };

/** 外圈 120 道细密刻度：每 10 道加长加亮，每 5 道中等（画板 renderVals() 原样移植） */
const FINE_TICKS: Tick[] = Array.from({ length: 120 }, (_, i) => {
  const major = i % 10 === 0;
  const mid = i % 5 === 0;
  const inner = major ? 272 : mid ? 280 : 284;
  const angle = (i / 120) * 360;
  const [x1, y1] = pt(CX, CY, angle, inner);
  const [x2, y2] = pt(CX, CY, angle, 300);
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

/** 副盘（右下，1196,558，r=52）的 12 道刻度 */
const SUB_TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 360;
  const [x1, y1] = pt(1196, 558, angle, 44);
  const [x2, y2] = pt(1196, 558, angle, 50);
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
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMaxYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="dial-plate" cx="0.4" cy="0.32" r="0.76">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0.055} />
          <stop offset="62%" stopColor="#ededed" stopOpacity={0.018} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0} />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r={302} fill="url(#dial-plate)" />

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
        <line x1={CX} y1={352} x2={CX} y2={376} strokeOpacity={0.32} strokeWidth={0.8} />
        <line x1={CX} y1={408} x2={CX} y2={432} strokeOpacity={0.32} strokeWidth={0.8} />
        <line x1={1156} y1={CY} x2={1180} y2={CY} strokeOpacity={0.32} strokeWidth={0.8} />
        <line x1={1212} y1={CY} x2={1236} y2={CY} strokeOpacity={0.32} strokeWidth={0.8} />
      </g>

      {/* 刻度数字：蚀刻感，字距拉开 */}
      <g fill="#ededed" fontFamily="Inter, system-ui, sans-serif" fontSize={10.5} letterSpacing={1.6} textAnchor="middle">
        {NUMERALS.map((n, i) => (
          <text key={i} x={n.x} y={n.y} fillOpacity={n.o}>
            {n.label}
          </text>
        ))}
      </g>

      {/* 副盘：右下计时器风格小表盘（秒针驱动） */}
      <g fill="none" stroke="#ededed">
        <circle cx={1196} cy={558} r={52} strokeOpacity={0.16} strokeWidth={0.8} />
        {SUB_TICKS.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeOpacity={0.22} strokeWidth={0.7} />
        ))}
        {showSecond && (
          <g ref={secondRef} transform={rotate(IDLE.second, 1196, 558)}>
            <line
              x1={1196}
              y1={558}
              x2={1196}
              y2={521}
              stroke="#ededed"
              strokeOpacity={0.5}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
      <circle cx={1196} cy={558} r={1.6} fill="#ededed" fillOpacity={0.6} />

      {/* 主指针：分针驱动，长指针 + 尾巴 */}
      <g ref={minuteRef} stroke="#ededed" fill="none" strokeLinecap="round" transform={rotate(IDLE.minute, CX, CY)}>
        <line x1={CX} y1={CY} x2={CX} y2={CY - 274} strokeOpacity={0.72} strokeWidth={1.4} />
        <line x1={CX} y1={CY} x2={CX} y2={CY + 48} strokeOpacity={0.28} strokeWidth={1.4} />
      </g>
      {/* 对角短指针：时针驱动 */}
      <g ref={hourRef} stroke="#ededed" fill="none" strokeLinecap="round" transform={rotate(IDLE.hour, CX, CY)}>
        <line x1={CX} y1={CY} x2={CX} y2={CY - 239} strokeOpacity={0.46} strokeWidth={1} />
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
      secondRef.current?.setAttribute("transform", rotate(secondDeg, 1196, 558));
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
      className={`pointer-events-none absolute inset-0 h-full w-full transition-[filter] duration-[900ms] ease-out ${className}`}
      style={{ filter: warping && !reduced ? GLOW_WARP : GLOW_REST, ...style }}
    >
      <Face minuteRef={minuteRef} hourRef={hourRef} secondRef={secondRef} showSecond={showSecond} />
    </div>
  );
}
