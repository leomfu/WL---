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
 * ── 2026-08-31 改为「悬浮玻璃」──
 * 之前是金属仪表盘：表圈线性渐变 + 盘面 0.45 的深内阴影 + 外发光。两个问题：
 *   ① 外发光让它**浮在页面之上**（发光 = 它自己在发亮），读起来是贴上去的一片；
 *   ② 圆心被推出视口 17%，像挂在右边缘上。
 * 现在整体换成一片悬浮的镜片，全程黑白灰：
 *   1. 投影取代外发光 —— 见 SHADOW_REST。投影 = 有厚度、压在平面上，这是「落进页面」的那一刀。
 *   2. 折射亮边（rim-refract / rim-dark / rim-spill）：沿光轴从背光侧暗棱过渡到受光侧亮边，
 *      最外沿再压一条细亮线。**一圈亮边就是「玻璃」最主要的信号**，比任何阴影都管用。
 *   3. 盘面边缘内暗从 0.45 降到 0.2 —— 压太狠会立刻变回金属。
 *   4. 表镜高光弧（SPEC_WIDE / SPEC_HOT / SPEC_BACK）经 feGaussianBlur 糊开，画在**最上层**：
 *      指针在镜片下面，反光在镜片上面。背光侧也给一小段回光，只有一侧会显得是贴片。
 *   5. 指针投影走 filter（feDropShadow）而不是画偏移副本：filter 在屏幕空间生效，
 *      指针转到任何角度投影方向都不变；副本会跟着一起转，某些角度必穿帮。
 * 裁切从 17% 收到 6%，整个棱基本进入画面、只被右边缘轻轻切一下。
 * DIAL_ANCHOR 的 xPct 跟着从 82 改到 74（星点层按它算疏密，不改会错位）。
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

/**
 * 静息态只有投影，没有外发光。
 * 这是「脱离页面」那个问题的正解：**发光的物理含义是「它自己在发亮」，所以会浮在页面之上；
 * 投影的含义是「它有厚度、压在某个平面上」，所以会落进页面里。**
 * 光源是背景主光那片辉光（radial 在 78% 30%，右上），所以投影一律朝左下。
 * 表盘所在那一带的背景约 #1c1c1c，不是纯黑，投影读得出来。
 */
const SHADOW_REST =
  "drop-shadow(-30px 38px 52px rgba(0,0,0,0.62)) drop-shadow(-10px 13px 18px rgba(0,0,0,0.42))";
/** 进站那一下：投影保留（别让它突然飘起来），额外叠一层短促的白光配合指针倒转 */
const SHADOW_WARP =
  "drop-shadow(-30px 38px 52px rgba(0,0,0,0.62)) drop-shadow(0 0 20px rgba(237,237,237,0.5))";

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

/**
 * 表镜高光弧：右上（迎光那一侧）的一段圆弧，糊开之后就是玻璃面上的反射。
 * 角度以 12 点为 0、顺时针为正，所以 24°–96° 正好扫过右上那段棱。
 */
const specArc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = pt(CX, CY, a1, r);
  const [x2, y2] = pt(CX, CY, a2, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
};
const SPEC_WIDE = specArc(PLATE_R - 16, 18, 104);
const SPEC_HOT = specArc(PLATE_R - 16, 34, 62);
/** 背光侧（左下）一小段回光，玻璃两侧都该有一点，只有一侧会显得是贴片 */
const SPEC_BACK = specArc(PLATE_R - 16, 212, 250);

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
        {/* 盘面本体：一片半透明的镜片，中心偏左上稍亮（迎光那侧透光多） */}
        <radialGradient id="dial-plate" cx="0.4" cy="0.32" r="0.76">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0.075} />
          <stop offset="62%" stopColor="#ededed" stopOpacity={0.028} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0.008} />
        </radialGradient>
        {/* 边缘内暗：玻璃在边缘会全反射，压一档就有厚度。
            金属版这里是 0.45 的深内阴影（读作「下沉的盘面」），玻璃要轻得多，否则会变回金属。 */}
        <radialGradient id="dial-edge" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={0} />
          <stop offset="74%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.2} />
        </radialGradient>
        {/* 折射亮边：沿光轴（左下背光 → 右上受光）。这是「玻璃」最主要的那个信号，
            比任何阴影都管用 —— 一圈亮边就说明这里有一道有厚度的透明棱。 */}
        <linearGradient id="rim-refract" x1="14%" y1="82%" x2="82%" y2="20%">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0.06} />
          <stop offset="46%" stopColor="#ededed" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0.62} />
        </linearGradient>
        {/* 背光那侧的暗棱：和亮边反向，让圆环有「转过去」的体积 */}
        <linearGradient id="rim-dark" x1="82%" y1="20%" x2="14%" y2="82%">
          <stop offset="0%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.5} />
        </linearGradient>
        {/* 棱外的一圈极窄冷芒：玻璃边缘把光掰出去的那一下 */}
        <linearGradient id="rim-spill" x1="20%" y1="76%" x2="80%" y2="24%">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0} />
          <stop offset="72%" stopColor="#ededed" stopOpacity={0.05} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0.28} />
        </linearGradient>
        {/* 表镜反光：一道极淡的斜向光带 */}
        <linearGradient id="sheen-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ededed" stopOpacity={0} />
          <stop offset="50%" stopColor="#ededed" stopOpacity={0.06} />
          <stop offset="100%" stopColor="#ededed" stopOpacity={0} />
        </linearGradient>
        {/* 指针投影：放在 filter 里而不是画一份偏移的副本 ——
            filter 作用在屏幕空间，指针转到任何角度投影方向都不变；
            画副本的话副本会跟着一起转，转到某些角度就穿帮了。 */}
        <filter id="hand-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="-3.5" dy="4.5" stdDeviation="3" floodColor="#000000" floodOpacity="0.55" />
        </filter>
        {/* 高光弧要糊开，硬边会立刻变成「画上去的线」而不是「反射」 */}
        <filter id="spec-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <clipPath id="dial-clip">
          <circle cx={CX} cy={CY} r={PLATE_R} />
        </clipPath>
      </defs>

      {/* 玻璃棱 · 外圈：先铺背光侧的暗棱，再压受光侧的亮边，顺序不能反 */}
      <circle cx={CX} cy={CY} r={BEZEL_R} fill="none" stroke="url(#rim-dark)" strokeWidth={BEZEL_W} />
      <circle cx={CX} cy={CY} r={BEZEL_R} fill="none" stroke="url(#rim-refract)" strokeWidth={BEZEL_W} />
      {/* 棱最外沿那条细亮线 —— 玻璃边缘的高光是「一条线」，不是「一片渐变」 */}
      <circle cx={CX} cy={CY} r={BEZEL_OUTER - 0.6} fill="none" stroke="url(#rim-spill)" strokeWidth={1.1} />
      {/* 棱内沿：镜片和棱的交界，比外沿弱一档 */}
      <circle cx={CX} cy={CY} r={BEZEL_INNER + 0.6} fill="none" stroke="url(#rim-refract)" strokeOpacity={0.5} strokeWidth={0.8} />

      {/* 镜片本体 + 边缘内暗 */}
      <circle cx={CX} cy={CY} r={PLATE_R} fill="url(#dial-plate)" />
      <circle cx={CX} cy={CY} r={PLATE_R} fill="url(#dial-edge)" />

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

      {/* 指针和中心轴一起投影 —— 它们在镜片下面，影子落在盘面上 */}
      <g filter="url(#hand-shadow)">
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
      </g>
      {/* 玻璃表面的反射：画在最后 —— 指针在镜片下面，反光在镜片上面 */}
      <g fill="none" strokeLinecap="round" filter="url(#spec-blur)">
        <path d={SPEC_WIDE} stroke="#ededed" strokeOpacity={0.16} strokeWidth={7} />
        <path d={SPEC_HOT} stroke="#ededed" strokeOpacity={0.3} strokeWidth={3} />
        <path d={SPEC_BACK} stroke="#ededed" strokeOpacity={0.09} strokeWidth={4} />
      </g>
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
        right: "calc(-0.06 * var(--dial-size))",
        width: "var(--dial-size)",
        aspectRatio: "1",
        transform: "translateY(-50%)",
        filter: warping && !reduced ? SHADOW_WARP : SHADOW_REST,
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
export const DIAL_ANCHOR = { xPct: 74, yPct: 50 } as const;
