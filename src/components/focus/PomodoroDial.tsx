"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LIMITS, clampConf } from "./usePomodoro";
import type { Phase, Pomodoro } from "./usePomodoro";

/**
 * 番茄钟 —— 桌面隐喻定稿之后（design-v2/Focus.dc.html），钟面整个拿掉了。
 * 时间是纸上一行大字，下面一道进度线，走到头就是这一段结束，不再转圈。
 *
 * 走针换成写字：数字和进度线的位置都是逐帧用 ref 写 DOM，不走 React 重渲染 ——
 * 这一层要在屏幕上待几十分钟，每秒重画一次没有必要。状态（在跑没跑、剩多少、
 * 时长设成了几分钟）仍然在 usePomodoro 里，切到别的层也照走，这轮完全没动。
 *
 * 时长编辑也跟着改了地方：以前是「设置时长」展开一个面板，三个 +/- 输入框；
 * 现在直接点预设上的数字就能改（画板原话「点数字可以自己改时长」），
 * 分钟数编辑挪进了 PresetChip 里。长休间隔和恢复默认这两项不常用、画板里也没画，
 * 收进一个默认收起的「更多」链接，展开时还是原来的 +/- 输入框——功能一点没丢。
 */

const PHASES: Phase[] = ["focus", "short", "long"];

export function PomodoroDial({
  pomodoro,
  reduced,
}: {
  pomodoro: Pomodoro;
  reduced: boolean;
}) {
  const t = useTranslations("focus.pomodoro");
  const [moreOpen, setMoreOpen] = useState(false);

  const textRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const { remaining, total, running, conf } = pomodoro;

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    const write = () => {
      const left = remaining();
      const spent = Math.min(1, Math.max(0, 1 - left / total));
      const pct = `${spent * 100}%`;

      if (fillRef.current) fillRef.current.style.width = pct;
      if (cursorRef.current) cursorRef.current.style.left = pct;
      if (textRef.current) {
        const secs = Math.ceil(left / 1000);
        textRef.current.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(
          secs % 60,
        ).padStart(2, "0")}`;
      }
    };

    write();
    if (running) {
      // 秒针级精度就够，但用 rAF 让进度线是平滑的；reduced 时退回每秒一跳
      if (reduced) {
        timer = setInterval(write, 1000);
      } else {
        const loop = () => {
          write();
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      }
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearInterval(timer);
    };
  }, [reduced, remaining, running, total]);

  return (
    <div className="flex w-full flex-col items-center gap-8 sm:gap-9">
      {/* 头一行：专注·FOCUS 标签 + 这一轮完成了几个 */}
      <div className="flex w-full items-baseline justify-between">
        <span className="text-[10px] tracking-[0.2em] text-desk-faint uppercase sm:text-[10.5px]">
          {t("eyebrow")}
        </span>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex gap-1.5">
            {Array.from({ length: conf.cycle }, (_, i) => {
              const filled = pomodoro.done % conf.cycle > i;
              /* 刚做满一轮、正在长休时全亮；长休结束进入新一轮就自然清空 */
              const full =
                pomodoro.phase === "long" &&
                pomodoro.done > 0 &&
                pomodoro.done % conf.cycle === 0;
              return (
                <span
                  key={i}
                  className="size-[5px] rounded-full transition-colors duration-500"
                  style={{ background: filled || full ? "#141414" : "#cfcfcf" }}
                  aria-hidden
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={pomodoro.clearRound}
            title={t("clearRound")}
            className="text-[11px] text-desk-faint transition-colors hover:text-desk-ink sm:text-[11.5px]"
          >
            {t("doneCount", { n: pomodoro.done })}
          </button>
        </div>
      </div>

      {/* 时间：一行大字 + 一道进度线，走到头就是这一段结束 */}
      <div className="flex flex-col items-center gap-3 sm:gap-3.5">
        <span
          ref={textRef}
          className="font-serif text-[64px] leading-none font-extralight tracking-[0.005em] text-desk-ink tabular-nums sm:text-[128px]"
        >
          --:--
        </span>
        <div className="relative h-[2px] w-full max-w-[420px] bg-desk-line-2">
          <div
            ref={fillRef}
            className="absolute top-0 left-0 h-full bg-desk-ink"
            style={{ width: "0%" }}
          />
          <div
            ref={cursorRef}
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-desk-ink"
            style={{ left: "0%" }}
          />
        </div>
      </div>

      {/* 重置 / 开始暂停 / 响铃 */}
      <div className="flex items-center gap-5 sm:gap-7">
        <button
          type="button"
          onClick={pomodoro.reset}
          className="border border-desk-line-3 px-3.5 py-2.5 text-[12px] tracking-[0.04em] text-desk-dim transition-colors hover:border-desk-ink hover:text-desk-ink sm:px-[18px] sm:text-[12.5px]"
        >
          {t("reset")}
        </button>

        <button
          type="button"
          onClick={pomodoro.toggle}
          aria-label={running ? t("pause") : t("start")}
          className="flex size-[56px] items-center justify-center rounded-full bg-desk-ink transition-opacity hover:opacity-85"
        >
          {running ? (
            <svg
              width="14"
              height="16"
              viewBox="0 0 14 16"
              fill="none"
              stroke="#eaeaea"
              strokeWidth="1.4"
              aria-hidden
            >
              <line x1="4" y1="1" x2="4" y2="15" />
              <line x1="10" y1="1" x2="10" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="#eaeaea" aria-hidden>
              <path d="M13 8 0 16V0z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={pomodoro.toggleChime}
          aria-pressed={pomodoro.chimeOn}
          className="border border-desk-line-3 px-3.5 py-2.5 text-[12px] tracking-[0.04em] text-desk-dim transition-colors hover:border-desk-ink hover:text-desk-ink sm:px-[18px] sm:text-[12.5px]"
        >
          {pomodoro.chimeOn ? t("chimeOn") : t("chimeOff")}
        </button>
      </div>

      {/* 三段预设：点标签切段，点数字改这一段的时长 */}
      <div className="flex items-stretch border border-desk-line-3">
        {PHASES.map((phase, i) => (
          <PresetChip
            key={phase}
            phase={phase}
            label={t(`phase.${phase}`)}
            active={phase === pomodoro.phase}
            value={conf[phase]}
            bordered={i > 0}
            onChoose={() => pomodoro.choose(phase)}
            onCommit={(value) => pomodoro.setConf(phase, value)}
          />
        ))}
      </div>

      <p className="max-w-[420px] text-center text-[11px] tracking-[0.02em] text-desk-mute sm:text-[11.5px]">
        {t("note")}
      </p>

      {/* 长休间隔 / 恢复默认 —— 不常用，默认收起，不占纸面 */}
      <button
        type="button"
        onClick={() => setMoreOpen((open) => !open)}
        aria-expanded={moreOpen}
        className="text-[11px] tracking-[0.08em] text-desk-mute transition-colors hover:text-desk-dim"
      >
        {moreOpen ? t("hideSettings") : t("settings")}
      </button>

      <AnimatePresence initial={false}>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.3 }}
            className="w-full overflow-hidden"
          >
            <div className="flex flex-col items-center gap-3.5 border-t border-desk-line pt-5">
              <CycleField
                label={t("cycleLabel")}
                unit={t("cycleUnit")}
                value={conf.cycle}
                onCommit={(value) => pomodoro.setConf("cycle", value)}
              />

              {!pomodoro.isDefault && (
                <button
                  type="button"
                  onClick={pomodoro.resetConf}
                  className="text-[11px] tracking-[0.1em] text-desk-mute transition-colors hover:text-desk-ink"
                >
                  {t("restoreDefault")}
                </button>
              )}

              <p className="max-w-[340px] text-center text-[10.5px] leading-[1.8] text-desk-mute">
                {t("settingsNote")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 一段预设：左边是段名（点它=切到这一段），右边是分钟数（点它=就地改这一段的时长）。
 * 两个点击目标分开写 stopPropagation，不然点数字会连带把段也切了。
 */
function PresetChip({
  phase,
  label,
  active,
  value,
  bordered,
  onChoose,
  onCommit,
}: {
  phase: Phase;
  label: string;
  active: boolean;
  value: number;
  bordered: boolean;
  onChoose: () => void;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number(raw.trim());
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onCommit(clampConf(phase, parsed));
  };

  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={active}
      className={[
        "flex items-baseline gap-2 px-[16px] py-[9px] transition-colors sm:px-[26px]",
        bordered ? "border-l border-desk-line" : "",
        active ? "bg-[#dedede]" : "hover:bg-black/[0.02]",
      ].join(" ")}
    >
      <span
        className={[
          "text-[12px] tracking-[0.06em] sm:text-[12.5px]",
          active ? "text-desk-ink" : "text-[#666666]",
        ].join(" ")}
      >
        {label}
      </span>

      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setDraft(null);
          }}
          aria-label={label}
          className="w-[2rem] border-b border-desk-mute bg-transparent text-center font-mono text-[11px] text-desk-mute tabular-nums outline-none"
        />
      ) : (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setDraft(String(value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              setDraft(String(value));
            }
          }}
          className="cursor-text font-mono text-[11px] text-desk-mute tabular-nums underline decoration-desk-mute decoration-dotted underline-offset-[3px]"
        >
          {value}
        </span>
      )}
    </button>
  );
}

/** 长休间隔的 +/- 输入框——收在「更多」里，画板没画，样式跟着纸面自己配 */
function CycleField({
  label,
  unit,
  value,
  onCommit,
}: {
  label: string;
  unit: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [min, max] = LIMITS.cycle;

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number(raw.trim());
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onCommit(clampConf("cycle", parsed));
  };

  const step = (delta: number) => onCommit(clampConf("cycle", value + delta));

  return (
    <div className="flex items-center gap-4">
      <span className="text-[12.5px] tracking-[0.06em] text-desk-dim">{label}</span>

      <div className="flex items-stretch border border-desk-line-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label={`${label} −1`}
          className="px-3 py-1.5 text-[13px] text-desk-dim transition-colors hover:bg-black/[0.03] hover:text-desk-ink disabled:pointer-events-none disabled:text-black/15"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setDraft(null);
          }}
          aria-label={label}
          className="w-[3.2rem] border-x border-desk-line-3 bg-transparent py-1.5 text-center font-mono text-[13px] text-desk-ink tabular-nums outline-none focus:bg-black/[0.04]"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label={`${label} +1`}
          className="px-3 py-1.5 text-[13px] text-desk-dim transition-colors hover:bg-black/[0.03] hover:text-desk-ink disabled:pointer-events-none disabled:text-black/15"
        >
          +
        </button>
      </div>

      <span className="text-[11px] tracking-[0.08em] text-desk-mute">{unit}</span>
    </div>
  );
}

