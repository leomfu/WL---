"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStoredState } from "@/lib/useStoredState";

/**
 * 氛围音引擎（PLAN.md §6 第 2 条）—— iframe 做不到的部分都在这里：
 * 场景切换时两个音轨交叉淡入淡出、音量单独调、把实时音量喂给呼吸圆环。
 *
 * - 懒加载：某个场景第一次被选中才创建 <audio>；
 * - 音频文件不存在（素材还没到位）时标记成 missing，页面照常跑，只是没声音；
 * - 实时音量走 WebAudio 的 AnalyserNode；建不出 AudioContext 就退回 level = 0，
 *   由调用方改用 CSS 的固定节奏呼吸；
 * - 场景和音量记在 localStorage（useStoredState，不走 effect 里 setState 那套）。
 */

const FADE_MS = 1200;
const VOLUME_KEY = "lounge-volume";
const SCENE_KEY = "lounge-scene";

type Scene = { key: string; audio: string };

type Track = {
  el: HTMLAudioElement;
  target: number;
  source?: MediaElementAudioSourceNode;
};

export function useAmbient(scenes: readonly Scene[]) {
  const [storedScene, setStoredScene] = useStoredState(SCENE_KEY, scenes[0]?.key ?? "");
  const [storedVolume, setStoredVolume] = useStoredState(VOLUME_KEY, "0.64");

  const sceneKey = scenes.some((s) => s.key === storedScene)
    ? storedScene
    : (scenes[0]?.key ?? "");
  const parsedVolume = Number(storedVolume);
  const volume =
    Number.isFinite(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1
      ? parsedVolume
      : 0.64;

  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState(0);

  const tracks = useRef(new Map<string, Track>());
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  /** 需要时才建 AudioContext（必须在用户手势之后，否则浏览器不给声） */
  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const getTrack = useCallback(
    (key: string) => {
      const existing = tracks.current.get(key);
      if (existing) return existing;

      const scene = scenes.find((s) => s.key === key);
      if (!scene?.audio) return undefined;

      const el = new Audio(scene.audio);
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      // 文件不在（404）时由这里标记，页面上给一行说明
      el.addEventListener("error", () =>
        setFailed((prev) => (prev[key] ? prev : { ...prev, [key]: true })),
      );

      const track: Track = { el, target: 0 };

      // 接进 WebAudio 才能读到实时音量；接不上就直接由 <audio> 自己出声
      const ctx = ensureContext();
      if (ctx && analyserRef.current) {
        try {
          track.source = ctx.createMediaElementSource(el);
          track.source.connect(analyserRef.current);
        } catch {
          // Safari 偶尔会拒绝，忽略，声音照出
        }
      }

      tracks.current.set(key, track);
      return track;
    },
    [ensureContext, scenes],
  );

  /** 每帧把各轨音量推向目标值（交叉淡入淡出），顺便算一次实时音量 */
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const buffer = new Uint8Array(512);

    const step = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      const delta = dt / FADE_MS;

      let audible = false;
      tracks.current.forEach((track) => {
        const diff = track.target - track.el.volume;
        if (Math.abs(diff) < 0.005) {
          track.el.volume = track.target;
          if (track.target === 0 && !track.el.paused) track.el.pause();
        } else {
          track.el.volume = Math.min(
            1,
            Math.max(0, track.el.volume + Math.sign(diff) * delta),
          );
        }
        if (!track.el.paused) audible = true;
      });

      const analyser = analyserRef.current;
      if (analyser && audible) {
        analyser.getByteTimeDomainData(buffer.subarray(0, analyser.fftSize));
        let sum = 0;
        for (let i = 0; i < analyser.fftSize; i += 1) {
          const centered = (buffer[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / analyser.fftSize);
        // 差得不够多就不 setState —— 圆环用不着 60fps 重渲染整页
        setLevel((prev) => {
          const next = prev * 0.72 + Math.min(1, rms * 3.4) * 0.28;
          return Math.abs(next - prev) < 0.01 ? prev : next;
        });
      }

      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  /** 场景 / 音量 / 播放状态一变，就重设各轨的目标音量 */
  useEffect(() => {
    const active = playing ? getTrack(sceneKey) : undefined;

    tracks.current.forEach((track, key) => {
      track.target = playing && key === sceneKey ? volume : 0;
    });

    if (active) {
      active.target = volume;
      // 已经在响的轨，音量拖动要即时跟手，不走 1.2s 的淡入曲线
      if (active.el.volume > 0) active.el.volume = volume;
      if (active.el.paused) {
        void active.el.play().catch(() => {
          // 还没有用户手势 / 文件不存在，忽略
        });
      }
      void ctxRef.current?.resume();
    }
  }, [getTrack, playing, sceneKey, volume]);

  /** 离开放松区时把声音全停掉，别让它跟着路由跑 */
  useEffect(() => {
    const opened = tracks.current;
    const ctxHolder = ctxRef;
    return () => {
      opened.forEach((track) => {
        track.el.pause();
        track.el.src = "";
      });
      opened.clear();
      // 注意读的是 cleanup 执行那一刻的 current：AudioContext 是懒建的
      void ctxHolder.current?.close();
    };
  }, []);

  const scene = scenes.find((s) => s.key === sceneKey);

  return {
    sceneKey,
    chooseScene: setStoredScene,
    volume,
    changeVolume: (next: number) => setStoredVolume(String(next)),
    playing,
    setPlaying,
    /** 当前场景没配音频、或者文件加载失败 */
    sceneMissing: !scene?.audio || Boolean(failed[sceneKey]),
    /** 0–1 的实时音量，喂给呼吸圆环；没有 analyser 时恒为 0 */
    level: playing ? level : 0,
  };
}
