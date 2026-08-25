"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { LoungeRail } from "./LoungeRail";
import { MusicDial } from "./MusicDial";
import { SceneBackdrop } from "./SceneBackdrop";
import { useAmbient } from "./useAmbient";
import { siteConfig } from "~/site.config";
import type { MusicLibrary } from "@/lib/types";

/**
 * 放松区沉浸模式 —— 对照 docs/design/Lounge.dc.html。
 *
 * 三层：氛围（自托管音频 + 生成式背景）/ 音乐（网易云外链）/ 播客（第三方嵌入）。
 * 中间是三层错相呼吸的同心圆环；有氛围音在放时，圆环跟着实时音量呼吸，
 * 没有音频文件时退回固定节奏的 CSS 呼吸。
 */

const TABS = ["ambient", "music", "podcast"] as const;
type Tab = (typeof TABS)[number];

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function LoungeStage({ music }: { music: MusicLibrary }) {
  const t = useTranslations("lounge");
  const reduced = useReducedMotion() ?? false;

  const scenes = siteConfig.lounge.scenes;
  const ambient = useAmbient(scenes);
  /** setState 的 setter 身份是稳定的，单独拿出来给下面的 effect 用，
      否则 ambient 对象每次渲染都变，effect 每帧重跑会把暂停按钮按回去 */
  const { setPlaying } = ambient;

  const [tab, setTab] = useState<Tab>("ambient");
  const [started, setStarted] = useState(false);
  const [railExpanded, setRailExpanded] = useState(false);
  const [podcastIndex, setPodcastIndex] = useState(0);

  const podcasts = siteConfig.lounge.podcastEmbeds;
  const hasMusic = music.resident.length + music.netease.length > 0;

  /** 没素材的那一层直接不显示 —— 与其给访客看一句「还没配」，不如让它不存在 */
  const tabs = useMemo(
    () =>
      TABS.filter(
        (key) =>
          key === "ambient" ||
          (key === "music" && hasMusic) ||
          (key === "podcast" && podcasts.length > 0),
      ),
    [hasMusic, podcasts.length],
  );

  /** ESC：收起/展开左侧导航（视觉稿底部那行「ESC 退出沉浸」说的就是这个） */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRailExpanded((prev) => !prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** 切到音乐/播客时把氛围音停掉，免得两路声音打架；切回来再续上 */
  useEffect(() => {
    setPlaying(started && tab === "ambient");
  }, [setPlaying, started, tab]);

  const scene = scenes.find((s) => s.key === ambient.sceneKey) ?? scenes[0];
  const sceneName = t(`scenes.${scene.key}.name`);
  const sceneEn = t(`scenes.${scene.key}.en`);

  /** 有实时音量就跟着呼吸，没有就交给 CSS 的固定节奏 */
  const live = ambient.level > 0.002 && !reduced;
  const rings = useMemo(
    () => [
      { size: 1, opacity: 0.07, delay: 0, gain: 0.1 },
      { size: 0.73, opacity: 0.13, delay: 260, gain: 0.08 },
      { size: 0.484, opacity: 0.22, delay: 520, gain: 0.062, glow: true },
    ],
    [],
  );

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-shell text-shell-ink">
      {/* 鼠标移到最左边就展开导航。只留 12px：再宽会盖住图标条上的图标，点不动 */}
      <div
        className="absolute top-0 bottom-0 left-0 z-30 w-3"
        onMouseEnter={() => setRailExpanded(true)}
      />
      <div className="flex h-full" onMouseLeave={() => setRailExpanded(false)}>
        <LoungeRail expanded={railExpanded} />
      </div>

      <div className="relative flex h-full grow flex-col overflow-hidden">
        <SceneBackdrop sceneKey={ambient.sceneKey} reduced={reduced} />

        {/* 顶部弱提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0.01 : 1.2, delay: 0.4 }}
          className="relative z-10 pt-11 text-center text-[10.5px] tracking-(--tracking-label) text-[#4A4A4A]"
        >
          {t("navCollapsed")}
        </motion.div>

        {/* 画面中心 */}
        <div className="relative z-10 flex grow items-center justify-center px-6">
          <AnimatePresence mode="wait">
            {tab === "ambient" && (
              <motion.div
                key="ambient"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.5 }}
                className="relative flex items-center justify-center"
                style={{
                  width: "clamp(220px, 46vmin, 372px)",
                  height: "clamp(220px, 46vmin, 372px)",
                }}
              >
                {rings.map((ring, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-white/10"
                    style={{
                      width: `${ring.size * 100}%`,
                      height: `${ring.size * 100}%`,
                      borderColor: `rgba(237,237,237,${ring.opacity})`,
                      background: ring.glow
                        ? "radial-gradient(circle at 50% 50%, rgba(237,237,237,0.055), rgba(237,237,237,0) 70%)"
                        : undefined,
                      transform: live
                        ? `scale(${1 + ambient.level * ring.gain})`
                        : undefined,
                      transition: live ? "transform 120ms linear" : undefined,
                      animation:
                        live || reduced
                          ? undefined
                          : `dcBreathe 7000ms ease-in-out ${ring.delay}ms infinite`,
                    }}
                    aria-hidden
                  />
                ))}

                <div className="relative flex flex-col items-center gap-2.5">
                  <span className="font-serif text-[26px] font-light tracking-[0.07em] sm:text-[32px]">
                    {sceneName}
                  </span>
                  <span className="text-[10px] tracking-[0.26em] text-shell-dim">
                    {sceneEn}
                  </span>
                </div>
              </motion.div>
            )}

            {tab === "music" && (
              <motion.div
                key="music"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.5 }}
                className="w-full max-w-[560px]"
              >
                <MusicDial
                  library={music}
                  active={tab === "music"}
                  reduced={reduced}
                  autoStart={started}
                />
              </motion.div>
            )}

            {tab === "podcast" && (
              <motion.div
                key="podcast"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.5 }}
                className="w-full max-w-[560px]"
              >
                <div className="rounded-[3px] border border-shell-line-2 bg-[#0E0E0E] p-3">
                  <iframe
                    key={podcasts[podcastIndex]}
                    title={t("tabPodcast")}
                    src={podcasts[podcastIndex]}
                    width="100%"
                    height={420}
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture"
                    className="block border-0 grayscale transition-[filter] duration-500 hover:grayscale-0"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 圆环说明（只在氛围层出现） */}
        {tab === "ambient" && (
          <div className="relative z-10 pb-6 text-center text-[10.5px] tracking-[0.16em] text-[#4A4A4A]">
            {t("ringNote")}
          </div>
        )}

        {/* 底部控制区 */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 pb-10 sm:gap-7 sm:pb-[70px]">
          {/* 三个标签 */}
          <div className="flex items-center gap-8 text-[13px] tracking-[0.1em] sm:gap-[34px]">
            {tabs.map((key) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-pressed={active}
                  className={
                    active
                      ? "border-b border-shell-ink pb-1.5 text-shell-ink"
                      : "border-b border-transparent pb-1.5 text-shell-faint transition-colors hover:text-shell-dim"
                  }
                >
                  {t(
                    key === "ambient"
                      ? "tabAmbient"
                      : key === "music"
                        ? "tabMusic"
                        : "tabPodcast",
                  )}
                </button>
              );
            })}
          </div>

          {/* 场景 / 歌单 / 播客 chips */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {tab === "ambient" &&
              scenes.map((item) => {
                const active = item.key === ambient.sceneKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => ambient.chooseScene(item.key)}
                    aria-pressed={active}
                    className={[
                      "px-4 py-2.5 text-[13px] tracking-[0.06em] transition-colors sm:px-5 sm:py-3",
                      active
                        ? "border border-white/30 text-shell-ink"
                        : "border border-transparent text-shell-dim hover:text-shell-ink",
                    ].join(" ")}
                  >
                    {t(`scenes.${item.key}.name`)}
                  </button>
                );
              })}

            {tab === "podcast" &&
              podcasts.map((src, i) => (
                <Chip
                  key={src}
                  active={i === podcastIndex}
                  onClick={() => setPodcastIndex(i)}
                  label={`${t("tabPodcast")} ${i + 1}`}
                />
              ))}
          </div>

          {/* 播放/暂停 + 音量 + 循环标注（氛围层专属） */}
          {tab === "ambient" && (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
              <button
                type="button"
                onClick={() => {
                  setStarted(true);
                  ambient.setPlaying(!ambient.playing);
                }}
                aria-label={ambient.playing ? t("pause") : t("play")}
                className="flex size-[52px] items-center justify-center rounded-full border border-white/25 transition-colors hover:border-white/50"
              >
                {ambient.playing ? (
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
                  <path d="M13.4 4.2a6.6 6.6 0 0 1 0 9.6" />
                </svg>

                {/* 视觉是那条 1px 细线 + 圆点，真正接事件的是盖在上面的 range */}
                <div className="relative h-4 w-[160px] sm:w-[200px]">
                  <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/[0.18]" />
                  <div
                    className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-shell-ink"
                    style={{ width: `${ambient.volume * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-shell-ink"
                    style={{ left: `${ambient.volume * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(ambient.volume * 100)}
                    onChange={(e) =>
                      ambient.changeVolume(Number(e.target.value) / 100)
                    }
                    aria-label={t("volume")}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>

                <span className="w-[34px] text-[11px] tracking-[0.1em] text-shell-faint">
                  {Math.round(ambient.volume * 100)}%
                </span>
              </div>

              <span className="text-[11px] tracking-[0.14em] text-shell-faint sm:border-l sm:border-shell-line-2 sm:pl-7">
                {t("loopNote")}
              </span>
            </div>
          )}

          {/* 素材还没到位时说一句，别让人以为坏了 */}
          {tab === "ambient" && ambient.sceneMissing && (
            <p className="max-w-[520px] text-center text-[11.5px] leading-[1.7] text-[#4A4A4A]">
              {t("audioMissing")}
            </p>
          )}
        </div>
      </div>

      {/* iOS 需要一次用户手势才允许出声，所以进来先给一层「轻点开始」 */}
      <AnimatePresence>
        {!started && (
          <motion.button
            type="button"
            onClick={() => {
              setStarted(true);
              ambient.setPlaying(true);
            }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.6, ease: EASE }}
            className="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-4 bg-shell/80 backdrop-blur-[2px]"
          >
            <span className="text-[12.5px] tracking-(--tracking-eyebrow) text-shell-ink">
              {t("enter")}
            </span>
            <span className="text-[11px] tracking-[0.1em] text-shell-faint">
              {t("enterHint")}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "px-4 py-2.5 text-[13px] tracking-[0.06em] transition-colors sm:px-5 sm:py-3",
        active
          ? "border border-white/30 text-shell-ink"
          : "border border-transparent text-shell-dim hover:text-shell-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
