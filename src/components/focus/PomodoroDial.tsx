"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { C, Hub, RING_R, TickMarks, handPoints } from "./dial";
import { LIMITS, clampConf } from "./usePomodoro";
import type { Conf, Phase, Pomodoro } from "./usePomodoro";

/**
 * 番茄钟 —— 和音乐层同一张钟面，只是指针走的是**这一段时间**：
 * 转满一圈 = 这一段走完（专注一圈，短休也是一圈，不管各自设了多少分钟）。
 *
 * 弧线画的是**还剩多少**，不是已经走了多少：倒数看剩余才顺眼，
 * 满圈开始、一点点收回去，收干净就是结束。这和音乐层（弧线是已播进度）正好相反，
 * 是故意的 —— 一个在积累，一个在消耗。
 *
 * 走针和数字都是逐帧用 ref 写 DOM，不走 React 重渲染：这一层要在屏幕上待几十分钟，
 * 每秒重画一次整个放松区（背景动画）没有必要。
 * 状态（在跑没跑、剩多少、时长设成了几分钟）在 usePomodoro 里，切到别的层也照走。
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handRef = useRef<SVGGElement | null>(null);
  const arcRef = useRef<SVGCircleElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  const { remaining, total, running, conf } = pomodoro;

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    const write = () => {
      const left = remaining();
      const spent = Math.min(1, Math.max(0, 1 - left / total));

      handRef.current?.setAttribute(
        "transform",
        `rotate(${spent * 360} ${C} ${C})`,
      );
      // 剩余弧：从满圈收到零
      arcRef.current?.setAttribute("stroke-dasharray", `${1 - spent} 1`);
      if (textRef.current) {
        const secs = Math.ceil(left / 1000);
        textRef.current.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(
          secs % 60,
        ).padStart(2, "0")}`;
      }
    };

    write();
    if (running) {
      // 秒针级精度就够，但用 rAF 让指针是平滑的；reduced 时退回每秒一跳
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
    <div className="flex w-full flex-col items-center gap-7">
      <div
        className="relative"
        style={{
          width: "clamp(240px, 46vmin, 372px)",
          height: "clamp(240px, 46vmin, 372px)",
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
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
          <TickMarks />

          {/* 剩余弧。pathLength=1 之后 dasharray 直接就是比例 */}
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
            strokeDasharray="1 1"
            transform={`rotate(-90 ${C} ${C})`}
            vectorEffect="non-scaling-stroke"
          />

          <g ref={handRef} transform={`rotate(0 ${C} ${C})`}>
            <polygon
              points={handPoints(RING_R - 4)}
              fill="#EDEDED"
              opacity={0.92}
            />
          </g>
          <Hub />
        </svg>

        {/* 盘心的读数 */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span
            ref={textRef}
            className="font-mono text-[34px] leading-none tracking-[0.06em] text-shell-ink tabular-nums sm:text-[40px]"
          >
            --:--
          </span>
          <span className="text-[10px] tracking-[0.26em] text-shell-faint uppercase">
            {t(`phase.${pomodoro.phase}`)}
          </span>
        </div>
      </div>

      {/* 这一轮完成了几个专注 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
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
                className={[
                  "size-[6px] rounded-full transition-colors duration-500",
                  filled || full ? "bg-shell-ink" : "bg-white/[0.18]",
                ].join(" ")}
                aria-hidden
              />
            );
          })}
        </div>
        <button
          type="button"
          onClick={pomodoro.clearRound}
          title={t("clearRound")}
          className="text-[11px] tracking-[0.1em] text-shell-faint transition-colors hover:text-shell-dim"
        >
          {t("doneCount", { n: pomodoro.done })}
        </button>
      </div>

      {/* 重置 / 开始暂停 / 响铃 */}
      <div className="flex items-center gap-7">
        <button
          type="button"
          onClick={pomodoro.reset}
          className="text-[12.5px] tracking-[0.08em] text-shell-faint transition-colors hover:text-shell-ink"
        >
          {t("reset")}
        </button>

        <button
          type="button"
          onClick={pomodoro.toggle}
          aria-label={running ? t("pause") : t("start")}
          className="flex size-[52px] items-center justify-center rounded-full border border-white/25 transition-colors hover:border-white/50"
        >
          {running ? (
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
          onClick={pomodoro.toggleChime}
          aria-pressed={pomodoro.chimeOn}
          className="text-[12.5px] tracking-[0.08em] text-shell-faint transition-colors hover:text-shell-ink"
        >
          {pomodoro.chimeOn ? t("chimeOn") : t("chimeOff")}
        </button>
      </div>

      {/* 三段 + 设置。分钟数直接印在按钮上，改了设置这里跟着变 */}
      <div className="flex flex-col items-center gap-3.5">
        <div className="flex items-stretch border border-white/12">
          {PHASES.map((phase, i) => {
            const on = phase === pomodoro.phase;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => pomodoro.choose(phase)}
                aria-pressed={on}
                className={[
                  "px-4 py-2.5 text-[13px] tracking-[0.06em] transition-colors sm:px-[22px]",
                  i > 0 ? "border-l border-white/12" : "",
                  on
                    ? "bg-white/[0.07] text-shell-ink"
                    : "text-shell-dim hover:bg-white/[0.03] hover:text-shell-ink",
                ].join(" ")}
              >
                {t(`phase.${phase}`)}
                <span className="ml-2 text-[11px] text-shell-faint tabular-nums">
                  {conf[phase]}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          className="text-[12px] tracking-[0.1em] text-shell-faint transition-colors hover:text-shell-ink"
        >
          {settingsOpen ? t("hideSettings") : t("settings")}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col items-center gap-3.5 border-t border-shell-line-2 pt-6">
              {(["focus", "short", "long"] as const).map((field) => (
                <NumberField
                  key={field}
                  label={t(`phase.${field}`)}
                  unit={t("minutes")}
                  value={conf[field]}
                  field={field}
                  onCommit={(v) => pomodoro.setConf(field, v)}
                />
              ))}
              <NumberField
                label={t("cycleLabel")}
                unit={t("cycleUnit")}
                value={conf.cycle}
                field="cycle"
                onCommit={(v) => pomodoro.setConf("cycle", v)}
              />

              {!pomodoro.isDefault && (
                <button
                  type="button"
                  onClick={pomodoro.resetConf}
                  className="mt-1 text-[11.5px] tracking-[0.1em] text-shell-faint transition-colors hover:text-shell-ink"
                >
                  {t("restoreDefault")}
                </button>
              )}

              <p className="mt-1 max-w-[340px] text-center text-[11px] leading-[1.9] text-shell-faint">
                {t("settingsNote")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="max-w-[420px] text-center text-[11px] leading-[1.9] tracking-[0.04em] text-shell-faint">
        {t("note")}
      </p>
    </div>
  );
}

/**
 * 一行「标签 − 数字 + 单位」。数字本身能直接打字改（要改成 50 分钟，
 * 点 25 下加号太蠢），所以输入过程中先存草稿字符串，失焦或回车时才夹到范围内提交 ——
 * 否则你刚打下 "5" 就被夹成合法值，第二个 "0" 永远打不进去。
 */
function NumberField({
  label,
  unit,
  value,
  field,
  onCommit,
}: {
  label: string;
  unit: string;
  value: number;
  field: keyof Conf;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [min, max] = LIMITS[field];

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number(raw.trim());
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onCommit(clampConf(field, parsed));
  };

  const step = (delta: number) => onCommit(clampConf(field, value + delta));

  return (
    <div className="flex items-center gap-4">
      <span className="w-[4.5rem] text-right text-[12.5px] tracking-[0.06em] text-shell-dim">
        {label}
      </span>

      <div className="flex items-stretch border border-white/12">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label={`${label} −1`}
          className="px-3 py-1.5 text-[13px] text-shell-dim transition-colors hover:bg-white/[0.03] hover:text-shell-ink disabled:pointer-events-none disabled:text-white/15"
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
          className="w-[3.2rem] border-x border-white/12 bg-transparent py-1.5 text-center font-mono text-[13px] text-shell-ink tabular-nums outline-none focus:bg-white/[0.05]"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label={`${label} +1`}
          className="px-3 py-1.5 text-[13px] text-shell-dim transition-colors hover:bg-white/[0.03] hover:text-shell-ink disabled:pointer-events-none disabled:text-white/15"
        >
          +
        </button>
      </div>

      <span className="w-[3.4rem] text-[11px] tracking-[0.08em] text-shell-faint">
        {unit}
      </span>
    </div>
  );
}
