"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { usePlayer } from "./PlayerProvider";
import { clock } from "@/lib/clock";
import { useProgressPainter } from "@/lib/useAudioPlayer";
import { localePath } from "@/lib/nav";

/**
 * 右下角的迷你播放器 —— 离开唱片页之后，音乐还在放，这张小卡片就是它的界面。
 *
 * 露面的条件很严：**用户碰过播放器**（在放，或者放过之后按了暂停）才出现，
 * 没播过的时候整站看不到它，一点地方都不占。
 * 唱片页上也不出现 —— 那页已经有一台大唱机了，两个进度条互相打架没有意义。
 *
 * 关掉 = 停止播放并把唱针抬回托架（player.stop()），不是把声音藏起来继续放。
 */

/** 唱片页和开场页不显示：一个已经有大唱机，一个是整屏的开场 */
const HIDE_ON = [/\/records\/?$/, /^\/(zh|en)\/?$/];

export function MiniPlayer() {
  const t = useTranslations("player");
  const locale = useLocale();
  const en = locale === "en";
  const reduced = useReducedMotion() ?? false;
  const pathname = usePathname() ?? "";
  const player = usePlayer();

  const fillRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);

  const { track, touched, shouldPlay, live, elapsed, total, isClip } = player;

  /** 进度条逐帧画，不走重渲染 */
  const paint = useCallback((fraction: number, done: number) => {
    const percent = `${(fraction * 100).toFixed(2)}%`;
    if (fillRef.current) fillRef.current.style.width = percent;
    if (knobRef.current) knobRef.current.style.left = percent;
    if (timeRef.current) timeRef.current.textContent = clock(done);
  }, []);
  useProgressPainter(player.audioRef, total, reduced, paint);

  const hidden = HIDE_ON.some((re) => re.test(pathname));
  const show = Boolean(track) && touched && !hidden;

  return (
    <AnimatePresence>
      {show && track && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: reduced ? 0.01 : 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 w-[min(300px,calc(100vw-1.5rem))] border border-[#232323] bg-[#0A0A0A]/95 px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:right-5 sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
          role="region"
          aria-label={t("regionLabel")}
        >
          <div className="flex items-center gap-3">
            {/* 小唱片：在放就在转 */}
            <Link
              href={localePath(locale, "/records")}
              aria-label={t("toRecords")}
              className="group flex shrink-0 items-center"
            >
              <span
                className="mini-vinyl mini-vinyl-spin"
                style={{
                  animationPlayState:
                    (shouldPlay || live) && !reduced ? "running" : "paused",
                }}
                aria-hidden
              />
            </Link>

            <Link
              href={localePath(locale, "/records")}
              className="min-w-0 grow"
              aria-label={t("toRecords")}
            >
              <p className="truncate text-[12.5px] text-[#EDEDED]">
                {en ? track.titleEn : track.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
                {en ? track.artistEn : track.artist}
                {isClip && (
                  <span className="ml-1.5 text-[#5A5A5A]">· {t("preview")}</span>
                )}
              </p>
            </Link>

            <button
              type="button"
              onClick={player.toggle}
              aria-label={shouldPlay ? t("pause") : t("play")}
              aria-pressed={shouldPlay}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#2E2E2E] text-[#EDEDED] transition-colors hover:border-[#EDEDED]"
            >
              {shouldPlay ? (
                <svg
                  width="9"
                  height="11"
                  viewBox="0 0 9 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden
                >
                  <line x1="2.5" y1="0.5" x2="2.5" y2="10.5" />
                  <line x1="6.5" y1="0.5" x2="6.5" y2="10.5" />
                </svg>
              ) : (
                <svg
                  width="9"
                  height="11"
                  viewBox="0 0 9 11"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M8.5 5.5 0 11V0z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={player.stop}
              aria-label={t("close")}
              className="flex size-6 shrink-0 items-center justify-center text-[#5A5A5A] transition-colors hover:text-[#EDEDED]"
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                aria-hidden
              >
                <line x1="0.5" y1="0.5" x2="8.5" y2="8.5" />
                <line x1="8.5" y1="0.5" x2="0.5" y2="8.5" />
              </svg>
            </button>
          </div>

          {/* 进度：能拖，也能用键盘（原生 range 叠在上面，视觉那一层自己画） */}
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="relative h-3 grow">
              <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[#262626]" />
              <div
                ref={fillRef}
                className="absolute top-1/2 left-0 h-px w-0 -translate-y-1/2 bg-[#EDEDED]"
              />
              <div
                ref={knobRef}
                className="absolute top-1/2 left-0 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EDEDED]"
              />
              <input
                type="range"
                min={0}
                max={1000}
                value={total > 0 ? Math.round((elapsed / total) * 1000) : 0}
                onChange={(e) => player.seek(Number(e.target.value) / 1000)}
                aria-label={t("seek")}
                aria-valuetext={`${clock(elapsed)} / ${clock(total)}`}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-[#5A5A5A] tabular-nums">
              <span ref={timeRef}>{clock(elapsed)}</span>
              {" / "}
              {clock(total)}
            </span>
          </div>

          {/* 试听片段：随时能去平台听完整版 */}
          {isClip && track.platformUrl && (
            <a
              href={track.platformUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-[10.5px] text-[#8A8A8A] underline decoration-[#333333] underline-offset-4 transition-colors hover:text-[#EDEDED]"
            >
              {t("fullVersion")}
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
