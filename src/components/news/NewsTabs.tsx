"use client";

import type { ReactNode } from "react";
import { useStoredState } from "@/lib/useStoredState";

/**
 * 新闻页顶部的两个筛选 —— 世界新闻 / AI 更新，点一下切一个，不用往下滑。
 *
 * 两个板块都是服务端渲染好的，以 children 的形式传进来（React 的 server component
 * 可以作为 props 传给 client component），所以这个客户端组件只管切换，
 * 不参与渲染内容本身，页面该发多少 JS 还是多少。
 *
 * 选择记在 localStorage 里：常看哪一边，下次进来就停在哪一边。
 */
export function NewsTabs({
  worldLabel,
  aiLabel,
  world,
  ai,
}: {
  worldLabel: string;
  aiLabel: string;
  world: ReactNode;
  ai: ReactNode;
}) {
  const [tab, setTab] = useStoredState("news-tab", "world");
  const current = tab === "ai" ? "ai" : "world";

  return (
    <>
      <div className="flex items-center gap-7 border-b border-line pb-3 text-[13.5px]">
        {[
          { key: "world", label: worldLabel },
          { key: "ai", label: aiLabel },
        ].map((item) => {
          const active = current === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={active}
              className={
                active
                  ? "-mb-3 border-b border-ink pb-3 text-ink"
                  : "-mb-3 border-b border-transparent pb-3 text-muted transition-colors hover:text-ink"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={current === "world" ? "" : "hidden"}>{world}</div>
      <div className={current === "ai" ? "" : "hidden"}>{ai}</div>
    </>
  );
}
