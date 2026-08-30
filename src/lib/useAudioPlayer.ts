"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStoredState } from "./useStoredState";
import type { Track } from "./types";

/**
 * 站内音频播放的公共内核 —— 放松区的时间盘（components/lounge/MusicDial）和
 * 唱片页的黑胶唱机（components/records/Turntable）共用这一份。
 *
 * 抽出来的原因很实际：两处都要「换歌 / 播放意图 / 音量 / 外链失效就跳下一首」这套逻辑，
 * 复制两份迟早会走散。**外观不共用**，两边的界面语言完全不同（一张钟面 vs 一张唱片），
 * 共用的只是这里的状态机。
 *
 * 几个刻意的设计（沿用 MusicDial 原来的写法，别改回去）：
 * - 存的是**播放意图**而不是「在不在响」：auto 表示还没手动干预过，play/pause 是手动按过。
 *   真正在不在响由 <audio> 的事件回填到 live —— 这样就不用在 effect 里 setState，
 *   React 19 的 react-hooks/set-state-in-effect 不允许那么写。
 * - 没接 AnalyserNode：一旦把 <audio> 接进 WebAudio 图，跨域且没有 CORS 的音源
 *   （网易云直链）会被静音。
 */

/**
 * 同一个文档里只允许一路音频出声。
 * 每个播放器挂载时把自己的「停」注册进来，谁开始播就先把别人按停。
 * （跨标签页不管 —— 那是浏览器和用户自己的事。）
 */
const PLAYERS = new Set<() => void>();

export type AudioPlayerOptions = {
  /** 当前这一组曲目 */
  tracks: Track[];
  /** 这个播放器现在是不是可见/可用的（放松区切走了就该停） */
  active: boolean;
  /** 用户已经过了浏览器的出声门槛，挂载即接着放 */
  autoStart?: boolean;
  /** 音量存哪个 localStorage 键。两处各存各的 */
  volumeKey: string;
  defaultVolume?: number;
  /**
   * 这一组曲目全都放不出来了。
   * 返回 true 表示调用方已经处理（比如退回常驻曲库），返回 false 就停下来。
   */
  onExhausted?: () => boolean;
};

export function useAudioPlayer({
  tracks,
  active,
  autoStart = false,
  volumeKey,
  defaultVolume = 0.7,
  onExhausted,
}: AudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const [intent, setIntent] = useState<"auto" | "play" | "pause">("auto");
  const [live, setLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  /** 运行时真的放不出来的曲目（外链失效 / 网络不通），标灰并跳过 */
  const [broken, setBroken] = useState<Record<string, true>>({});

  const [volumeText, setVolumeText] = useStoredState(
    volumeKey,
    String(defaultVolume),
  );
  const volume = Number(volumeText) || defaultVolume;

  const shouldPlay =
    active && (intent === "play" || (intent === "auto" && autoStart));
  const track: Track | undefined = tracks[Math.min(index, tracks.length - 1)];
  /** 元数据还没到时先用清单里的时长，指针/唱针不至于卡在起点 */
  const total = duration || track?.duration || 0;

  /** 别的播放器开始出声时把自己按停 */
  const selfStop = useRef<() => void>(() => {});
  useEffect(() => {
    const stop = () => setIntent("pause");
    selfStop.current = stop;
    PLAYERS.add(stop);
    return () => {
      PLAYERS.delete(stop);
    };
  }, []);

  useEffect(() => {
    if (!shouldPlay) return;
    PLAYERS.forEach((stop) => {
      if (stop !== selfStop.current) stop();
    });
  }, [shouldPlay]);

  const goto = useCallback(
    (next: number) => {
      if (tracks.length === 0) return;
      setIndex(((next % tracks.length) + tracks.length) % tracks.length);
      setElapsed(0);
      setDuration(0);
    },
    [tracks.length],
  );

  /** 换一组曲目时从头开始 */
  const reset = useCallback(() => {
    setIndex(0);
    setElapsed(0);
    setDuration(0);
  }, []);

  const toggle = useCallback(() => {
    setIntent(shouldPlay ? "pause" : "play");
  }, [shouldPlay]);

  const play = useCallback(() => setIntent("play"), []);
  const pause = useCallback(() => setIntent("pause"), []);

  /** 跳到 0–1 之间的某个进度 */
  const seek = useCallback(
    (fraction: number) => {
      const el = audioRef.current;
      if (!el || !total) return;
      el.currentTime = Math.max(0, Math.min(1, fraction)) * total;
      setElapsed(el.currentTime);
    },
    [total],
  );

  /** 相对当前位置快进/快退若干秒 */
  const nudge = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    const max = el.duration || el.currentTime;
    el.currentTime = Math.max(0, Math.min(el.currentTime + seconds, max));
    setElapsed(el.currentTime);
  }, []);

  const setVolume = useCallback(
    (next: number) => setVolumeText(String(Math.max(0, Math.min(1, next)))),
    [setVolumeText],
  );

  /** 换歌：装新的 src */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    el.src = track.src;
    el.load();
  }, [track]);

  /** 该不该响：切走、按了暂停、或者根本没开始过，都要停 */
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
    if (el) el.volume = volume;
  }, [volume]);

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

  /** 直接摊到 <audio> 上 */
  const audioProps = {
    ref: audioRef,
    preload: "metadata" as const,
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setDuration(e.currentTarget.duration || 0),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setElapsed(e.currentTarget.currentTime),
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
    /** <audio> 真的在响 */
    live,
    elapsed,
    duration,
    total,
    broken,
    volume,
    setVolume,
    goto,
    reset,
    toggle,
    play,
    pause,
    seek,
    nudge,
  };
}

/**
 * 逐帧把播放进度画出去（指针角度、唱针位置这类）——
 * 不走 setState，省掉每帧重渲染。reduced-motion 下退成每秒一次。
 */
export function useProgressPainter(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  fallbackDuration: number,
  reduced: boolean,
  paint: (fraction: number, currentTime: number) => void,
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

    let raf = 0;
    const tick = () => {
      const dur = el.duration || fallbackDuration || 0;
      const fraction = dur > 0 ? Math.min(1, el.currentTime / dur) : 0;
      paintRef.current(fraction, el.currentTime);
    };

    if (reduced) {
      tick();
      const timer = window.setInterval(tick, 1000);
      return () => window.clearInterval(timer);
    }

    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [audioRef, fallbackDuration, reduced]);
}
