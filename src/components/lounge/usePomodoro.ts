"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useStoredState } from "@/lib/useStoredState";
import { siteConfig } from "~/site.config";

/**
 * 番茄钟的状态机。放在 LoungeStage 这一层，而不是番茄钟组件里 ——
 * 这样切到音乐层、时刻表层，计时照走，回来还在原处。
 *
 * ── 为什么存的是「结束时刻」而不是「还剩多少秒」 ──
 * 后台标签页里 setInterval 会被浏览器降频到最低 1 秒一次甚至更慢，电脑睡一觉更是直接停摆。
 * 只要靠「每 tick 减一秒」来倒数，一切走神就都会少算。所以这里存的是一个绝对时间戳
 * endsAt，剩余时间永远由 Date.now() 现算 —— 睡醒回来数字是对的。
 *
 * ── 为什么不每秒 setState ──
 * 每秒重渲染会带着整个放松区（呼吸圆环、背景）一起重画。这里只在**阶段结束**时
 * 更新一次状态（setTimeout 精确排到 endsAt），走针和数字由番茄钟组件自己用 ref 写 DOM。
 *
 * 状态整个序列化进 localStorage：刷新页面、关掉再回来，番茄还在走。
 */

export type Phase = "focus" | "short" | "long";

type State = {
  phase: Phase;
  /** 在跑：结束时刻的时间戳；暂停中：null */
  endsAt: number | null;
  /** 暂停中还剩多少毫秒（在跑时这个值不用看） */
  leftMs: number;
  /** 本轮已经完成的专注个数 */
  done: number;
};

const CONF = siteConfig.lounge.pomodoro;

const minutes = (phase: Phase) =>
  phase === "focus" ? CONF.focus : phase === "short" ? CONF.short : CONF.long;

export const phaseMs = (phase: Phase) => minutes(phase) * 60_000;

const fresh = (phase: Phase, done = 0): State => ({
  phase,
  endsAt: null,
  leftMs: phaseMs(phase),
  done,
});

function parse(raw: string): State {
  try {
    const value = JSON.parse(raw) as Partial<State>;
    const phase: Phase =
      value.phase === "short" || value.phase === "long" ? value.phase : "focus";
    return {
      phase,
      endsAt: typeof value.endsAt === "number" ? value.endsAt : null,
      leftMs: typeof value.leftMs === "number" ? value.leftMs : phaseMs(phase),
      done: typeof value.done === "number" ? value.done : 0,
    };
  } catch {
    return fresh("focus");
  }
}

/**
 * 两声轻响，用 WebAudio 现合成 —— 不引入音频文件，也就不用管它加载没加载、
 * 大陆快不快。开始计时那一下已经是用户手势，AudioContext 不会被浏览器拦。
 */
function chime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const base = ctx.currentTime + 0.02;
    [880, 1174.7].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = base + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.9);
    });
    setTimeout(() => void ctx.close(), 2600);
  } catch {
    // 出不了声就算了，界面上该跳的还是跳
  }
}

export function usePomodoro() {
  const [raw, setRaw] = useStoredState(
    "lounge-pomodoro",
    JSON.stringify(fresh("focus")),
  );
  const [chimeOn, setChimeOn] = useStoredState("lounge-pomodoro-chime", "1");

  const state = useMemo(() => parse(raw), [raw]);
  const save = useCallback(
    (next: State) => setRaw(JSON.stringify(next)),
    [setRaw],
  );

  /** 剩余毫秒 —— 在跑就现算，暂停就读存下来的 */
  const remaining = useCallback(
    () =>
      state.endsAt === null
        ? state.leftMs
        : Math.max(0, state.endsAt - Date.now()),
    [state],
  );

  /** 阶段走完：专注 +1，然后排下一段（短休；满一轮换长休），但**不自动开始** */
  const complete = useCallback(() => {
    if (chimeOn === "1") chime();
    if (state.phase !== "focus") {
      save(fresh("focus", state.done));
      return;
    }
    const done = state.done + 1;
    const next: Phase = done % CONF.cycle === 0 ? "long" : "short";
    save(fresh(next, done));
  }, [chimeOn, save, state.done, state.phase]);

  /** 只在结束那一刻醒一次。定时器被降频而提前醒了就重排，不会误判 */
  useEffect(() => {
    if (state.endsAt === null) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const left = state.endsAt! - Date.now();
      if (left <= 50) {
        complete();
        return;
      }
      timer = setTimeout(arm, Math.min(left, 30_000));
    };
    arm();
    return () => clearTimeout(timer);
  }, [state.endsAt, complete]);

  /** 跑着的时候把剩余时间写进标签页标题 —— 切去别的标签页也看得见 */
  useEffect(() => {
    if (state.endsAt === null) return;
    const original = document.title;
    const write = () => {
      const left = Math.max(0, state.endsAt! - Date.now());
      const total = Math.ceil(left / 1000);
      document.title = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
        total % 60,
      ).padStart(2, "0")} · ${original}`;
    };
    write();
    const timer = setInterval(write, 1000);
    return () => {
      clearInterval(timer);
      document.title = original;
    };
  }, [state.endsAt]);

  const toggle = useCallback(() => {
    if (state.endsAt === null) {
      const left = state.leftMs > 0 ? state.leftMs : phaseMs(state.phase);
      save({ ...state, endsAt: Date.now() + left, leftMs: left });
    } else {
      save({ ...state, endsAt: null, leftMs: remaining() });
    }
  }, [remaining, save, state]);

  const reset = useCallback(
    () => save(fresh(state.phase, state.done)),
    [save, state.done, state.phase],
  );

  /** 手动切阶段：切了就从头计，已完成的个数不动 */
  const choose = useCallback(
    (phase: Phase) => {
      if (phase === state.phase && state.endsAt === null) return;
      save(fresh(phase, state.done));
    },
    [save, state.done, state.endsAt, state.phase],
  );

  /** 清零这一轮 */
  const clearRound = useCallback(() => save(fresh("focus", 0)), [save]);

  return {
    phase: state.phase,
    running: state.endsAt !== null,
    done: state.done,
    cycle: CONF.cycle,
    remaining,
    total: phaseMs(state.phase),
    chimeOn: chimeOn === "1",
    toggleChime: () => setChimeOn(chimeOn === "1" ? "0" : "1"),
    toggle,
    reset,
    choose,
    clearRound,
  };
}

export type Pomodoro = ReturnType<typeof usePomodoro>;
