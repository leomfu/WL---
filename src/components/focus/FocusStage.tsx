"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Departures } from "./Departures";
import { FocusRail } from "./FocusRail";
import { Notes } from "./Notes";
import { PomodoroDial } from "./PomodoroDial";
import { SceneBackdrop } from "./SceneBackdrop";
import { usePomodoro } from "./usePomodoro";
import { useStoredState } from "@/lib/useStoredState";
import { siteConfig } from "~/site.config";

/**
 * 专注区沉浸模式 —— 对照 docs/design/Lounge.dc.html（画板名还叫 Lounge，没改）。
 *
 * 三层：
 *   番茄钟 一张钟面，指针走这一段专注/休息的时间，时长可以自己设
 *   手记   备忘和博客草稿共用一个写字面，存在 localStorage，导出走剪贴板 / GitHub 预填
 *   时刻表 不播放任何东西，只是「从这里去哪儿听」的外链
 *
 * ── 音乐层去哪了（2026-08-30 撤掉，别再加回来）──
 * 原来第一层是站内直接播放的时间盘（MusicDial）。板块从「放松区」改名成「专注」之后，
 * 一个能在这儿听整首歌的播放器和「专注」是拧着的；而且站内音乐现在有更好的去处 ——
 * 唱片页那台唱机 + 右下角的迷你播放器（跨页不断）。
 * 时刻表因此更有用了：站内只剩 30 秒试听，「去哪儿听完整版」正是它的活儿。
 *
 * ── 氛围音去哪了（2026-08-29 撤掉，别再加回来）──
 * 更早还有一层「氛围」：四段自己用 ffmpeg 合成的环境音（雨/海浪/火/宇宙），
 * 外加一圈跟着实时音量呼吸的同心圆。声音整个撤了，
 * 但那四套**全屏背景画面**留了下来，下放成整个专注区的底 ——
 * 不管你在哪一层，背后都是那片雨或那片星空，底部一排小字随时换。
 */

const TABS = ["pomodoro", "notes", "departures"] as const;
type Tab = (typeof TABS)[number];

export function FocusStage() {
  const t = useTranslations("focus");
  const reduced = useReducedMotion() ?? false;

  const scenes = siteConfig.focus.scenes;
  /** 背景场景。localStorage 的 key 沿用原来氛围层那个，老用户上次选的场景不会丢 */
  const [storedScene, setScene] = useStoredState(
    "lounge-scene",
    scenes[0]?.key ?? "",
  );
  const sceneKey = scenes.some((s) => s.key === storedScene)
    ? storedScene
    : (scenes[0]?.key ?? "");

  const [chosenTab, setTab] = useState<Tab>("pomodoro");
  const [railExpanded, setRailExpanded] = useState(false);

  /** 番茄钟的状态放在这一层：切去音乐层、时刻表层，计时照走 */
  const pomodoro = usePomodoro();

  const departures = siteConfig.focus.departures;

  /** 没素材的那一层直接不显示 —— 与其给访客看一句「还没配」，不如让它不存在 */
  const tabs = useMemo(
    () =>
      TABS.filter(
        (key) =>
          key === "pomodoro" ||
          key === "notes" ||
          (key === "departures" && departures.length > 0),
      ),
    [departures.length],
  );

  /** 万一停在一个已经不存在的标签上（曲库清空了），渲染时就落回第一个 —— 不用 effect 纠正 */
  const tab = tabs.includes(chosenTab) ? chosenTab : (tabs[0] ?? "pomodoro");

  /** ESC：收起/展开左侧导航（视觉稿底部那行「ESC 退出沉浸」说的就是这个） */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRailExpanded((prev) => !prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-shell text-shell-ink">
      {/* 鼠标移到最左边就展开导航。只留 12px：再宽会盖住图标条上的图标，点不动 */}
      <div
        className="absolute top-0 bottom-0 left-0 z-30 w-3"
        onMouseEnter={() => setRailExpanded(true)}
      />
      <div className="flex h-full" onMouseLeave={() => setRailExpanded(false)}>
        <FocusRail expanded={railExpanded} />
      </div>

      <div className="relative flex h-full grow flex-col overflow-hidden">
        <SceneBackdrop sceneKey={sceneKey} reduced={reduced} />

        {/* 顶部弱提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0.01 : 1.2, delay: 0.4 }}
          className="relative z-10 shrink-0 pt-11 text-center text-[10.5px] tracking-(--tracking-label) text-[#4A4A4A]"
        >
          {t("navCollapsed")}
        </motion.div>

        {/* 画面中心。番茄钟展开设置后会变高，所以这一格自己能滚 */}
        <div className="relative z-10 flex grow items-center justify-center overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            {tab === "pomodoro" && (
              <motion.div
                key="pomodoro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.5 }}
                className="w-full max-w-[560px]"
              >
                <PomodoroDial pomodoro={pomodoro} reduced={reduced} />
              </motion.div>
            )}

            {tab === "notes" && (
              <motion.div
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.5 }}
                className="w-full max-w-[760px]"
              >
                <Notes pomodoro={pomodoro} reduced={reduced} />
              </motion.div>
            )}

            {tab === "departures" && (
              <motion.div
                key="departures"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.5 }}
                className="w-full max-w-[560px]"
              >
                <Departures reduced={reduced} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 底部控制区 */}
        <div className="relative z-10 flex shrink-0 flex-col items-center gap-5 px-6 pb-9 sm:pb-12">
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
                    key === "pomodoro"
                      ? "tabPomodoro"
                      : key === "notes"
                        ? "tabNotes"
                        : "tabDepartures",
                  )}
                </button>
              );
            })}
          </div>

          {/* 换背景 —— 不属于任何一层，三层通用，所以做得比标签更轻 */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-5">
            <span className="text-[9.5px] tracking-[0.24em] text-[#3E3E3E] uppercase">
              {t("sceneLabel")}
            </span>
            {scenes.map((item) => {
              const active = item.key === sceneKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScene(item.key)}
                  aria-pressed={active}
                  className={[
                    "text-[11.5px] tracking-[0.08em] transition-colors",
                    active
                      ? "text-shell-dim"
                      : "text-[#3E3E3E] hover:text-shell-dim",
                  ].join(" ")}
                >
                  {t(`scenes.${item.key}.name`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
