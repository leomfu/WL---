"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { MiniPlayer } from "./MiniPlayer";
import { useAudioPlayer, type AudioPlayer } from "@/lib/useAudioPlayer";
import { useStoredState } from "@/lib/useStoredState";
import type { MusicLibrary, Track } from "@/lib/types";

/**
 * 全站唯一的播放器。
 *
 * **为什么挂在 `app/[locale]/layout.tsx`**：那是 `(site)` 和 `focus` 的共同祖先，
 * 客户端跳页时这一层不会卸载。<audio> 要是留在唱片页里，一离开页面组件就被卸掉，
 * 音乐当场断掉 —— 用户要的正是「走开了还接着放」。
 *
 * 这一层只管状态：曲库、换碟、播放内核（lib/useAudioPlayer）。
 * 界面有两副：唱片页那台大唱机（components/records/Turntable）和
 * 右下角的迷你卡片（MiniPlayer，就在这儿一起渲染）。
 */

/**
 * 当前装在唱机上的是哪张碟：一个场景组的 key（见 content/music/chart.json），
 * 或者 "resident"（自托管的常驻古典乐）。
 */
export type Group = string;

/** 常驻那张碟的 key。场景组的 key 都来自数据，不会撞上它 */
export const RESIDENT: Group = "resident";

type PlayerValue = AudioPlayer & {
  library: MusicLibrary;
  /** 当前这张碟 */
  group: Group;
  switchGroup: (next: Group) => void;
  /**
   * 换碟并直接播第 n 首 —— 榜单点一行走这个。
   * 换组和选曲是同一次状态更新，所以不会先播上一组的第 n 首再纠正。
   */
  playAt: (group: Group, index: number) => void;
  /** 当前碟上的曲目 */
  tracks: Track[];
};

const PlayerContext = createContext<PlayerValue | null>(null);

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer 必须在 PlayerProvider 里用");
  return value;
}

export function PlayerProvider({
  library,
  children,
}: {
  library: MusicLibrary;
  children: ReactNode;
}) {
  const { scenes } = library;
  const firstScene = scenes[0]?.key;
  const [stored, setGroup] = useStoredState(
    "records-group",
    firstScene ?? RESIDENT,
  );

  /**
   * 存下来的值可能已经作废（比如上一版存的 "netease"，或者站主删掉了某个场景），
   * 所以每次都拿数据校一遍，认不出来就退回第一组。
   */
  const known = stored === RESIDENT || scenes.some((s) => s.key === stored);
  const group: Group = known ? stored : (firstScene ?? RESIDENT);
  const tracks: Track[] =
    group === RESIDENT
      ? library.resident
      : (scenes.find((s) => s.key === group)?.tracks ?? []);

  const player = useAudioPlayer({
    tracks,
    volumeKey: "records-volume",
    // 一整组都放不出来（Apple 的预览域名哪天连不上）→ 换上常驻那张碟，唱机不会哑
    onExhausted: () => {
      if (group === RESIDENT || library.resident.length === 0) return false;
      setGroup(RESIDENT);
      return true;
    },
  });

  const { reset, jump, play } = player;
  const value = useMemo<PlayerValue>(
    () => ({
      ...player,
      library,
      group,
      tracks,
      switchGroup: (next: Group) => {
        if (next === group) return;
        setGroup(next);
        reset();
      },
      playAt: (next: Group, index: number) => {
        if (next !== group) setGroup(next);
        // jump 不取模：换组的那一瞬间两组长度不一样，取模会跳错位
        jump(index);
        play();
      },
    }),
    [player, library, group, tracks, setGroup, reset, jump, play],
  );

  return (
    <PlayerContext.Provider value={value}>
      {/* 全站唯一的那个 <audio>。跳页时这一层不重挂，所以声音不断 */}
      <audio {...player.audioProps} />
      {children}
      <MiniPlayer />
    </PlayerContext.Provider>
  );
}
