"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * ── 2026-08-30 的改动 ──
 * ① 专注区（原放松区）的音乐层撤了，所以原来为它准备的 `active`（切走就停）、
 *    `autoStart`（挂载即接着放）和「同文档互斥」那套注册表全部删掉：
 *    一个文档里现在只可能有一个播放器，没有谁需要把谁按停。
 * ② **试听窗口那一整套退休了**。它是给网易云「整首直链」设计的：seek 到 30% 起播、
 *    到点淡出、再自己换下一首。音源换成 Apple 官方预览之后，`src` **本身就是一个
 *    独立的 30 秒文件** —— 再叠一层窗口就成了「在 30 秒文件里再截 30 秒」的荒唐事。
 *    现在留下的只有听感上的润色：起播淡入 + 片段收尾那一下淡出。
 *    进度条的分母也随之改成 <audio> 的真实 duration，不再是清单上「整首歌」的长度。
 *
 * 几个刻意的设计（别改回去）：
 * - 存的是**播放意图**而不是「在不在响」：auto 表示还没碰过，play/pause 是手动按过。
 *   真正在不在响由 <audio> 的事件回填到 live —— 这样就不用在 effect 里 setState，
 *   React 19 的 react-hooks/set-state-in-effect 不允许那么写。
 * - 没接 AnalyserNode / GainNode：一旦把 <audio> 接进 WebAudio 图，跨域且没有 CORS
 *   的音源（Apple 的预览直链就是）会被静音。所以淡入淡出是直接改 el.volume。
 */

/* ------------------------------------------------------------ 音量包络 */

/** 起播 / 换歌时的淡入（秒），盖掉切换瞬间的爆音 */
const START_FADE = 0.35;
/** 30 秒片段收尾前多久开始淡出（秒）。只对片段生效，完整曲目不动它的结尾 */
const TAIL_FADE = 0.9;
/** 元数据还没到时，片段的名义时长（秒）—— Apple 的预览都是 30 秒 */
const CLIP_SECONDS = 30;

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
  /** 播放头在**当前这个音频文件**里的位置（秒） */
  const [position, setPosition] = useState(0);
  /** <audio> 报回来的真实时长。片段就是 30 左右，常驻曲目才是整首 */
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
  const isClip = Boolean(track?.clip);

  /**
   * 进度条的分母 = **这个音频文件**有多长。
   * 元数据还没到的时候：片段先按 30 秒画，完整曲目先用清单上的时长 ——
   * 唱针不至于卡在起点。**片段绝不能拿 track.duration 当分母**，
   * 那是整首歌的长度（三四分钟），30 秒的文件配上它进度条一动不动。
   */
  const total = duration || (isClip ? CLIP_SECONDS : track?.duration || 0);
  const elapsed = Math.max(0, Math.min(position, total || position));

  const goto = useCallback(
    (next: number) => {
      if (tracks.length === 0) return;
      setIndex(((next % tracks.length) + tracks.length) % tracks.length);
      setPosition(0);
      setDuration(0);
    },
    [tracks.length],
  );

  /**
   * 直接跳到第 n 首（不取模）—— 榜单点行用这个。
   * `goto` 会拿**当前这一组**的长度取模，而点榜单往往同时在换组，
   * 那一瞬间两边长度不一样，取模会跳错位。
   */
  const jump = useCallback((next: number) => {
    setIndex(Math.max(0, next));
    setPosition(0);
    setDuration(0);
  }, []);

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

  /** 跳到 0–1 的某个位置 */
  const seek = useCallback(
    (fraction: number) => {
      const el = audioRef.current;
      if (!el || !total) return;
      const next = clamp01(fraction) * total;
      el.currentTime = next;
      setPosition(next);
    },
    [total],
  );

  /** 相对当前位置快进/快退若干秒 */
  const nudge = useCallback(
    (seconds: number) => {
      const el = audioRef.current;
      if (!el) return;
      const max = total || el.duration || 0;
      const next = Math.max(0, Math.min(el.currentTime + seconds, max));
      el.currentTime = next;
      setPosition(next);
    },
    [total],
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
   * 音量包络 —— 播放期间逐帧跑的一个小循环，只管听感：
   *   ① 起播 / 换歌淡入，盖掉切换瞬间的爆音；
   *   ② 片段快放完时淡出最后 0.9 秒，收尾不那么硬。
   *
   * **没有「到点换下一首」了** —— 片段本身就是一个 30 秒的文件，放完 <audio> 自己
   * 触发 ended，走 onEnded 换下一首。用 rAF 而不是 timeupdate：后者约 250ms 才来
   * 一次，拿它做淡出会一格一格地掉。
   */
  const trackId = track?.id;
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !shouldPlay) return;

    const startedAt = performance.now();
    let raf = 0;

    const loop = () => {
      const since = (performance.now() - startedAt) / 1000;
      let gain = Math.min(1, since / START_FADE);

      // 片段收尾淡出。完整曲目不动它的结尾 —— 那是作品本来的样子
      const span = el.duration;
      if (isClip && Number.isFinite(span) && span > 0) {
        gain = Math.min(gain, (span - el.currentTime) / TAIL_FADE);
      }

      el.volume = volume * clamp01(gain);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // 暂停/换歌时把音量还原，下次起播不会从淡出剩下的那一点点接着放
      el.volume = volume;
    };
  }, [shouldPlay, volume, isClip, trackId]);

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
   * 元数据到了：记下真实时长，进度条的分母从名义值换成真值。
   * **不再 seek** —— 片段就是一整个文件，从 0 秒放到底就对了。
   */
  const handleLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const real = e.currentTarget.duration || 0;
      if (Number.isFinite(real)) setDuration(real);
    },
    [],
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
    /** 这个音频文件已经放了多少秒 */
    elapsed,
    /** 这个音频文件有多长（片段约 30，常驻曲目是整首） */
    total,
    /** 这首放的是不是 30 秒官方片段 */
    isClip,
    broken,
    volume,
    setVolume,
    goto,
    jump,
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
 * `total` 是这个音频文件的长度（片段约 30 秒，常驻曲目是整首）；
 * 传 0 就退回读 <audio> 自己的 duration。
 */
export function useProgressPainter(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  total: number,
  reduced: boolean,
  paint: (fraction: number, elapsed: number) => void,
) {
  // 渲染期间写 ref 会撞 React 19 的 react-hooks/refs，所以放进 effect 里更新。
  // 好处是 paint 换了不会重启 rAF 循环。
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  }, [paint]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const tick = () => {
      const span = total || el.duration || 0;
      const done = Math.max(0, el.currentTime);
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
  }, [audioRef, total, reduced]);
}
