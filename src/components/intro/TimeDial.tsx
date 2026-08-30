"use client";

import { memo, useEffect, useRef, type RefObject } from "react";
import Image from "next/image";
import { siteConfig } from "~/site.config";

/**
 * 开场页中心的「时间之钟」—— 全部用代码画（SVG），没有位图钟面。
 *
 * 平时：指针走真实的当前时间，秒针逐帧平滑转动。
 * 进站时（warping=true）：指针在 WARP_MS 内加速倒转数圈，秒针同时淡出——
 * 配合背景 CityDepth 的「颜色涌回 + 镜头推进」，凑成「穿梭时间」的过场。
 *
 * ── SSR / hydration ──
 * 服务端不知道用户此刻几点，所以首帧一律渲染 IDLE（10:09:36 的经典表盘角度），
 * 服务端和客户端首次渲染完全一致，不会 mismatch；挂载后才由 rAF 接管成真实时间。
 * 接管之后指针角度是 useEffect 里直接 setAttribute 写的，React 不再碰它
 * （JSX 里的 transform 字符串是常量，重渲染时 React 比对到「没变」就不会写回 DOM）。
 */

/** 钟面坐标系（viewBox 单位），显示尺寸由外层 className 决定 */
const BOX = 200;
const C = BOX / 2;

/** 首帧固定角度：10:09:36，钟表广告里那个对称的经典姿势 */
const IDLE = { hour: 304.8, minute: 57.6, second: 216 } as const;

/** 倒转过场时长（ms）——比 CityDepth 的上色略快，指针先动、颜色随后涌回 */
const WARP_MS = 700;

/** 倒转圈数：时针半圈、分针 6 圈、秒针 14 圈，越细的针转得越疯 */
const REWIND_TURNS = { hour: 0.5, minute: 6, second: 14 } as const;

/** 减少动态效果时不逐帧走针，改成 20 秒对一次时（秒针也不显示） */
const STILL_TICK_MS = 20_000;

type TickMark = {
  key: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
};

/** 60 道刻度：整点长而亮，分刻度短而淡，不放数字 */
const TICKS: TickMark[] = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const rad = (i * 6 * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const outer = 88;
  const inner = major ? 78 : 84;
  return {
    key: i,
    x1: C + sin * outer,
    y1: C - cos * outer,
    x2: C + sin * inner,
    y2: C - cos * inner,
    width: major ? 1.1 : 0.7,
    color: major ? "rgba(237,237,237,0.5)" : "rgba(237,237,237,0.16)",
  };
});

const rotate = (deg: number) => `rotate(${deg} ${C} ${C})`;

type HandRefs = {
  hourRef: RefObject<SVGGElement | null>;
  minuteRef: RefObject<SVGGElement | null>;
  secondRef: RefObject<SVGGElement | null>;
};

/**
 * 钟面本体。props 全是稳定引用（ref 对象 + 常量字符串），
 * memo 之后父组件因为 warping 重渲染时这棵子树完全不动，指针属性不会被写回首帧角度。
 */
const Face = memo(function Face({
  hourRef,
  minuteRef,
  secondRef,
  showSecond,
}: HandRefs & { showSecond: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      {/* 外圈 + 一道更淡的内圈，做一点纵深 */}
      <circle
        cx={C}
        cy={C}
        r={95}
        fill="none"
        stroke="rgba(237,237,237,0.2)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={C}
        cy={C}
        r={91}
        fill="none"
        stroke="rgba(237,237,237,0.07)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* 刻度 */}
      <g strokeLinecap="round">
        {TICKS.map((tick) => (
          <line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.color}
            strokeWidth={tick.width}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* 指针：锥形（中间宽、两头收），时针短粗、分针细长 */}
      <g ref={hourRef} transform={rotate(IDLE.hour)}>
        <polygon points={`${C},46 ${C + 1.7},${C} ${C},112 ${C - 1.7},${C}`} fill="#EDEDED" />
      </g>
      <g ref={minuteRef} transform={rotate(IDLE.minute)}>
        <polygon
          points={`${C},25 ${C + 1.15},${C} ${C},116 ${C - 1.15},${C}`}
          fill="#EDEDED"
          opacity={0.92}
        />
      </g>
      {showSecond && (
        <g ref={secondRef} transform={rotate(IDLE.second)} opacity={0.42}>
          <line
            x1={C}
            y1={117}
            x2={C}
            y2={22}
            stroke="#EDEDED"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 中轴 */}
      <circle cx={C} cy={C} r={4.6} fill="#060606" stroke="rgba(237,237,237,0.28)" strokeWidth={0.7} />
      <circle cx={C} cy={C} r={2.2} fill="#EDEDED" />
    </svg>
  );
});

export function TimeDial({
  warping = false,
  reduced = false,
  logoAlt,
  className = "",
  style,
}: {
  warping?: boolean;
  reduced?: boolean;
  logoAlt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const hourRef = useRef<SVGGElement | null>(null);
  const minuteRef = useRef<SVGGElement | null>(null);
  const secondRef = useRef<SVGGElement | null>(null);
  /** 进站过场的起点（performance.now），null = 还没开始倒转 */
  const warpStart = useRef<number | null>(null);

  useEffect(() => {
    if (warping && warpStart.current === null) warpStart.current = performance.now();
  }, [warping]);

  useEffect(() => {
    /** 把此刻（或倒转中的此刻）写进三根指针 */
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
        // 秒针转到会闪烁的速度，索性让它先化掉
        secondRef.current?.setAttribute("opacity", String(0.42 * (1 - p)));
      }

      hourRef.current?.setAttribute("transform", rotate(hourDeg));
      minuteRef.current?.setAttribute("transform", rotate(minuteDeg));
      secondRef.current?.setAttribute("transform", rotate(secondDeg));
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

  return (
    <div className={`relative ${className}`} style={style}>
      {/* 钟盘后面的一层极淡辉光，倒转时短暂增强 */}
      <div
        className="pointer-events-none absolute -inset-[16%] rounded-full transition-all duration-500 ease-out"
        style={{
          background:
            "radial-gradient(circle, rgba(237,237,237,0.11) 0%, rgba(237,237,237,0.035) 40%, rgba(237,237,237,0) 70%)",
          opacity: warping && !reduced ? 1 : 0.7,
          transform: warping && !reduced ? "scale(1.18)" : "scale(1)",
        }}
        aria-hidden
      />

      {/* 表盘上的品牌标：小尺寸 WL Logo，反色。排在 Face 前面，指针从它上面扫过 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[20%] w-[20%] -translate-x-1/2 -translate-y-1/2">
        <Image
          src={siteConfig.logo}
          alt={logoAlt}
          fill
          priority
          sizes="72px"
          className="object-contain opacity-90 invert"
        />
      </div>

      <Face
        hourRef={hourRef}
        minuteRef={minuteRef}
        secondRef={secondRef}
        showSecond={!reduced}
      />
    </div>
  );
}
