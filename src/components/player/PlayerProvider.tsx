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

export type Group = "netease" | "resident";

type PlayerValue = AudioPlayer & {
  library: MusicLibrary;
  /** 当前这张碟 */
  group: Group;
  switchGroup: (next: Group) => void;
  /** 当前碟上的曲目 */
  tracks: Track[];
  hasNetease: boolean;
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
  const hasNetease = library.netease.length > 0;
  const [stored, setGroup] = useStoredState(
    "records-group",
    hasNetease ? "netease" : "resident",
  );
  const group: Group =
    stored === "resident" || !hasNetease ? "resident" : "netease";
  const tracks = group === "resident" ? library.resident : library.netease;

  const player = useAudioPlayer({
    tracks,
    volumeKey: "records-volume",
    // 「我在听」那一叠全放不出来（网易云直链哪天被封）→ 换上常驻那张碟，唱机不会哑
    onExhausted: () => {
      if (group !== "netease" || library.resident.length === 0) return false;
      setGroup("resident");
      return true;
    },
  });

  const { reset } = player;
  const value = useMemo<PlayerValue>(
    () => ({
      ...player,
      library,
      group,
      tracks,
      hasNetease,
      switchGroup: (next: Group) => {
        if (next === group) return;
        setGroup(next);
        reset();
      },
    }),
    [player, library, group, tracks, hasNetease, setGroup, reset],
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
