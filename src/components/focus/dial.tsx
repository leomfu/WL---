/**
 * 表盘的公共几何 —— 开场页的时间之钟、音乐层的时间盘、番茄钟、时刻表的站台钟，
 * 用的是同一套刻度：60 道，整点长而亮，分刻度短而淡，不放数字。
 *
 * 抽出来只是为了这几处不各画各的；有交互的部分（音乐层能点着跳进度、番茄钟的倒数弧）
 * 留在各自的组件里，这里只管「一张钟面长什么样」。
 */

/** 钟面坐标系（viewBox 单位），显示尺寸由外层 className 决定 */
export const BOX = 200;
export const C = BOX / 2;
export const RING_R = 88;

export type TickMark = {
  key: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
};

/**
 * 生成 60 道刻度。outer/inner 决定刻度从哪画到哪；majorColor/minorColor 留给
 * 浅色纸面上的钟（专注区时刻表，见 Departures.tsx）覆盖成深色描边用，
 * 不传就还是原来暗底钟面的浅色描边，其余调用点行为不变。
 */
export function makeTicks(
  outer = RING_R,
  majorInset = 10,
  minorInset = 4,
  majorColor = "rgba(237,237,237,0.5)",
  minorColor = "rgba(237,237,237,0.16)",
) {
  return Array.from({ length: 60 }, (_, i): TickMark => {
    const major = i % 5 === 0;
    const rad = (i * 6 * Math.PI) / 180;
    const inner = outer - (major ? majorInset : minorInset);
    return {
      key: i,
      x1: C + Math.sin(rad) * outer,
      y1: C - Math.cos(rad) * outer,
      x2: C + Math.sin(rad) * inner,
      y2: C - Math.cos(rad) * inner,
      width: major ? 1.1 : 0.7,
      color: major ? majorColor : minorColor,
    };
  });
}

export const TICKS = makeTicks();

export function TickMarks({ ticks = TICKS }: { ticks?: TickMark[] }) {
  return (
    <g strokeLinecap="round">
      {ticks.map((tick) => (
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
  );
}

/**
 * 盘心那颗轴：深色圆 + 细描边 + 一点白（暗底钟面默认值）。
 * 浅色纸面上的钟把三个颜色整体反过来传（见 Departures.tsx），其余调用点不传就不变。
 */
export function Hub({
  r = 4.6,
  ringFill = "#060606",
  ringStroke = "rgba(237,237,237,0.28)",
  centerFill = "#EDEDED",
}: {
  r?: number;
  ringFill?: string;
  ringStroke?: string;
  centerFill?: string;
}) {
  return (
    <>
      <circle cx={C} cy={C} r={r} fill={ringFill} stroke={ringStroke} strokeWidth={0.7} />
      <circle cx={C} cy={C} r={r * 0.48} fill={centerFill} />
    </>
  );
}

/** 锥形指针（和开场页的分针同款）。length 是从盘心往外的长度 */
export function handPoints(length: number, halfWidth = 1.15, tail = 16) {
  return `${C},${C - length} ${C + halfWidth},${C} ${C},${C + tail} ${C - halfWidth},${C}`;
}

/* mm:ss 的 clock() 挪到 lib/clock.ts 了 —— 唱片页和迷你播放器也要用，
   跟表盘几何没关系，不该住在这儿。 */
