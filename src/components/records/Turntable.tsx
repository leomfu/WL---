"use client";

import { memo, useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { RESIDENT, usePlayer, type Group } from "@/components/player/PlayerProvider";
import { clock } from "@/lib/clock";
import { useProgressPainter } from "@/lib/useAudioPlayer";
import type { Track } from "@/lib/types";
import { siteConfig } from "~/site.config";

/**
 * 唱片页的主角 —— 一台真能转、真出声的黑胶唱机。
 *
 * 2026-08-30 重做（对照用户给的实拍参考图）：原来是一张**正对着看**的平面 SVG，
 * 改成**斜放在透视里**，像人站在唱机前低头看。
 *
 * 2026-08-31 再改（用户看了截图，画红箭头标了三处）：
 * ① **撤掉了包着它的深色矩形容器**——原来外面套了一层 `bg-shell` 的深色卡片，
 *    和页面浅灰背景割裂成两块。现在唱片、唱臂直接坐在 `<main>` 的 `bg-content`
 *    浅色渐变上（见 globals.css 顶部那段唱片页结构图的说明），靠新增的
 *    `.vinyl-floor-shadow`（扁平地面投影）+ 重新上色的 `.vinyl-shadow`
 *    （原 `.vinyl-pool`，深底时代是白色轮廓光，现在改成真的灰色接触阴影）
 *    把它"落"在页面上。黑胶本身还是黑的——那是材质，不是被撤掉的容器。
 * ② **盘心从纸标签换成专辑封面**：`track.cover` 有值时，标签位置显示圆形裁切的
 *    封面图（内容图片，彩色，豁免全站黑白规则），只留一个唱片轴孔；常驻那组没有
 *    封面字段，回退到原来的奶白纸标签（印曲目表那版），不开天窗。
 * ③ **右侧信息栏重排**：分类小标（当前碟名）→ 大字歌名 → 艺人 → 专辑 → 一句描述 →
 *    播放控件 + 去平台链接，对照用户给的参考图的信息层级（视觉是本站自己的黑白系统，
 *    没有照抄参考图的配色和字体）。
 *
 * ── 透视是怎么搭的 ──
 * 外层 `.vinyl-scene` 给 `perspective: 1500px`，里层 `.vinyl-plane` 整个
 * `rotateX(25deg)`。盘、盘的厚度、唱臂**都是这个平面的孩子**，所以唱臂天然和盘在
 * 同一个透视里，不会穿帮；唱片自转只是平面内的 `rotate`，投影出来自然就是椭圆轨迹。
 * 唱臂再 `translateZ(12px)` 浮在盘面上头，加一道 drop-shadow 落在盘上。
 *
 * ── 唱臂的角度还是算出来的 ──
 * 「支点—盘心—针尖」这个三角形用余弦定理反解：唱针落在半径 r 的沟槽上时唱臂该转多少度。
 * 所以「进度 = 唱针从外圈走到内圈」是真按半径线性走的，不是拿角度硬插值。
 * 这套解法沿用改造前的，只是结果画进了倾斜后的坐标系里。
 *
 * ── 点盘面跳进度 ──
 * 屏幕坐标要**反投影**回平面坐标才知道点的是第几圈（planeFromScreen）。
 * 这依赖 perspective 的值和「perspective-origin 落在盘心」这两个前提，
 * 改 globals.css 里 .vinyl-scene 的 perspective 要同步改这里的 PERSPECTIVE。
 *
 * 材质、厚度、单侧光、地面投影都在 globals.css 的 `.vinyl-*` 里，那边有结构图。
 * 播放状态不在这个组件里 —— 在 components/player/PlayerProvider，
 * 那样离开这一页音乐才不会断。
 *
 * 按场景分组的完整榜单（封面 + 歌名 + 艺人 + 时长 + 去平台外链）在 components/records/Chart，
 * 这个组件里只保留**常驻**那组（4 首肖邦，没有封面、没有平台外链）的可展开曲目清单——
 * 场景榜单已经被 Chart 更完整地覆盖了，两处重复没有意义。
 */

/* ---------------------------------------------------------------- 几何 */

/** 倾角。和 globals.css 的 .vinyl-plane 必须一致 */
const TILT = 25;
/** 透视距离（px）。和 globals.css 的 .vinyl-scene 必须一致 */
const PERSPECTIVE = 1500;

/** SVG 画布：盘心是原点 */
const BOX_W = 1000;
const BOX_H = 880;
/** 唱片半径。盘的直径 = 场景宽度的 78%，和 .vinyl-layer 的 width 对得上 */
const R = 390;
/** 起播沟槽 / 收尾沟槽的半径 —— 唱针在这两者之间走完一首 */
const R_OUT = 372;
const R_IN = 168;
/** 中心标签 */
const R_LABEL = 162;
/** 唱臂支点与臂长 */
const PIVOT = { x: 440, y: -300 };
const ARM_L = 575;
/** 唱臂停在托架上时的指向（度，0° 指向 +x，顺时针为正——SVG 的 y 朝下） */
const REST_DEG = 100;

const rad = (deg: number) => (deg * Math.PI) / 180;
const D = Math.hypot(PIVOT.x, PIVOT.y);
const BEARING = (Math.atan2(-PIVOT.y, -PIVOT.x) * 180) / Math.PI;

/** 唱针要落在半径 r 的沟槽上，唱臂该指向哪个角度（余弦定理） */
function armDeg(r: number) {
  const cos = (D * D + ARM_L * ARM_L - r * r) / (2 * D * ARM_L);
  const alpha = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  return BEARING - alpha;
}

/** 播放进度 0–1 → 唱臂相对托架转过的角度 */
const armAngle = (fraction: number) =>
  armDeg(R_OUT - (R_OUT - R_IN) * Math.max(0, Math.min(1, fraction))) - REST_DEG;

/** 沿唱臂方向 d、垂直偏移 o 的一点（唱臂按托架姿态画，之后整体绕支点旋转） */
const U = { x: Math.cos(rad(REST_DEG)), y: Math.sin(rad(REST_DEG)) };
const V = { x: -U.y, y: U.x };
const pt = (d: number, o = 0) => ({
  x: PIVOT.x + U.x * d + V.x * o,
  y: PIVOT.y + U.y * d + V.y * o,
});
const at = (d: number, o = 0) => {
  const p = pt(d, o);
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
};

/**
 * 屏幕上的一点 → 倾斜平面上的一点（反投影）。
 *
 * 正投影是：平面上的 (x, y) 先被 rotateX(θ) 转成三维的 (x, y·cosθ, y·sinθ)，
 * 再按 d/(d−z) 做透视除法。把它反过来解出 y，就是下面这两行。
 * sx/sy 是相对**场景中心**的像素（perspective-origin 正好在那儿）。
 */
function planeFromScreen(sx: number, sy: number) {
  const t = rad(TILT);
  const y = (sy * PERSPECTIVE) / (PERSPECTIVE * Math.cos(t) + sy * Math.sin(t));
  const k = PERSPECTIVE / (PERSPECTIVE - y * Math.sin(t));
  return { x: sx / k, y };
}

/* ------------------------------------------------------------ 标签排版 */

/** 中日韩方块字按 1 个字宽算，拉丁字母按 0.55 —— 标签上的字要卡在圆里 */
const textWidth = (text: string) =>
  [...text].reduce((sum, ch) => sum + (/[⺀-鿿＀-￯]/.test(ch) ? 1 : 0.55), 0);

/** 按「字宽」截断，装不下就带个省略号 —— 真唱片标签也是这么排的 */
function fit(text: string, max: number) {
  if (textWidth(text) <= max) return text;
  let out = "";
  for (const ch of text) {
    if (textWidth(out + ch) > max - 0.6) break;
    out += ch;
  }
  return `${out}…`;
}

/** 标签上印 5 行。跟着当前这首滑动，保证「现在放到哪儿」在标签上看得见 */
const LABEL_LINES = 5;
function labelWindow(count: number, index: number) {
  if (count <= LABEL_LINES) return 0;
  return Math.max(0, Math.min(index - 2, count - LABEL_LINES));
}

/* ---------------------------------------------------------------- 盘面 */

type DeckProps = {
  armRef: React.RefObject<SVGGElement | null>;
  spinning: boolean;
  reduced: boolean;
  onSeek: (fraction: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  ariaLabel: string;
  valueText: string;
  valueNow: number;
  /** 标签上印的东西（没有 cover 时的纸标签回退样式才用得到） */
  discTitle: string;
  side: string;
  foot: string;
  lines: Array<{ no: number; text: string; on: boolean }>;
  tight: string;
  /** 当前这首的专辑封面。有就替掉纸标签，圆形裁切嵌在盘心，只留轴孔 */
  cover?: string;
};

/**
 * 唱片本体 + 唱臂。唱针位置由 ref 写，不走 React 重渲染 ——
 * 外层每秒会因为「已播时间」重渲染好几次，这一坨没必要跟着重画。
 */
const Deck = memo(function Deck({
  armRef,
  spinning,
  reduced,
  onSeek,
  onKeyDown,
  ariaLabel,
  valueText,
  valueNow,
  discTitle,
  side,
  foot,
  lines,
  tight,
  cover,
}: DeckProps) {
  /**
   * 点唱片上的某一圈 = 跳到那个进度 —— 外圈是开头，内圈是结尾，和唱针走的方向一致。
   * 点到标签或盘外不算。
   */
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const plane = planeFromScreen(
      e.clientX - rect.left - rect.width / 2,
      e.clientY - rect.top - rect.height / 2,
    );
    // 平面上的像素 → SVG 单位
    const unit = BOX_W / rect.width;
    const r = Math.hypot(plane.x, plane.y) * unit;
    if (r < R_IN - 10 || r > R_OUT + 14) return;
    onSeek((R_OUT - r) / (R_OUT - R_IN));
  };

  const spin = spinning && !reduced ? "running" : "paused";

  return (
    <div className="vinyl-frame">
      {/* 扁平的地面投影——不跟着盘一起转、也不跟着 25° 倾斜走，
          这是让唱片「落在页面上」的关键，浅底上必须有它 */}
      <div className="vinyl-floor-shadow" aria-hidden />
      <div
        className="vinyl-scene cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        onClick={handleClick}
        onKeyDown={onKeyDown}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valueNow}
        aria-valuetext={valueText}
        tabIndex={0}
      >
        <div className="vinyl-plane">
          {/* 贴着盘身的一圈近影：黑盘挡住它的中间，挡出来的就是影子 */}
          <div className="vinyl-layer vinyl-shadow" aria-hidden />
          {/* 盘的厚度 */}
          <div className="vinyl-layer vinyl-edge-deep" aria-hidden />
          <div className="vinyl-layer vinyl-edge" aria-hidden />

          <div className="vinyl-layer vinyl-disc" aria-hidden>
            {/* ── 这一层在转 ── */}
            <div
              className="vinyl-grooves records-disc"
              style={{ animationPlayState: spin }}
            >
              {/* 标签的大小由 R_LABEL/R 定，和唱臂那套几何是同一组常数 ——
                  写进 CSS 就成了两份真相，所以宽度在这儿算 */}
              <svg
                className="vinyl-label"
                style={{ width: `${((R_LABEL / R) * 100).toFixed(2)}%` }}
                viewBox={`${-R_LABEL} ${-R_LABEL} ${R_LABEL * 2} ${R_LABEL * 2}`}
              >
                <defs>
                  <radialGradient id="rec-paper" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F3EFE6" />
                    <stop offset="72%" stopColor="#EDE7DB" />
                    <stop offset="100%" stopColor="#DED7C8" />
                  </radialGradient>
                  <clipPath id="rec-cover-clip">
                    <circle r={R_LABEL} />
                  </clipPath>
                </defs>

                {cover ? (
                  /* 有专辑封面：圆形裁切嵌进盘心，换歌就换图。参考图就是这个做法——
                     纸标签那套排版（曲目表、SIDE A…）在照片上没有意义，整个让位 */
                  <>
                    <image
                      href={cover}
                      x={-R_LABEL}
                      y={-R_LABEL}
                      width={R_LABEL * 2}
                      height={R_LABEL * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath="url(#rec-cover-clip)"
                    />
                    {/* 照片边缘一道细描边，免得像贴纸一样悬在沟槽上 */}
                    <circle
                      r={R_LABEL - 1}
                      fill="none"
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={1.4}
                    />
                  </>
                ) : (
                  <>
                    <circle r={R_LABEL} fill="url(#rec-paper)" />
                    <circle
                      r={R_LABEL - 7}
                      fill="none"
                      stroke="#1A1712"
                      strokeOpacity={0.18}
                      strokeWidth={0.8}
                    />

                    {/* 盘大的时候：印全套 —— 名号、SIDE A、曲目表 */}
                    <g className="vinyl-label-full">
                      <text
                        y={-80}
                        textAnchor="middle"
                        fill="#1A1712"
                        fontSize={25}
                        fontWeight={300}
                        letterSpacing="5"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {siteConfig.nameEn.toUpperCase()}
                      </text>
                      <text
                        y={-59}
                        textAnchor="middle"
                        fill="#6B6152"
                        fontSize={11.5}
                        letterSpacing="2.4"
                      >
                        {discTitle}
                      </text>
                      <line
                        x1={-54}
                        y1={-48}
                        x2={54}
                        y2={-48}
                        stroke="#1A1712"
                        strokeOpacity={0.22}
                        strokeWidth={0.7}
                      />

                      {/* 参考图里 SIDE A / 33⅓ / STEREO 就在中心孔右边 */}
                      <g fill="#1A1712" fontSize={10.5} letterSpacing="1.1">
                        <text x={128} y={-15} textAnchor="end">
                          {side}
                        </text>
                        <text x={128} y={-1} textAnchor="end" fill="#4A4238">
                          33⅓ RPM
                        </text>
                        <text x={128} y={13} textAnchor="end" fill="#4A4238">
                          STEREO
                        </text>
                      </g>

                      {/* 左边那枚厂牌小徽记 */}
                      <g transform="translate(-116,-9)">
                        <rect
                          width={20}
                          height={20}
                          fill="none"
                          stroke="#1A1712"
                          strokeOpacity={0.55}
                          strokeWidth={0.9}
                        />
                        <text
                          x={10}
                          y={14.5}
                          textAnchor="middle"
                          fill="#1A1712"
                          fontSize={11}
                          fontWeight={300}
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          WL
                        </text>
                      </g>

                      {/* 曲目表 */}
                      <g fontSize={13}>
                        {lines.map((line, i) => (
                          <text
                            key={line.no}
                            y={44 + i * 17}
                            textAnchor="middle"
                            fill={line.on ? "#1A1712" : "#3E372D"}
                            fontWeight={line.on ? 500 : 400}
                          >
                            {line.no}. {line.text}
                          </text>
                        ))}
                      </g>

                      <text
                        y={138}
                        textAnchor="middle"
                        fill="#7A7264"
                        fontSize={9}
                        letterSpacing="1.6"
                      >
                        {foot}
                      </text>
                    </g>

                    {/* 盘小的时候：曲目表在这个尺寸下只是一片灰点，换成只印大字 */}
                    <g className="vinyl-label-tight">
                      <text
                        y={-34}
                        textAnchor="middle"
                        fill="#1A1712"
                        fontSize={30}
                        fontWeight={300}
                        letterSpacing="6"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {siteConfig.nameEn.toUpperCase()}
                      </text>
                      <text
                        y={-9}
                        textAnchor="middle"
                        fill="#6B6152"
                        fontSize={15}
                        letterSpacing="3"
                      >
                        {tight}
                      </text>
                      <text
                        y={62}
                        textAnchor="middle"
                        fill="#1A1712"
                        fontSize={15}
                        letterSpacing="2"
                      >
                        {side} · 33⅓ RPM
                      </text>
                      <text
                        y={86}
                        textAnchor="middle"
                        fill="#7A7264"
                        fontSize={12.5}
                        letterSpacing="2"
                      >
                        STEREO
                      </text>
                    </g>
                  </>
                )}

                {/* 中心孔（轴孔），封面模式也要留 */}
                <circle r={8} fill="#0A0A0A" />
                <circle
                  r={8}
                  fill="none"
                  stroke={cover ? "rgba(255,255,255,0.4)" : "#1A1712"}
                  strokeOpacity={cover ? 1 : 0.5}
                  strokeWidth={0.8}
                />
              </svg>
            </div>

            <div className="vinyl-lands" />
            <div className="vinyl-light" />
            <div className="vinyl-sheen" style={{ animationPlayState: spin }} />
          </div>

          {/* 唱臂：和盘在同一个透视平面里，只是浮高一点 */}
          <svg
            className="vinyl-arm"
            viewBox={`${-BOX_W / 2} ${-BOX_H / 2} ${BOX_W} ${BOX_H}`}
            aria-hidden
          >
            {/* 唱臂托架。这几处落在盘外、直接坐在浅色页面背景上——
                深底时代的近黑色在浅底上太重，调亮一档（还是深色金属，不是变浅色） */}
            <line
              x1={pt(ARM_L - 8, 30).x}
              y1={pt(ARM_L - 8, 30).y}
              x2={pt(ARM_L + 14, 30).x}
              y2={pt(ARM_L + 14, 30).y}
              stroke="#4A4A4A"
              strokeWidth={7}
              strokeLinecap="round"
            />
            {/* 支点座（不跟着转） */}
            <circle cx={PIVOT.x} cy={PIVOT.y} r={30} fill="#2A2A2A" />
            <circle
              cx={PIVOT.x}
              cy={PIVOT.y}
              r={30}
              fill="none"
              stroke="#4C4C4C"
              strokeWidth={1.2}
            />
            <circle
              cx={PIVOT.x}
              cy={PIVOT.y - 1}
              r={24}
              fill="none"
              stroke="#3A3A3A"
              strokeWidth={1}
            />

            {/* 转轴上那根中心轴（穿过盘心，所以画在盘的上面） */}
            <circle r={7.5} fill="#4A4A4A" />
            <circle r={7.5} fill="none" stroke="#8C8C8C" strokeWidth={1} />
            <circle cx={-2} cy={-2} r={2.4} fill="#C4C4C4" />

            {/* 唱臂本体：按托架姿态画好，整体绕支点旋转 */}
            <g
              ref={armRef}
              className="vinyl-arm-body"
              style={{
                transformBox: "view-box",
                transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
                transform: "rotate(0deg)",
                transition: reduced
                  ? "none"
                  : "transform 1.05s cubic-bezier(0.22,0.61,0.36,1)",
              }}
            >
              {/* 配重——也在盘外，同样调亮一档 */}
              <polygon
                points={`${at(-92, -28)} ${at(-44, -31)} ${at(-44, 31)} ${at(-92, 28)}`}
                fill="#333333"
              />
              <polygon
                points={`${at(-92, -28)} ${at(-44, -31)} ${at(-44, -18)} ${at(-92, -16)}`}
                fill="#4E4E4E"
              />
              <line
                x1={pt(-70, -30).x}
                y1={pt(-70, -30).y}
                x2={pt(-70, 30).x}
                y2={pt(-70, 30).y}
                stroke="#242424"
                strokeWidth={1.6}
              />

              {/* 臂管：靠支点粗、往针尖收，上缘一道高光当作圆柱 */}
              <polygon
                points={`${at(8, -10)} ${at(ARM_L - 96, -6.6)} ${at(ARM_L - 96, 6.6)} ${at(8, 10)}`}
                fill="#6E6E6E"
              />
              <polygon
                points={`${at(8, -10)} ${at(ARM_L - 96, -6.6)} ${at(ARM_L - 96, -3)} ${at(8, -4.6)}`}
                fill="#C6C6C6"
              />
              <polygon
                points={`${at(8, 5.6)} ${at(ARM_L - 96, 3.4)} ${at(ARM_L - 96, 6.6)} ${at(8, 10)}`}
                fill="#2B2B2B"
              />

              {/* 指托 */}
              <line
                x1={pt(ARM_L - 120, 6).x}
                y1={pt(ARM_L - 120, 6).y}
                x2={pt(ARM_L - 104, 30).x}
                y2={pt(ARM_L - 104, 30).y}
                stroke="#9A9A9A"
                strokeWidth={3.4}
                strokeLinecap="round"
              />

              {/* 唱头 */}
              <polygon
                points={`${at(ARM_L - 98, -17)} ${at(ARM_L - 22, -13.5)} ${at(ARM_L - 22, 13.5)} ${at(ARM_L - 98, 17)}`}
                fill="#111111"
              />
              <polygon
                points={`${at(ARM_L - 98, -17)} ${at(ARM_L - 22, -13.5)} ${at(ARM_L - 22, -8)} ${at(ARM_L - 98, -10)}`}
                fill="#343434"
              />
              <line
                x1={pt(ARM_L - 60, -14).x}
                y1={pt(ARM_L - 60, -14).y}
                x2={pt(ARM_L - 60, 14).x}
                y2={pt(ARM_L - 60, 14).y}
                stroke="#5E5E5E"
                strokeWidth={1.1}
              />

              {/* 针尖 */}
              <polygon
                points={`${at(ARM_L - 22, -4.4)} ${at(ARM_L, 0)} ${at(ARM_L - 22, 4.4)}`}
                fill="#D6D6D6"
              />

              {/* 支点上的轴帽 */}
              <circle cx={PIVOT.x} cy={PIVOT.y} r={13} fill="#3A3A3A" />
              <circle cx={PIVOT.x} cy={PIVOT.y} r={4} fill="#8A8A8A" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
});

/* ---------------------------------------------------------------- 唱机 */

export function Turntable() {
  const t = useTranslations("records.player");
  const locale = useLocale();
  const en = locale === "en";
  const reduced = useReducedMotion() ?? false;

  const armRef = useRef<SVGGElement | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const player = usePlayer();
  const {
    track,
    tracks,
    total,
    elapsed,
    broken,
    shouldPlay,
    live,
    group,
    library,
    isClip,
  } = player;

  /** 唱针位置就是进度条：外圈开头、内圈结尾。停下时唱臂抬回托架 */
  const lastDeg = useRef(Number.NaN);
  const paint = useCallback(
    (fraction: number) => {
      const deg = shouldPlay ? armAngle(fraction) : 0;
      // 唱臂一首歌才扫过二十几度，每帧都写等于每帧重启一次 CSS transition。
      // 变化小于 0.04° 就不动它 —— 实际约每秒写两次。
      if (Math.abs(deg - lastDeg.current) < 0.04) return;
      lastDeg.current = deg;
      const arm = armRef.current;
      if (arm) arm.style.transform = `rotate(${deg.toFixed(3)}deg)`;
    },
    [shouldPlay],
  );
  useProgressPainter(player.audioRef, total, reduced, paint);

  /** 键盘只在唱片本身拿到焦点时生效 —— 这是一张会滚动的内容页，不能全局劫持空格 */
  const onDiscKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      player.toggle();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      player.nudge(5);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      player.nudge(-5);
    } else if (e.key === "Home") {
      e.preventDefault();
      player.seek(0);
    }
  };

  if (!track) return null;

  const title = en ? track.titleEn : track.title;
  const artist = en ? track.artistEn : track.artist;
  const fraction = total > 0 ? Math.min(1, elapsed / total) : 0;

  const nameOf = (item: Track) => (en ? item.titleEn : item.title);

  /** 标签上印的曲目表：跟着当前这首滑动的一个 5 行窗口 */
  const from = labelWindow(tracks.length, player.index);
  const lines = tracks.slice(from, from + LABEL_LINES).map((item, i) => ({
    no: from + i + 1,
    text: fit(nameOf(item), 14),
    on: from + i === player.index,
  }));

  /** 换碟：几个场景组 + 常驻那张 */
  const groups: Array<{ key: Group; label: string; count: number }> = [
    ...library.scenes.map((scene) => ({
      key: scene.key,
      label: en ? scene.labelEn : scene.label,
      count: scene.tracks.length,
    })),
    {
      key: RESIDENT,
      label: t("groupResident"),
      count: library.resident.length,
    },
  ];

  /** 碟名 —— 标签中央印的就是它，也是右侧信息栏的分类小标 */
  const discName =
    groups.find((item) => item.key === group)?.label ?? t("groupResident");

  const album = track.album;
  const desc = en ? track.descEn : track.desc;

  return (
    // 2026-08-31：这里原来是一层 bg-shell 的深色卡片，把唱机和页面浅灰背景割裂成
    // 两块。撤掉了——唱片和唱臂现在直接坐在 <main> 的浅色背景上，没有任何容器边界，
    // 靠 Deck 里新增的地面投影落在页面上（见 globals.css 的 .vinyl-floor-shadow）。
    <section aria-label={t("regionLabel")}>
      {/* 唱片（左）+ 信息栏（右）：对照参考图的分类→歌名→艺人→专辑→描述→播放 那套
          信息层级，但视觉是本站自己的黑白系统。窄屏堆叠，sm 起并排 */}
      <div className="grid gap-8 sm:grid-cols-[1.35fr_1fr] sm:items-center sm:gap-9 lg:gap-14">
        <Deck
          armRef={armRef}
          spinning={shouldPlay || live}
          reduced={reduced}
          onSeek={player.seek}
          onKeyDown={onDiscKeyDown}
          ariaLabel={t("seek")}
          valueNow={Math.round(fraction * 100)}
          valueText={`${clock(elapsed)} / ${clock(total)}`}
          discTitle={discName}
          tight={discName}
          side={t("sideA")}
          foot={t("labelFoot", {
            n: tracks.length,
            mode: isClip ? t("labelPreview") : t("labelFull"),
          })}
          lines={lines}
          cover={track.cover}
        />

        {/* 信息栏 */}
        <div className="flex flex-col gap-4">
          {/* 分类小标：当前碟名，淡灰小字 */}
          <p className="text-[10px] tracking-(--tracking-label) text-faint uppercase">
            {discName}
          </p>

          <AnimatePresence mode="wait">
            <motion.h3
              key={track.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.4 }}
              className="font-serif text-[26px] leading-[1.28] font-light text-ink sm:text-[30px]"
            >
              {title}
            </motion.h3>
          </AnimatePresence>

          <div className="-mt-1 flex flex-col gap-0.5">
            <p className="text-[13.5px] text-muted">{artist}</p>
            {album && <p className="text-[12px] text-faint">{album}</p>}
          </div>

          {desc && (
            <p className="max-w-[36em] text-[13px] leading-[1.8] text-muted">
              {desc}
            </p>
          )}

          {/* 播放控件 + 去平台链接 */}
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => player.goto(player.index - 1)}
                aria-label={t("prev")}
                className="text-muted transition-colors hover:text-ink"
              >
                <svg
                  width="17"
                  height="14"
                  viewBox="0 0 17 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  aria-hidden
                >
                  <path d="M15.5 1 5.5 7l10 6z" />
                  <line x1="1.5" y1="1" x2="1.5" y2="13" />
                </svg>
              </button>

              <button
                type="button"
                onClick={player.toggle}
                aria-label={shouldPlay ? t("pause") : t("play")}
                aria-pressed={shouldPlay}
                className="flex size-[50px] items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink"
              >
                {shouldPlay ? (
                  <svg
                    width="13"
                    height="15"
                    viewBox="0 0 13 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    aria-hidden
                  >
                    <line x1="4" y1="1" x2="4" y2="14" />
                    <line x1="9" y1="1" x2="9" y2="14" />
                  </svg>
                ) : (
                  <svg
                    width="13"
                    height="15"
                    viewBox="0 0 13 15"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 7.5 0 15V0z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => player.goto(player.index + 1)}
                aria-label={t("next")}
                className="text-muted transition-colors hover:text-ink"
              >
                <svg
                  width="17"
                  height="14"
                  viewBox="0 0 17 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  aria-hidden
                >
                  <path d="M1.5 1 11.5 7l-10 6z" />
                  <line x1="15.5" y1="1" x2="15.5" y2="13" />
                </svg>
              </button>
            </div>

            {isClip && track.platformUrl && (
              <a
                href={track.platformUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
              >
                {t("fullVersion")}
              </a>
            )}
          </div>

          {/* 时间 + 状态。进度本身由唱针表达，这里给个准确读数 */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <span className="text-[11px] text-faint">
              {shouldPlay ? t("nowPlaying") : t("stopped")}
            </span>
            <div className="flex items-center gap-2.5 font-mono text-[12px] text-faint tabular-nums">
              <span className="text-ink">{clock(elapsed)}</span>
              <span className="h-px w-4 bg-line-strong" />
              <span>{clock(total)}</span>
            </div>
            {isClip && (
              <span className="border border-line-strong px-2 py-0.5 text-[10px] tracking-(--tracking-label) text-muted uppercase">
                {t("previewTag")}
              </span>
            )}
          </div>

          {/* 试听是怎么回事 —— 免得「怎么才放一小段」被当成网页坏了 */}
          {isClip && (
            <p className="max-w-[36em] text-[11.5px] leading-[1.85] text-faint">
              {t("previewNote")}
            </p>
          )}
        </div>
      </div>

      {/* 音量 + 换碟 + 使用提示：全宽的次要控件区 */}
      <div className="mt-9 flex flex-col gap-6 border-t border-line pt-7 sm:mt-10">
        {/* 音量 */}
        <div className="flex items-center gap-3 text-muted">
          <svg
            width="17"
            height="17"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M8 3.5 4.5 6.5H2v5h2.5L8 14.5z" />
            <path d="M11.2 6.4a3.6 3.6 0 0 1 0 5.2" />
          </svg>
          <div className="relative h-4 w-[132px]">
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-line" />
            <div
              className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-ink"
              style={{ width: `${player.volume * 100}%` }}
            />
            <div
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
              style={{ left: `${player.volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(player.volume * 100)}
              onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
              aria-label={t("volume")}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        {/* 换碟 */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="text-[9.5px] tracking-(--tracking-label) text-faint uppercase">
            {t("shelf")}
          </span>
          {/* 场景组多了之后这排会换行，所以每个自己带边框，不再是一条连体的分段控件 */}
          <div className="flex flex-wrap items-stretch gap-2">
            {groups.map((item) => {
              const on = item.key === group;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => player.switchGroup(item.key)}
                  aria-pressed={on}
                  className={[
                    "border px-3 py-1.5 text-[12.5px] tracking-[0.04em] transition-colors",
                    on
                      ? "border-ink bg-ink text-card"
                      : "border-line-strong text-muted hover:border-ink hover:bg-paper hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                  <span
                    className={[
                      "ml-2 text-[11px] tabular-nums",
                      on ? "text-white/55" : "text-faint",
                    ].join(" ")}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11.5px] leading-[1.85] text-faint">{t("hint")}</p>
      </div>

      {/* 常驻那组（4 首肖邦）的可展开曲目清单——场景榜单已经被下面的 Chart 覆盖，
          这里只留常驻这组，避免和 Chart 重复列同一批歌 */}
      {group === RESIDENT && (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setListOpen((open) => !open)}
            aria-expanded={listOpen}
            className="flex w-full items-center justify-between py-3.5 text-[12.5px] text-muted transition-colors hover:text-ink"
          >
            <span>
              {listOpen ? t("hideList") : t("showList")}
              <span className="ml-2 text-faint tabular-nums">
                {tracks.length}
              </span>
            </span>
            <span
              className={[
                "text-[10px] transition-transform",
                listOpen ? "rotate-180" : "",
              ].join(" ")}
              aria-hidden
            >
              ▾
            </span>
          </button>

          <AnimatePresence initial={false}>
            {listOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: reduced ? 0.01 : 0.34,
                  ease: [0.22, 0.61, 0.36, 1],
                }}
                className="overflow-hidden"
              >
                <ul className="border-t border-line">
                  {tracks.map((item, i) => {
                    const on = i === player.index;
                    const dead = Boolean(broken[item.id]);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => player.goto(i)}
                          disabled={dead}
                          className={[
                            "flex w-full items-baseline gap-3.5 border-b border-line py-2.5 text-left transition-colors last:border-b-0",
                            dead
                              ? "cursor-not-allowed text-faint"
                              : on
                                ? "bg-paper text-ink"
                                : "text-muted hover:bg-paper hover:text-ink",
                          ].join(" ")}
                        >
                          <span className="w-5 shrink-0 font-mono text-[11px] text-faint tabular-nums">
                            {on ? "▸" : String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="grow truncate text-[13px]">
                            {nameOf(item)}
                            {dead && (
                              <span className="ml-2 text-[10.5px] text-faint">
                                {t("unplayable")}
                              </span>
                            )}
                          </span>
                          <span className="hidden shrink-0 truncate text-[11.5px] text-faint sm:block">
                            {en ? item.artistEn : item.artist}
                          </span>
                          <span className="w-9 shrink-0 text-right font-mono text-[11px] text-faint tabular-nums">
                            {clock(item.duration)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 出处 */}
      <p className="border-t border-line pt-3.5 text-[11.5px] leading-[1.8] text-faint">
        {group === RESIDENT
          ? t("residentCredit", { credit: library.residentCredit })
          : t("chartNote")}
      </p>
    </section>
  );
}
