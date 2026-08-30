"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  BOX,
  C,
  Hub,
  RING_R,
  TICKS,
  TickMarks,
  clock,
  handPoints,
} from "./dial";
import { useAudioPlayer, useProgressPainter } from "@/lib/useAudioPlayer";
import { useStoredState } from "@/lib/useStoredState";
import type { MusicLibrary } from "@/lib/types";

/**
 * 放松区「音乐」层 —— 全屏的时间盘播放器，和开场页的时间之钟同一套语言
 * （60 道刻度、锥形指针、#EDEDED 描线），只是指针走的不是当前时间，
 * 而是**这首歌的时间**：转满一圈 = 这首歌放完。
 *
 * 为什么不用网易云的外链播放器：那是跨域 iframe，白底红标改不了，而且对没登录的
 * 访客只放出歌单前 10 首。这里改成自己的 <audio> + 自己的界面。
 *
 * 两组曲目（见 lib/content.ts 的 getMusic）：
 * - 常驻 resident：自托管的公共领域录音，永远能放，是兜底；
 * - 我在听 netease：网易云外链，构建前用 scripts/fetch-netease.mjs 验过能出声的才收录。
 *   外链随时可能失效，所以运行时再失败一次就把这首标灰并自动跳下一首，
 *   整组都挂了就退回常驻 —— 页面不会变成一片死寂。
 *
 * 没接 AnalyserNode 让圆环跟着音乐律动：一旦把 <audio> 接进 WebAudio 图，
 * 跨域且没有 CORS 的音源会被静音，网易云那条链路赌不起。氛围层是自托管的，
 * 那边照旧跟着实时音量呼吸。
 *
 * 播放的状态机（换歌 / 播放意图 / 音量 / 失效跳过）在 `lib/useAudioPlayer.ts`，
 * 和唱片页的黑胶唱机共用一份 —— **这里只剩界面**。同一个文档里两处不会同时出声。
 */

/** 自播的两组：网易云直链、自托管常驻 */
type Group = "netease" | "resident";

/** 盘面：刻度 + 进度弧 + 指针。指针角度逐帧由 ref 写，不走 React 重渲染 */
const Face = memo(function Face({
  handRef,
  arcRef,
  onSeek,
  seekLabel,
}: {
  handRef: React.RefObject<SVGGElement | null>;
  arcRef: React.RefObject<SVGCircleElement | null>;
  onSeek: (fraction: number) => void;
  seekLabel: string;
}) {
  /** 点圆盘上的某个角度 = 跳到那个进度。12 点方向是 0 */
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const deg = (Math.atan2(x, -y) * 180) / Math.PI;
    onSeek(((deg + 360) % 360) / 360);
  };

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="absolute inset-0 h-full w-full cursor-pointer overflow-visible"
      onClick={handleClick}
      role="slider"
      aria-label={seekLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={-1}
    >
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

      <TickMarks ticks={TICKS} />

      {/* 进度弧：pathLength=1 之后 dasharray 直接就是「已播比例」 */}
      <circle
        ref={arcRef}
        cx={C}
        cy={C}
        r={RING_R - 14}
        fill="none"
        stroke="rgba(237,237,237,0.55)"
        strokeWidth={1.4}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0 1"
        transform={`rotate(-90 ${C} ${C})`}
        vectorEffect="non-scaling-stroke"
      />

      {/* 指针：和时间之钟的分针同款锥形 */}
      <g ref={handRef} transform={`rotate(0 ${C} ${C})`}>
        <polygon
          points={handPoints(RING_R - 4)}
          fill="#EDEDED"
          opacity={0.92}
        />
      </g>

      <Hub />
    </svg>
  );
});

export function MusicDial({
  library,
  active,
  reduced,
  autoStart,
}: {
  library: MusicLibrary;
  active: boolean;
  reduced: boolean;
  /** 用户已经在这一页点过一次（过了浏览器的出声门槛）—— 切到音乐层就直接接着放 */
  autoStart: boolean;
}) {
  const t = useTranslations("lounge.music");
  const locale = useLocale();
  const en = locale === "en";

  const handRef = useRef<SVGGElement | null>(null);
  const arcRef = useRef<SVGCircleElement | null>(null);

  const hasNetease = library.netease.length > 0;
  const [group, setGroup] = useStoredState(
    "lounge-music-group",
    hasNetease ? "netease" : "resident",
  );
  const [listOpen, setListOpen] = useState(false);

  const currentGroup: Group =
    group === "resident" || !hasNetease ? "resident" : "netease";
  const tracks =
    currentGroup === "resident" ? library.resident : library.netease;

  /** 播放的状态机在 lib/useAudioPlayer，这里只画界面 */
  const player = useAudioPlayer({
    tracks,
    active,
    autoStart,
    volumeKey: "lounge-music-volume",
    // 「我在听」整组都放不出来了（直链哪天被封）→ 退回常驻曲库，页面不会变成一片死寂
    onExhausted: () => {
      if (currentGroup !== "netease" || library.resident.length === 0)
        return false;
      setGroup("resident");
      return true;
    },
  });
  const { track, total, broken, shouldPlay, live, elapsed, volume } = player;
  const index = player.index;

  const title = track ? (en ? track.titleEn : track.title) : "";
  const artist = track ? (en ? track.artistEn : track.artist) : "";

  const switchGroup = (next: Group) => {
    if (next === currentGroup) return;
    setGroup(next);
    player.reset();
  };

  /** 逐帧把进度写进指针和弧线（不走 setState，省掉每帧重渲染） */
  const paint = useCallback((fraction: number) => {
    handRef.current?.setAttribute(
      "transform",
      `rotate(${fraction * 360} ${C} ${C})`,
    );
    arcRef.current?.setAttribute("stroke-dasharray", `${fraction} 1`);
  }, []);
  useProgressPainter(player.audioRef, track?.duration ?? 0, reduced, paint);

  /** 键盘：空格播放/暂停，左右键 ±5 秒，L 开关清单。只在音乐层生效 */
  const { toggle, nudge } = player;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") {
        nudge(5);
      } else if (e.key === "ArrowLeft") {
        nudge(-5);
      } else if (e.key === "l" || e.key === "L") {
        setListOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, nudge, toggle]);

  if (!track) return null;

  /** 一组分段控件：我在听 / 常驻。Spotify 那簇已经挪到「时刻表」层去了 */
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
    <div className="flex w-full flex-col items-center gap-7">
      <audio {...player.audioProps} />

        {/* 时间盘 */}
        <div
          className="relative"
          style={{
            width: "clamp(240px, 46vmin, 372px)",
            height: "clamp(240px, 46vmin, 372px)",
          }}
        >
          <div
            className="pointer-events-none absolute -inset-[14%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(237,237,237,0.09) 0%, rgba(237,237,237,0.03) 42%, rgba(237,237,237,0) 70%)",
            }}
            aria-hidden
          />

          <Face
            handRef={handRef}
            arcRef={arcRef}
            onSeek={player.seek}
            seekLabel={t("seek")}
          />

          {/* 盘心：曲名 + 艺人。指针从上面扫过 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-[22%] text-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={track.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.45 }}
                className="font-serif text-[17px] leading-[1.45] font-light tracking-[0.04em] text-shell-ink sm:text-[19px]"
              >
                {title}
              </motion.span>
            </AnimatePresence>
            <span className="text-[10.5px] tracking-[0.18em] text-shell-dim">
              {artist}
            </span>
          </div>
        </div>

        {/* 时间 */}
        <div className="flex items-center gap-3 font-mono text-[12px] tracking-[0.1em] text-shell-dim tabular-nums">
          <span className="text-shell-ink">{clock(elapsed)}</span>
          <span className="text-shell-faint">/</span>
          <span>{clock(total)}</span>
        </div>

        {/* 上一首 / 播放 / 下一首 */}
        <div className="flex items-center gap-9">
          <button
            type="button"
            onClick={() => player.goto(index - 1)}
            aria-label={t("prev")}
            className="text-shell-dim transition-colors hover:text-shell-ink"
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
            className="flex size-[52px] items-center justify-center rounded-full border border-white/25 transition-colors hover:border-white/50"
          >
            {live || shouldPlay ? (
              <svg
                width="14"
                height="16"
                viewBox="0 0 14 16"
                fill="none"
                stroke="#EDEDED"
                strokeWidth="1.4"
                aria-hidden
              >
                <line x1="4" y1="1" x2="4" y2="15" />
                <line x1="10" y1="1" x2="10" y2="15" />
              </svg>
            ) : (
              <svg
                width="14"
                height="16"
                viewBox="0 0 14 16"
                fill="#EDEDED"
                aria-hidden
              >
                <path d="M13 8 0 16V0z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => player.goto(index + 1)}
            aria-label={t("next")}
            className="text-shell-dim transition-colors hover:text-shell-ink"
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

        {/* 音量 —— 和氛围层同一条细线 */}
        <div className="flex items-center gap-3.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="#8A8A8A"
            strokeWidth="1.2"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M8 3.5 4.5 6.5H2v5h2.5L8 14.5z" />
            <path d="M11.2 6.4a3.6 3.6 0 0 1 0 5.2" />
          </svg>
          <div className="relative h-4 w-[140px]">
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/[0.18]" />
            <div
              className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-shell-ink"
              style={{ width: `${volume * 100}%` }}
            />
            <div
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-shell-ink"
              style={{ left: `${volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
              aria-label={t("volume")}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

      {/* 选音乐 */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-stretch border border-white/12">
          {groups.map((item, i) => {
            const on = item.key === currentGroup;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => switchGroup(item.key)}
                aria-pressed={on}
                className={[
                  "px-4 py-2.5 text-[13px] tracking-[0.06em] transition-colors sm:px-[22px]",
                  i > 0 ? "border-l border-white/12" : "",
                  on
                    ? "bg-white/[0.07] text-shell-ink"
                    : "text-shell-dim hover:bg-white/[0.03] hover:text-shell-ink",
                ].join(" ")}
              >
                {item.label}
                <span className="ml-2 text-[11px] text-shell-faint tabular-nums">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setListOpen((open) => !open)}
          aria-expanded={listOpen}
          className="text-[13px] tracking-[0.06em] text-shell-dim transition-colors hover:text-shell-ink"
        >
          {listOpen ? t("hideList") : t("showList")}
          <span className="ml-2 text-[10px] tracking-[0.2em] text-shell-faint">
            L
          </span>
        </button>
      </div>

      {/* 曲目清单 */}
      <AnimatePresence>
        {listOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: reduced ? 0.01 : 0.34,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="w-full max-w-[520px] overflow-hidden"
          >
            <ul className="max-h-[34vh] overflow-y-auto border-t border-shell-line-2">
              {tracks.map((item, i) => {
                const on = i === index;
                const dead = Boolean(broken[item.id]);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => player.goto(i)}
                      disabled={dead}
                      className={[
                        "flex w-full items-baseline gap-4 border-b border-shell-line-2 px-2 py-3 text-left transition-colors",
                        dead
                          ? "cursor-not-allowed text-shell-faint"
                          : on
                            ? "text-shell-ink"
                            : "text-shell-dim hover:text-shell-ink",
                      ].join(" ")}
                    >
                      <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums">
                        {on ? "▸" : String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="grow truncate text-[13px]">
                        {en ? item.titleEn : item.title}
                        {dead && (
                          <span className="ml-2 text-[10.5px] text-shell-faint">
                            {t("unplayable")}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 truncate text-[11.5px] text-shell-faint">
                        {en ? item.artistEn : item.artist}
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-shell-faint">
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

      {/* 出处 / 外链 */}
      <p className="max-w-[520px] text-center text-[11px] leading-[1.9] tracking-[0.04em] text-shell-faint">
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
              className="text-shell-dim underline decoration-white/20 underline-offset-4 transition-colors hover:text-shell-ink"
            >
              {t("fullPlaylist")}
            </a>
          </>
        )}
      </p>
    </div>
  );
}
