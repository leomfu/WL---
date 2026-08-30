/**
 * mm:ss；秒数不合法时给一个不跳版的占位。
 *
 * 原来住在 components/lounge/dial.tsx 里，2026-08-30 挪到 lib：
 * 迷你播放器和唱片页都要用它，而它们跟表盘的几何毫无关系，
 * 客户端组件为了一个字符串函数去 import 一整套表盘零件不合适。
 */
export const clock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
