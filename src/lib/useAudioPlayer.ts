"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStoredState } from "./useStoredState";
import type { Track } from "./types";

/**
 * 站内音频播放的内核。
 *
 * **全站只有一份**：挂在 `app/[locale]/layout.tsx` 里的 PlayerProvider 上，
 * 唱片页的黑胶唱机和右下角的迷你卡片都只是它的两副面孔。
 * 音频元素挂在这一层的原因很实际 —— 客户端跳页会卸载页面组件，
 * <audio> 跟着页面走的话，一离开唱片页音乐就断了。
 *
 * ── 2026-08-30 的两处改动 ──
 * ① 专注区（原放松区）的音乐层撤了，所以原来为它准备的 `active`（切走就停）、
 *    `autoStart`（挂载即接着放）和「同文档互斥」那套注册表全部删掉：
 *    一个文档里现在只可能有一个播放器，没有谁需要把谁按停。
 * ② 网易云那组只放 30 秒（见下面的「试听窗口」）。
 *
 * 几个刻意的设计（别改回去）：
 * - 存的是**播放意图**而不是「在不在响」：auto 表示还没碰过，play/pause 是手动按过。
 *   真正在不在响由 <audio> 的事件回填到 live —— 这样就不用在 effect 里 setState，
 *   React 19 的 react-hooks/set-state-in-effect 不允许那么写。
 * - 没接 AnalyserNode：一旦把 <audio> 接进 WebAudio 图，跨域且没有 CORS 的音源
 *   （网易云直链）会被静音。所以淡入淡出是直接改 el.volume，不走增益节点。
 */

/* ------------------------------------------------------------ 试听窗口 */

/** 淡入多久（秒）。从歌中间切进去，硬起会「啪」一声 */
const FADE_IN = 0.45;
/** 试听结束前多久开始淡出（秒）。用户要的「丝滑」就是这一条 */
const FADE_OUT = 1.5;
/** 换歌 / 起播时额外的一小段淡入（秒），盖掉切换瞬间的爆音 */
const START_FADE = 0.3;

export type AudioPlayerOptions = {
  /** 当前这一组曲目 */
  tracks: Track[];
  /** 音量存哪个 localStorage 键 */
  volumeKey: string;
  defaultVolume?: number;
  /**
   * 这一组曲目全都放不出来了。
   * 返回 true 表示调用方已经处理（比如退回常驻曲库），返回 false 就停下来。
   */
  onExhausted?: () => boolean;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function useAudioPlayer({
  tracks,
  volumeKey,
  defaultVolume = 0.7,
  onExhausted,
}: AudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const [intent, setIntent] = useState<"auto" | "play" | "pause">("auto");
  const [live, setLive] = useState(false);
  /** 整首歌里的位置（秒），不是窗口里的位置 */
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  /** 运行时真的放不出来的曲目（外链失效 / 网络不通），标灰并跳过 */
  const [broken, setBroken] = useState<Record<string, true>>({});

  const [volumeText, setVolumeText] = useStoredState(
    volumeKey,
    String(defaultVolume),
  );
  const volume = Number(volumeText) || defaultVolume;

  const shouldPlay = intent === "play";
  /** 用户碰过播放器（在放，或者放过之后按了暂停）—— 迷你卡片看这个决定露不露面 */
  const touched = intent !== "auto";
  const track: Track | undefined = tracks[Math.min(index, tracks.length - 1)];

  /** 元数据还没到时先用清单里的时长，唱针不至于卡在起点 */
  const fullDuration = duration || track?.duration || 0;

  /**
   * 这首歌能听的那一段 —— 试听曲目是 [start, start+30]，其余是整首。
   * start 会被夹进真实时长里：清单上的时长和实际流对不上时（网易云给的是元数据），
   * 起点别掉到歌尾之外。
   */
  const window_ = useMemo(() => {
    const preview = track?.preview;
    if (!preview) return { start: 0, length: fullDuration, preview: false };
    const length = fullDuration
      ? Math.min(preview.length, fullDuration)
      : preview.length;
    const start = fullDuration
      ? Math.max(0, Math.min(preview.start, fullDuration - length))
      : preview.start;
    return { start, length, preview: true };
  }, [track, fullDuration]);

  /** 对外的进度都是**窗口里的**：进度条表达的是这 30 秒，不是整首歌 */
  const total = window_.length;
  const elapsed = window_.preview
    ? Math.max(0, Math.min(position - window_.start, total))
    : position;

  const goto = useCallback(
    (next: number) => {
      if (tracks.length === 0) return;
      setIndex(((next % tracks.length) + tracks.length) % tracks.length);
      setPosition(0);
      setDuration(0);
    },
    [tracks.length],
  );

  /** 换一组曲目时从头开始 */
  const reset = useCallback(() => {
    setIndex(0);
    setPosition(0);
    setDuration(0);
  }, []);

  const toggle = useCallback(() => {
    setIntent((prev) => (prev === "play" ? "pause" : "play"));
  }, []);

  const play = useCallback(() => setIntent("play"), []);
  const pause = useCallback(() => setIntent("pause"), []);

  /** 彻底停：关掉迷你卡片就是这个 —— 唱针抬回托架，回到第一首，卡片消失 */
  const stop = useCallback(() => {
    setIntent("auto");
    setIndex(0);
    setPosition(0);
    setDuration(0);
  }, []);

  /** 跳到窗口里 0–1 的某个位置 */
  const seek = useCallback(
    (fraction: number) => {
      const el = audioRef.current;
      if (!el || !total) return;
      const next = window_.start + clamp01(fraction) * total;
      el.currentTime = next;
      setPosition(next);
    },
    [total, window_.start],
  );

  /** 相对当前位置快进/快退若干秒（不会走出窗口） */
  const nudge = useCallback(
    (seconds: number) => {
      const el = audioRef.current;
      if (!el) return;
      const max = window_.start + (total || el.duration || 0);
      const next = Math.max(
        window_.start,
        Math.min(el.currentTime + seconds, max),
      );
      el.currentTime = next;
      setPosition(next);
    },
    [total, window_.start],
  );

  const setVolume = useCallback(
    (next: number) => setVolumeText(String(clamp01(next))),
    [setVolumeText],
  );

  /** 换歌：装新的 src */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    el.src = track.src;
    el.load();
  }, [track]);

  /** 该不该响 */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (shouldPlay) {
      // 放不出来时 play() 会 reject；此时 onError / onPause 会把状态回填，这里不用管
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [shouldPlay, track]);

  useEffect(() => {
    const el = audioRef.current;
    if (el && !shouldPlay) el.volume = volume;
  }, [volume, shouldPlay]);

  /**
   * 音量包络 + 试听到点 —— 播放期间逐帧跑的一个小循环。
   *
   * 干两件事：
   *   ① 淡入淡出。试听是从歌中间切进去的，硬起硬停都会「啪」一声；
   *      最后 1.5 秒把音量拉到 0，听感上是「这段放完了」而不是「网页坏了」。
   *   ② 到 30 秒就换下一首（自然衔接，像在翻歌单试听）。
   * 用 rAF 而不是 timeupdate：timeupdate 大约每 250ms 才来一次，拿它做淡出会一格一格地掉。
   */
  const advance = useRef<() => void>(() => {});
  useEffect(() => {
    advance.current = () => goto(index + 1);
  }, [goto, index]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !shouldPlay) return;

    const { start, length, preview } = window_;
    const startedAt = performance.now();
    let raf = 0;
    let done = false;
    /**
     * 试听窗口的实际起点。正常情况就是 start；
     * 万一那一跳没跳成（音源不支持 Range 请求），三秒后就地改成「从现在算 30 秒」，
     * 免得播放头永远够不着窗口、既不出声也不往下走。
     */
    let anchor = start;

    const loop = () => {
      const since = (performance.now() - startedAt) / 1000;
      let gain = Math.min(1, since / START_FADE);

      if (preview) {
        let pos = el.currentTime - anchor;
        if (pos < 0) {
          if (since < 3) {
            // 跳还在路上：这几百毫秒先静音，别把前奏漏出来
            el.volume = 0;
            raf = requestAnimationFrame(loop);
            return;
          }
          anchor = el.currentTime;
          pos = 0;
        }
        if (pos >= length) {
          done = true;
          el.volume = 0;
          advance.current();
          return;
        }
        gain = Math.min(gain, pos / FADE_IN, (length - pos) / FADE_OUT);
      }

      el.volume = volume * clamp01(gain);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // 暂停/换歌时把音量还原，下次起播不会从淡出剩下的那一点点接着放
      if (!done) el.volume = volume;
    };
  }, [shouldPlay, volume, window_]);

  /** 放不出来：标记这首，跳下一首；整组都挂了就交给调用方兜底 */
  const handleError = useCallback(() => {
    if (!track) return;
    const next = { ...broken, [track.id]: true as const };
    setBroken(next);
    const alive = tracks.filter((item) => !next[item.id]);
    if (alive.length === 0) {
      if (!onExhausted?.()) setIntent("pause");
      return;
    }
    goto(index + 1);
  }, [broken, goto, index, onExhausted, track, tracks]);

  /**
   * 元数据到了：记下真实时长，并把播放头挪到试听窗口的起点。
   * 网易云的直链支持 Range 请求，所以这一跳是真跳，不用先下完前面那段。
   */
  const handleLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const el = e.currentTarget;
      const real = el.duration || 0;
      setDuration(real);

      const preview = track?.preview;
      if (!preview) return;
      const length = real ? Math.min(preview.length, real) : preview.length;
      const start = real
        ? Math.max(0, Math.min(preview.start, real - length))
        : preview.start;
      if (el.currentTime < start - 0.05) {
        el.currentTime = start;
        setPosition(start);
      }
    },
    [track],
  );

  /** 直接摊到 <audio> 上 */
  const audioProps = {
    ref: audioRef,
    preload: "metadata" as const,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setPosition(e.currentTarget.currentTime),
    onEnded: () => goto(index + 1),
    onError: handleError,
    onPlay: () => setLive(true),
    onPause: () => setLive(false),
  };

  return {
    audioRef,
    audioProps,
    index,
    track,
    /** 播放意图（界面上的播放/暂停图标看它，按下就变，不用等音频真的响） */
    shouldPlay,
    /** 用户碰过播放器 —— 迷你卡片露不露面看这个 */
    touched,
    /** <audio> 真的在响 */
    live,
    /** 窗口里已经放了多少秒 */
    elapsed,
    /** 窗口有多长（试听是 30，完整播放就是整首） */
    total,
    /** 这首是不是只放一段 */
    isPreview: window_.preview,
    /** 窗口在整首歌里的起点（秒） */
    windowStart: window_.start,
    broken,
    volume,
    setVolume,
    goto,
    reset,
    toggle,
    play,
    pause,
    stop,
    seek,
    nudge,
  };
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;

/**
 * 逐帧把播放进度画出去（唱针位置、迷你卡片的进度条这类）——
 * 不走 setState，省掉每帧重渲染。reduced-motion 下退成每秒一次。
 *
 * 画的是**窗口里的**进度：试听那 30 秒走完就是满格。
 */
export function useProgressPainter(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  window_: { start: number; length: number },
  reduced: boolean,
  paint: (fraction: number, elapsed: number) => void,
) {
  // 渲染期间写 ref 会撞 React 19 的 react-hooks/refs，所以放进 effect 里更新。
  // 好处是 paint 换了不会重启 rAF 循环。
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  }, [paint]);

  const { start, length } = window_;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const tick = () => {
      const span = length || el.duration || 0;
      const done = Math.max(0, el.currentTime - start);
      paintRef.current(span > 0 ? Math.min(1, done / span) : 0, done);
    };

    if (reduced) {
      tick();
      const timer = globalThis.setInterval(tick, 1000);
      return () => globalThis.clearInterval(timer);
    }

    let raf = 0;
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [audioRef, start, length, reduced]);
}
