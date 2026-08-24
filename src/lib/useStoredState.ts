"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 存在 localStorage / sessionStorage 里的一点小状态（侧栏折没折、放松区上次的场景和音量、
 * 开场页看没看过）。
 *
 * 走 useSyncExternalStore 而不是「effect 里读一次再 setState」：
 * 服务端和首帧都拿 fallback，hydration 之后 React 自己补上真实值，
 * 既不会 hydration mismatch，也不会多一轮级联渲染。
 */

type Kind = "local" | "session";

const listeners = new Set<() => void>();

/** 同一个页面里改了值，别的组件也要跟着变，所以自己维护一份订阅表 */
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function storage(kind: Kind) {
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

function read(kind: Kind, key: string) {
  try {
    return storage(kind).getItem(key);
  } catch {
    // 隐私模式下会直接抛错，当作没存过
    return null;
  }
}

export function useStoredState(key: string, fallback: string, kind: Kind = "local") {
  const value = useSyncExternalStore(
    subscribe,
    () => read(kind, key) ?? fallback,
    () => fallback,
  );

  const set = useCallback(
    (next: string) => {
      try {
        storage(kind).setItem(key, next);
      } catch {
        // 存不下就算了，最多下次回到默认值
      }
      listeners.forEach((listener) => listener());
    },
    [key, kind],
  );

  return [value, set] as const;
}
