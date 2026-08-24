"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Video } from "@/lib/types";
import { localized, shortDate } from "@/lib/format";

/**
 * 视频卡片：默认只画一个黑白的占位画面，点了才真的插入 iframe。
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
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4 text-shell-dim transition-colors hover:text-shell-ink"
            style={{
              backgroundImage:
                "radial-gradient(72% 60% at 50% 40%, #202020 0%, #121212 52%, #0A0A0A 100%)",
            }}
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-shell-line-3 transition-colors group-hover:border-shell-dim">
              <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden>
                <path d="M15 9 0 18V0z" />
              </svg>
            </span>
            <span className="text-[10.5px] tracking-(--tracking-label)">{t("load")}</span>
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
