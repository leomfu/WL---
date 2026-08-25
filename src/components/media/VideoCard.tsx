"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { Video } from "@/lib/types";
import { localized, shortDate } from "@/lib/format";

/**
 * 视频卡片：默认只画封面（没有 cover 就是黑白占位画面），点了才真的插入 iframe。
 * 这样一页放十条视频也不会一次性拉十个播放器（PLAN.md §4「懒加载」）。
 */
export function VideoCard({ video }: { video: Video }) {
  const t = useTranslations("videos");
  const locale = useLocale();
  const [loaded, setLoaded] = useState(false);

  const title = localized(locale, video.title, video.title_en);
  const desc = localized(locale, video.desc, video.desc_en);

  const embed =
    video.platform === "bilibili"
      ? `https://player.bilibili.com/player.html?bvid=${video.id}&autoplay=1&high_quality=1&danmaku=0`
      : `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`;

  const pageUrl =
    video.platform === "bilibili"
      ? `https://www.bilibili.com/video/${video.id}`
      : `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <article className="flex flex-col gap-4 border border-line bg-card p-4 sm:p-5">
      <div className="relative aspect-video w-full overflow-hidden bg-shell">
        {loaded ? (
          <iframe
            src={embed}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            aria-label={`${t("load")} — ${title}`}
            className={`group absolute inset-0 flex flex-col items-center justify-center gap-4 transition-colors ${
              video.cover ? "text-shell-ink" : "text-shell-dim hover:text-shell-ink"
            }`}
            style={
              video.cover
                ? undefined
                : {
                    // 无封面时回退画板里的深色渐变占位（PLAN.md §5）
                    backgroundImage:
                      "radial-gradient(72% 60% at 50% 40%, #202020 0%, #121212 52%, #0A0A0A 100%)",
                  }
            }
          >
            {video.cover && (
              <>
                {/* 封面图 + 压暗层：封面是彩色内容图片（内容图片不受黑白 UI 约束），
                    压暗保证播放按钮和文字在浅色封面上也可读 */}
                <Image
                  src={video.cover}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 720px, 100vw"
                  className="object-cover"
                  aria-hidden
                />
                <span
                  className="absolute inset-0 transition-opacity group-hover:opacity-80"
                  style={{
                    background:
                      "radial-gradient(85% 70% at 50% 45%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.42) 100%)",
                  }}
                  aria-hidden
                />
              </>
            )}
            <span
              className={`relative flex size-14 items-center justify-center rounded-full border transition-colors ${
                video.cover
                  ? "border-white/55 bg-black/35 backdrop-blur-[2px] group-hover:border-white group-hover:bg-black/55"
                  : "border-shell-line-3 group-hover:border-shell-dim"
              }`}
            >
              <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden>
                <path d="M15 9 0 18V0z" />
              </svg>
            </span>
            <span
              className={`relative text-[10.5px] tracking-(--tracking-label) ${
                video.cover ? "[text-shadow:0_1px_6px_rgba(0,0,0,0.6)]" : ""
              }`}
            >
              {t("load")}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[16.5px] text-ink">{title}</h2>
          <span className="shrink-0 text-[12.5px] whitespace-nowrap text-faint">
            {shortDate(video.date, locale)}
          </span>
        </div>
        <p className="text-sm leading-[1.75] text-muted">{desc}</p>
        <a
          href={pageUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="self-start text-[12.5px] text-faint transition-colors hover:text-ink"
        >
          {video.platform === "bilibili" ? t("onBilibili") : t("onYoutube")} ↗
        </a>
      </div>
    </article>
  );
}
