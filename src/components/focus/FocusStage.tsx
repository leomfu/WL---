"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Departures } from "./Departures";
import { DeskBackdrop } from "./DeskBackdrop";
import { FocusPaper } from "./FocusPaper";
import { FocusRail } from "./FocusRail";
import { Notes } from "./Notes";
import { PomodoroDial } from "./PomodoroDial";
import { usePomodoro } from "./usePomodoro";
import { siteConfig } from "~/site.config";

/**
 * 专注区沉浸模式 —— 对照 design-v2/Focus.dc.html。
 *
 * 三层：
 *   番茄钟 一行大字 + 一道进度线，走这一段专注/休息的时间，时长可以自己设
 *   手记   备忘和博客草稿共用一个写字面，存在 localStorage，导出走剪贴板 / GitHub 预填
 *   时刻表 不播放任何东西，只是「从这里去哪儿听」的外链
 *
 * ── 重做成「书桌」（2026-08-3x，站主看过画板拍板）──
 * 不再以时间为主题：番茄钟的大表盘整个拿掉，页面变成一张写字台——中灰渐变桌面，
 * 三层是摊在上面的纸，用纸夹标签切换（挪到纸的上沿，不再是页面最底部离操作区
 * 四百多像素那种够不着的位置）。原来页面底部还有一排「换背景」的场景切换
 * （雨夜/海浪/篝火/深空四套纯 CSS 背景），桌面定稿之后桌子只有一张，
 * 不再需要可切换的场景，这排连同 SceneBackdrop 一起撤了，别再加回来。
 *
 * ── 音乐层去哪了（2026-08-30 撤掉，别再加回来）──
 * 原来第一层是站内直接播放的时间盘（MusicDial）。板块从「放松区」改名成「专注」之后，
 * 一个能在这儿听整首歌的播放器和「专注」是拧着的；而且站内音乐现在有更好的去处 ——
 * 唱片页那台唱机 + 右下角的迷你播放器（跨页不断）。
 * 时刻表因此更有用了：站内只剩 30 秒试听，「去哪儿听完整版」正是它的活儿。
 *
 * ── 氛围音去哪了（2026-08-29 撤掉，别再加回来）──
 * 更早还有一层「氛围」：四段自己用 ffmpeg 合成的环境音（雨/海浪/火/宇宙）。
 * 声音撤了之后画面留下来当过全局背景，现在连画面也随桌面隐喻一起退场了。
 */

const TABS = ["pomodoro", "notes", "departures"] as const;
type Tab = (typeof TABS)[number];

export function FocusStage() {
  const t = useTranslations("focus");
  const reduced = useReducedMotion() ?? false;

  const [chosenTab, setTab] = useState<Tab>("pomodoro");
  const [railExpanded, setRailExpanded] = useState(false);

  /** 番茄钟的状态放在这一层：切去手记、时刻表层，计时照走 */
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

  const labelFor = (key: Tab) =>
    t(
      key === "pomodoro"
        ? "tabPomodoro"
        : key === "notes"
          ? "tabNotes"
          : "tabDepartures",
    );

  return (
    <div className="relative flex h-dvh w-full overflow-hidden text-desk-ink">
      {/* 桌面背景铺满整个视口，包括图标条底下——图标条是压在桌面材质上的半透明黑，
          不是自己一块底色，铺在内容列里会漏出 body 的浅灰，图标条就变成一条错误的浅灰带。 */}
      <DeskBackdrop />

      {/* 鼠标移到最左边就展开导航。只留 12px：再宽会盖住图标条上的图标，点不动 */}
      <div
        className="absolute top-0 bottom-0 left-0 z-30 w-3"
        onMouseEnter={() => setRailExpanded(true)}
      />
      <div className="relative flex h-full" onMouseLeave={() => setRailExpanded(false)}>
        <FocusRail expanded={railExpanded} />
      </div>

      <div className="relative flex h-full grow flex-col overflow-hidden">
        {/* 顶部弱提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0.01 : 1.2, delay: 0.4 }}
          className="relative z-10 shrink-0 pt-11 text-center text-[10.5px] tracking-(--tracking-label) text-[rgba(237,237,237,0.28)]"
        >
          {t("navCollapsed")}
        </motion.div>

        {/* 桌上那份纸。番茄钟展开设置后会变高，所以这一格自己能滚 */}
        <div className="relative z-10 flex grow items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
          <FocusPaper tabs={tabs} active={tab} onSelect={setTab} labelFor={labelFor}>
            <AnimatePresence mode="wait">
              {tab === "pomodoro" && (
                <motion.div
                  key="pomodoro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0.01 : 0.5 }}
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
                >
                  <Departures reduced={reduced} />
                </motion.div>
              )}
            </AnimatePresence>
          </FocusPaper>
        </div>
      </div>
    </div>
  );
}

