"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Notes } from "./Notes";
import { PomodoroDial } from "./PomodoroDial";
import { usePomodoro } from "./usePomodoro";

/**
 * 项目页「小工具」那一栏 —— 番茄钟 + 手记。
 *
 * 2026-09-08：原来这两样在 /focus 那个整屏沉浸页面里（一张中灰「书桌」上摊开的纸，
 * 用纸夹标签翻页）。站主要求把它们并进项目页，理由也说得通：**这两样是他自己做的东西**，
 * 归在「我做的 / 用到的开源」旁边比单开一页更对。同一轮里「时刻表」（去哪儿听的外链表）
 * 整个下线了，别再加回来。
 *
 * 随之退场的还有那套书桌隐喻：DeskBackdrop（桌面渐变）、FocusPaper（纸 + 纸夹标签）、
 * FocusRail（收窄的侧边导航）都删了 —— 它们是为整屏黑底设计的，摆进浅色内容区不成立。
 * PomodoroDial 和 Notes 自己用的是 desk-* 那套**浅色**灰阶（desk-paper #eaeaea、
 * desk-ink #141414），本来就画在浅色纸上，所以这两个组件一行没改就能直接用。
 *
 * 番茄钟的状态提在这一层（usePomodoro）：切去手记那栏，计时照走，
 * 手记右上角还会挂着剩余时间。两栏是一件事的两面。
 *
 * ⚠️ 手记只存在 localStorage（静态站，没有后端）。界面上必须一直摆着「导出全部」
 * 并如实写明「只在这台电脑上」——那句话在 Notes 里，别删。
 */

const TABS = ["pomodoro", "notes"] as const;
type Tab = (typeof TABS)[number];

export function Gadgets() {
  const t = useTranslations("gadgets");
  const reduced = useReducedMotion() ?? false;

  const [tab, setTab] = useState<Tab>("pomodoro");
  const pomodoro = usePomodoro();

  return (
    <div className="mt-7">
      <p className="mb-6 max-w-[620px] text-[13.5px] leading-[1.9] text-muted">
        {t("note")}
      </p>

      {/* 两样小工具之间切一下。纸夹标签换成这一排细边按钮，和站内其他筛选同一个语气 */}
      <div className="flex items-stretch border border-line-strong self-start w-fit">
        {TABS.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={[
              "px-5 py-2 text-[12.5px] tracking-[0.06em] transition-colors",
              i > 0 ? "border-l border-line-strong" : "",
              tab === key
                ? "bg-ink text-paper"
                : "text-muted hover:bg-black/[0.03] hover:text-ink",
            ].join(" ")}
          >
            {t(key === "pomodoro" ? "tabPomodoro" : "tabNotes")}
          </button>
        ))}
      </div>

      {/* 摊开的那一份。原来是桌上的纸（带阴影和稿纸横线），
          现在是内容区里一张普通的白卡，和列表页的 ListRowGroup 同一套底。
          两栏都留在 DOM 里、只挂 hidden：切走时番茄钟不会被卸载，计时才不断。 */}
      <div className="card-face mt-5 px-5 py-8 sm:px-10 sm:py-12">
        <div className={tab === "pomodoro" ? "flex justify-center" : "hidden"}>
          <div className="w-full max-w-[560px]">
            <PomodoroDial pomodoro={pomodoro} reduced={reduced} />
          </div>
        </div>
        <div className={tab === "notes" ? "flex justify-center" : "hidden"}>
          <div className="w-full max-w-[760px]">
            <Notes pomodoro={pomodoro} reduced={reduced} />
          </div>
        </div>
      </div>
    </div>
  );
}
