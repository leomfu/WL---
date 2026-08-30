"use client";

import { memo, useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { clock } from "@/components/lounge/dial";
import { useAudioPlayer, useProgressPainter } from "@/lib/useAudioPlayer";
import { useStoredState } from "@/lib/useStoredState";
import type { MusicLibrary } from "@/lib/types";

/**
 * 唱片页的主角 —— 一台真能转、真出声的黑胶唱机。
 *
 * 和放松区那张时间盘是**同一套音频内核、两副面孔**：播放状态机在
 * `lib/useAudioPlayer.ts`（换歌 / 播放意图 / 音量 / 外链失效跳过 / 同页互斥），
 * 这里只负责把它画成一张唱片。放松区的表盘一个字都没动 —— 那是全站「时间」意象的一部分。
 *
 * 几何全部写死在下面这组常数里，唱臂的角度是算出来的不是凑出来的：
 * 唱针要落在半径 r 的沟槽上，唱臂绕支点该转多少度，由三角形（支点—盘心—针尖）
 * 的余弦定理解出来。所以「进度 = 唱针从外圈走到内圈」是真的按半径线性走的，
 * 不是拿角度硬插值。
 *
 * 唱片转速取真实的 33⅓ 转 / 分（1.8 秒一圈）—— 快得像风扇就不像唱机了。
 * 转圈用 CSS animation（globals.css 的 dcSpin），暂停时只把 animation-play-state
 * 切成 paused，唱片停在原地而不是弹回 0°；`prefers-reduced-motion` 下全局那条
 * 兜底规则会把动画掐掉，唱片直接不转。
 */

/* ---------------------------------------------------------------- 几何 */

/** 画布。唱片偏左，右上角留给唱臂支点 */
const BOX = 420;
/** 盘心 */
const O = { x: 190, y: 215 };
/** 唱片半径 */
const R = 168;
/** 起播沟槽 / 收尾沟槽的半径 —— 唱针在这两者之间走完一首 */
const R_OUT = 160;
const R_IN = 74;
/** 中心标签 */
const R_LABEL = 56;
/** 唱臂支点与臂长 */
const PIVOT = { x: 366, y: 60 };
const ARM_L = 252;
/** 唱臂停在托架上时的指向（度，0° 指向 +x，顺时针为正——SVG 的 y 朝下） */
const REST_DEG = 88;

const rad = (deg: number) => (deg * Math.PI) / 180;
const D = Math.hypot(PIVOT.x - O.x, PIVOT.y - O.y);
const BEARING = (Math.atan2(O.y - PIVOT.y, O.x - PIVOT.x) * 180) / Math.PI;

/** 唱针要落在半径 r 的沟槽上，唱臂该指向哪个角度（余弦定理） */
function armDeg(r: number) {
  const cos = (D * D + ARM_L * ARM_L - r * r) / (2 * D * ARM_L);
  const alpha = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  return BEARING - alpha;
}

/** 播放进度 0–1 → 唱臂相对托架转过的角度 */
const armAngle = (fraction: number) =>
  armDeg(R_OUT - (R_OUT - R_IN) * Math.max(0, Math.min(1, fraction))) -
  REST_DEG;

/** 沿唱臂方向 d、垂直偏移 o 的一点（唱臂按托架姿态画，之后整体旋转） */
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

/** 标签上那行艺人名。SVG 的 text 不会折行，长了就切 */
const shorten = (text: string, max = 14) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** 沟槽：一圈圈细纹，疏密不均才像压出来的。确定性生成，不用随机数 */
const GROOVES = Array.from({ length: 30 }, (_, i) => {
  const r = R_IN - 4 + ((R - 6 - (R_IN - 4)) * i) / 29;
  // 每隔几圈来一道亮一点的分轨线
  const band = i % 7 === 3;
  return {
    r,
    opacity: band ? 0.22 : 0.055 + 0.03 * ((i * 7) % 3),
    width: band ? 0.9 : 0.6,
  };
});

/* ---------------------------------------------------------------- 盘面 */

type Group = "netease" | "resident";

/**
 * 唱片本体 + 唱臂。指针位置由 ref 写，不走 React 重渲染。
 * memo 起来是因为外层每秒会因为「已播时间」重渲染好几次，这一坨没必要跟着重画。
 */
const Deck = memo(function Deck({
  armRef,
  spinning,
  mark,
  caption,
  reduced,
  onSeek,
  onKeyDown,
  label,
  valueText,
  valueNow,
}: {
  armRef: React.RefObject<SVGGElement | null>;
  spinning: boolean;
  mark: string;
  caption: string;
  reduced: boolean;
  onSeek: (fraction: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  label: string;
  valueText: string;
  valueNow: number;
}) {
  /**
   * 点唱片上的某一圈 = 跳到那个进度 —— 外圈是开头，内圈是结尾，
   * 和唱针走的方向一致。点到标签或盘外不算。
   */
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = BOX / rect.width;
    const x = (e.clientX - rect.left) * scale - O.x;
    const y = (e.clientY - rect.top) * scale - O.y;
    const r = Math.hypot(x, y);
    if (r < R_IN - 6 || r > R_OUT + 8) return;
    onSeek((R_OUT - r) / (R_OUT - R_IN));
  };

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="h-auto w-full cursor-pointer overflow-visible focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      onClick={handleClick}
      onKeyDown={onKeyDown}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valueNow}
      aria-valuetext={valueText}
      tabIndex={0}
    >
      <defs>
        <radialGradient id="rec-vinyl" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="62%" stopColor="#131313" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
        {/* 不跟着转的高光：一道斜着扫过盘面的反光，唱片一转就有了「在动」的实感 */}
        <linearGradient id="rec-sheen" x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.13" />
          <stop offset="34%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="58%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="rec-clip">
          <circle cx={O.x} cy={O.y} r={R} />
        </clipPath>
      </defs>

      {/* 转盘边缘：唱片外面那一圈，让唱片看着是「放在什么上面」 */}
      <circle
        cx={O.x}
        cy={O.y}
        r={R + 13}
        fill="none"
        stroke="#e5e5e5"
        strokeWidth={1}
      />
      <circle
        cx={O.x}
        cy={O.y}
        r={R + 5}
        fill="none"
        stroke="#efefef"
        strokeWidth={1}
      />

      {/* 唱片 —— 这一层在转 */}
      <g
        className="records-disc"
        style={{
          animationPlayState: spinning && !reduced ? "running" : "paused",
        }}
      >
        <circle cx={O.x} cy={O.y} r={R} fill="url(#rec-vinyl)" />

        <g fill="none" stroke="#ffffff">
          {GROOVES.map((g) => (
            <circle
              key={g.r}
              cx={O.x}
              cy={O.y}
              r={g.r}
              strokeOpacity={g.opacity}
              strokeWidth={g.width}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* 中心标签 */}
        <circle cx={O.x} cy={O.y} r={R_LABEL} fill="#ededed" />
        <circle
          cx={O.x}
          cy={O.y}
          r={R_LABEL - 6}
          fill="none"
          stroke="#0a0a0a"
          strokeOpacity={0.16}
          strokeWidth={0.8}
        />
        <text
          x={O.x}
          y={O.y - 18}
          dx={1.5}
          textAnchor="middle"
          fill="#111111"
          fontSize={17}
          fontWeight={300}
          letterSpacing="3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {mark}
        </text>
        <line
          x1={O.x - 14}
          y1={O.y - 9}
          x2={O.x + 14}
          y2={O.y - 9}
          stroke="#0a0a0a"
          strokeOpacity={0.18}
          strokeWidth={0.7}
        />
        <text
          x={O.x}
          y={O.y + 25}
          dx={0.6}
          textAnchor="middle"
          fill="#666666"
          fontSize={7.5}
          letterSpacing="1.2"
        >
          {caption}
        </text>
        <text
          x={O.x}
          y={O.y + 37}
          dx={0.7}
          textAnchor="middle"
          fill="#999999"
          fontSize={6}
          letterSpacing="1.4"
        >
          33⅓ RPM · STEREO
        </text>
        {/* 中心孔 */}
        <circle cx={O.x} cy={O.y} r={3.6} fill="#fafafa" />
        <circle
          cx={O.x}
          cy={O.y}
          r={3.6}
          fill="none"
          stroke="#0a0a0a"
          strokeOpacity={0.35}
          strokeWidth={0.7}
        />
      </g>

      {/* 高光压在唱片上但**不跟着转** */}
      <g clipPath="url(#rec-clip)" pointerEvents="none">
        <rect
          x={O.x - R}
          y={O.y - R}
          width={R * 2}
          height={R * 2}
          fill="url(#rec-sheen)"
        />
      </g>

      {/* 唱臂托架 */}
      <line
        x1={pt(ARM_L - 6, 16).x}
        y1={pt(ARM_L - 6, 16).y}
        x2={pt(ARM_L + 10, 16).x}
        y2={pt(ARM_L + 10, 16).y}
        stroke="#c9c9c9"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* 唱臂 —— 按托架姿态画好，整体绕支点旋转 */}
      <g
        ref={armRef}
        style={{
          transformBox: "view-box",
          transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
          transform: "rotate(0deg)",
          transition: reduced
            ? "none"
            : "transform 1.05s cubic-bezier(0.22,0.61,0.36,1)",
        }}
      >
        {/* 配重：压在支点后头，形状按唱臂的轴向摆正 */}
        <polygon
          points={`${at(-40, -9)} ${at(-13, -11)} ${at(-13, 11)} ${at(-40, 9)}`}
          fill="#2a2a2a"
        />
        <line
          x1={pt(-31, -10).x}
          y1={pt(-31, -10).y}
          x2={pt(-31, 10).x}
          y2={pt(-31, 10).y}
          stroke="#fafafa"
          strokeOpacity={0.35}
          strokeWidth={1}
        />
        {/* 臂管：靠支点粗、往针尖收 */}
        <polygon
          points={`${at(4, -4)} ${at(ARM_L - 40, -2.8)} ${at(ARM_L - 40, 2.8)} ${at(4, 4)}`}
          fill="#1a1a1a"
        />
        {/* 唱头 */}
        <polygon
          points={`${at(ARM_L - 42, -7.6)} ${at(ARM_L - 10, -6)} ${at(ARM_L - 10, 6)} ${at(ARM_L - 42, 7.6)}`}
          fill="#111111"
        />
        <line
          x1={pt(ARM_L - 26, -6.8).x}
          y1={pt(ARM_L - 26, -6.8).y}
          x2={pt(ARM_L - 26, 6.8).x}
          y2={pt(ARM_L - 26, 6.8).y}
          stroke="#fafafa"
          strokeOpacity={0.3}
          strokeWidth={0.9}
        />
        {/* 针尖 */}
        <polygon
          points={`${at(ARM_L - 10, -3.2)} ${at(ARM_L, 0)} ${at(ARM_L - 10, 3.2)}`}
          fill="#555555"
        />
        {/* 支点轴承 */}
        <circle cx={PIVOT.x} cy={PIVOT.y} r={11} fill="#ededed" />
        <circle
          cx={PIVOT.x}
          cy={PIVOT.y}
          r={11}
          fill="none"
          stroke="#c9c9c9"
          strokeWidth={1}
        />
        <circle cx={PIVOT.x} cy={PIVOT.y} r={3.4} fill="#333333" />
      </g>
    </svg>
  );
});

/* ---------------------------------------------------------------- 唱机 */

export function Turntable({ library }: { library: MusicLibrary }) {
  const t = useTranslations("records.player");
  const locale = useLocale();
  const en = locale === "en";
  const reduced = useReducedMotion() ?? false;

  const armRef = useRef<SVGGElement | null>(null);

  const hasNetease = library.netease.length > 0;
  const [group, setGroup] = useStoredState(
    "records-group",
    hasNetease ? "netease" : "resident",
  );
  const [listOpen, setListOpen] = useState(false);

  const currentGroup: Group =
    group === "resident" || !hasNetease ? "resident" : "netease";
  const tracks =
    currentGroup === "resident" ? library.resident : library.netease;

  const player = useAudioPlayer({
    tracks,
    active: true,
    volumeKey: "records-volume",
    // 「我在听」那一叠全放不出来（网易云直链哪天被封）→ 换上常驻那张碟，唱机不会哑
    onExhausted: () => {
      if (currentGroup !== "netease" || library.resident.length === 0)
        return false;
      setGroup("resident");
      return true;
    },
  });
  const { track, total, elapsed, broken, shouldPlay, live } = player;

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
  useProgressPainter(player.audioRef, track?.duration ?? 0, reduced, paint);

  const switchGroup = (next: Group) => {
    if (next === currentGroup) return;
    setGroup(next);
    player.reset();
  };

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

  const groups: Array<{ key: Group; label: string; count: number }> = [
    ...(hasNetease
      ? [
          {
            key: "netease" as const,
            label: t("groupNetease"),
            count: library.netease.length,
          },
        ]
      : []),
    {
      key: "resident" as const,
      label: t("groupResident"),
      count: library.resident.length,
    },
  ];

  return (
    <section
      className="border border-line bg-card"
      aria-label={t("regionLabel")}
    >
      <audio {...player.audioProps} />

      <div className="flex flex-col lg:flex-row">
        {/* 唱机 */}
        <div className="shrink-0 px-5 pt-6 pb-2 sm:px-7 sm:pt-8 lg:w-[58%] lg:pb-8">
          <Deck
            armRef={armRef}
            spinning={shouldPlay || live}
            mark="WL"
            caption={shorten(artist)}
            reduced={reduced}
            onSeek={player.seek}
            onKeyDown={onDiscKeyDown}
            label={t("seek")}
            valueNow={Math.round(fraction * 100)}
            valueText={`${clock(elapsed)} / ${clock(total)}`}
          />
        </div>

        {/* 曲目信息 + 控件 */}
        <div className="flex grow flex-col justify-center gap-6 border-t border-line px-5 py-7 sm:px-7 lg:border-t-0 lg:border-l lg:py-8">
          <div>
            <p className="text-[10px] tracking-(--tracking-label) text-faint uppercase">
              {shouldPlay ? t("nowPlaying") : t("stopped")}
            </p>
            <AnimatePresence mode="wait">
              <motion.h3
                key={track.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.4 }}
                className="mt-2.5 font-serif text-[22px] leading-[1.35] font-light text-ink"
              >
                {title}
              </motion.h3>
            </AnimatePresence>
            <p className="mt-1.5 text-[13.5px] text-muted">{artist}</p>
          </div>

          {/* 时间。进度本身由唱针表达，这里只给个准确读数 */}
          <div className="flex items-center gap-2.5 font-mono text-[12px] text-faint tabular-nums">
            <span className="text-body">{clock(elapsed)}</span>
            <span className="h-px w-4 bg-line-strong" />
            <span>{clock(total)}</span>
          </div>

          {/* 上一首 / 播放 / 下一首 */}
          <div className="flex items-center gap-7">
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

          {/* 音量 */}
          <div className="flex items-center gap-3">
            <svg
              width="17"
              height="17"
              viewBox="0 0 18 18"
              fill="none"
              stroke="#999999"
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
            <div className="flex items-stretch border border-line">
              {groups.map((item, i) => {
                const on = item.key === currentGroup;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => switchGroup(item.key)}
                    aria-pressed={on}
                    className={[
                      "px-3.5 py-2 text-[12.5px] tracking-[0.04em] transition-colors",
                      i > 0 ? "border-l border-line" : "",
                      on
                        ? "bg-ink text-paper"
                        : "text-muted hover:bg-paper hover:text-ink",
                    ].join(" ")}
                  >
                    {item.label}
                    <span
                      className={[
                        "ml-2 text-[11px] tabular-nums",
                        on ? "text-white/60" : "text-faint",
                      ].join(" ")}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11.5px] leading-[1.85] text-faint">
            {t("hint")}
          </p>
        </div>
      </div>

      {/* 曲目清单 */}
      <div className="border-t border-line">
        <button
          type="button"
          onClick={() => setListOpen((open) => !open)}
          aria-expanded={listOpen}
          className="flex w-full items-center justify-between px-5 py-3.5 text-[12.5px] text-muted transition-colors hover:text-ink sm:px-7"
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
                          "flex w-full items-baseline gap-3.5 border-b border-line px-5 py-2.5 text-left transition-colors last:border-b-0 sm:px-7",
                          dead
                            ? "cursor-not-allowed text-faint"
                            : on
                              ? "bg-paper text-ink"
                              : "text-body hover:bg-paper hover:text-ink",
                        ].join(" ")}
                      >
                        <span className="w-5 shrink-0 font-mono text-[11px] text-faint tabular-nums">
                          {on ? "▸" : String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="grow truncate text-[13px]">
                          {en ? item.titleEn : item.title}
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

      {/* 出处 */}
      <p className="border-t border-line px-5 py-3.5 text-[11.5px] leading-[1.8] text-faint sm:px-7">
        {currentGroup === "resident"
          ? t("residentCredit", { credit: library.residentCredit })
          : t("neteaseNote")}
        {currentGroup === "netease" && library.playlistUrl && (
          <>
            {" "}
            <a
              href={library.playlistUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
            >
              {t("fullPlaylist")}
            </a>
          </>
        )}
      </p>
    </section>
  );
}
