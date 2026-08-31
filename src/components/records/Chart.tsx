"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePlayer } from "@/components/player/PlayerProvider";
import { clock } from "@/lib/clock";
import type { MusicScene, Track } from "@/lib/types";

/**
 * 「按心情听」榜单 —— 按 4 个心情场景分组，铺开显示 content/music/chart.json
 * 里的全部曲目（封面 + 歌名 + 艺人 + 时长），取代原来那面「我听的」专辑墙
 * （已从页面撤掉，见 records/page.tsx 的注释）。
 *
 * **整行可点 = 装到唱机上播放**，不是跳转；平台链接是行尾一个次要出口，
 * 单独一个 <a>，不嵌在 <button> 里（嵌套交互元素不合法，也分不清「试听」和「去平台」）。
 *
 * Turntable 自己的可展开曲目清单只留了常驻那组——场景组的浏览已经在这儿了，
 * 两处重复列同一批歌没有意义。上一首/下一首在当前场景组内流转是 PlayerProvider
 * 的既有行为（goto/jump 都在「当前这一组的 tracks」里取模），这里不用另外处理。
 */
export function Chart({ scenes }: { scenes: MusicScene[] }) {
  const t = useTranslations("records");
  const locale = useLocale();
  const en = locale === "en";
  const player = usePlayer();

  if (scenes.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline gap-3.5">
        <h2 className="text-lg font-medium tracking-[0.01em] text-ink">
          {t("chart.title")}
        </h2>
        <span className="text-[13px] text-faint">{t("chart.note")}</span>
      </div>

      <div className="mt-7 flex flex-col gap-8">
        {scenes.map((scene) => (
          <SceneGroup key={scene.key} scene={scene} en={en} t={t} player={player} />
        ))}
      </div>
    </div>
  );
}

function SceneGroup({
  scene,
  en,
  t,
  player,
}: {
  scene: MusicScene;
  en: boolean;
  t: ReturnType<typeof useTranslations>;
  player: ReturnType<typeof usePlayer>;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-medium tracking-[0.01em] text-ink">
        {en ? scene.labelEn : scene.label}
        <span className="ml-2 text-[11px] text-faint tabular-nums">
          {scene.tracks.length}
        </span>
      </h3>

      <ul className="mt-3 divide-y divide-line">
        {scene.tracks.map((track, i) => {
          const isCurrent = player.group === scene.key && player.index === i;
          const dead = Boolean(player.broken[track.id]);
          const title = en ? track.titleEn : track.title;
          const artist = en ? track.artistEn : track.artist;

          return (
            <li
              key={track.id}
              className={[
                "flex items-center gap-3 py-2.5 transition-colors",
                isCurrent ? "bg-paper" : "hover:bg-paper",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => player.playAt(scene.key, i)}
                disabled={dead}
                aria-pressed={isCurrent}
                aria-label={`${t("chart.playRow")}：${title} · ${artist}`}
                className={[
                  "flex min-w-0 flex-1 items-center gap-3 text-left",
                  dead ? "cursor-not-allowed" : "",
                ].join(" ")}
              >
                <Cover src={track.cover} alt="" current={isCurrent} />
                <span className="min-w-0 flex-1">
                  <span
                    className={[
                      "block truncate text-[13.5px]",
                      dead ? "text-faint" : "text-ink",
                    ].join(" ")}
                  >
                    {title}
                    {dead && (
                      <span className="ml-2 text-[10.5px] text-faint">
                        {t("player.unplayable")}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {artist}
                  </span>
                </span>
                <span className="hidden shrink-0 font-mono text-[11px] text-faint tabular-nums sm:block">
                  {clock(track.duration)}
                </span>
              </button>

              {track.platformUrl && (
                <a
                  href={track.platformUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[11px] whitespace-nowrap text-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                >
                  <span className="hidden sm:inline">
                    {t("chart.openPlatform")}
                  </span>
                  <span className="sm:hidden" aria-hidden>
                    ↗
                  </span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 封面缩略图：内容图片，允许有颜色。没有封面（理论上不会发生，防御性处理）就给一个素方块 */
function Cover({
  src,
  alt,
  current,
}: {
  src: Track["cover"];
  alt: string;
  current: boolean;
}) {
  return (
    <span
      className={[
        "relative size-11 shrink-0 overflow-hidden border bg-paper",
        current ? "border-ink" : "border-line",
      ].join(" ")}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes="44px" className="object-cover" />
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="absolute inset-0 m-auto size-4 text-faint"
          aria-hidden
        >
          <circle cx="7" cy="15" r="2.4" />
          <path d="M9.4 15V4.5L16 3v9" />
          <circle cx="13.6" cy="12" r="2.4" />
        </svg>
      )}
    </span>
  );
}
