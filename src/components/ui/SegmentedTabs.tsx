"use client";

import type { ReactNode } from "react";
import { useStoredState } from "@/lib/useStoredState";

/**
 * 页面顶部的一排筛选 —— 点一下切一块，不用往下滑。
 * 新闻页（世界新闻 / AI 更新）和项目页（我做的 / 用到的开源）共用这一个。
 *
 * 每一块的内容都是**服务端渲染好**再以 props 传进来的（server component 可以作为
 * props 传给 client component），所以这个客户端组件只负责切换，不参与渲染内容本身 ——
 * 页面该发多少 JS 还是多少，不会因为加了筛选就把整页变成客户端组件。
 *
 * 不用条件渲染而是给没选中的那块挂 `hidden`：两块内容始终在 DOM 里，
 * ⌘K 搜索、浏览器的页内查找、以及爬虫都能拿到全部内容。
 *
 * 选中项记在 localStorage（storageKey 各页自己给一个），常看哪一边下次进来就停在哪一边。
 */
export function SegmentedTabs({
  storageKey,
  tabs,
}: {
  storageKey: string;
  /** 至少两项；第一项是默认选中的那个 */
  tabs: { key: string; label: string; content: ReactNode }[];
}) {
  const fallback = tabs[0]?.key ?? "";
  const [tab, setTab] = useStoredState(storageKey, fallback);
  const current = tabs.some((t) => t.key === tab) ? tab : fallback;

  return (
    <>
      <div className="flex items-center gap-7 border-b border-line pb-3 text-[13.5px]">
        {tabs.map((item) => {
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

      {tabs.map((item) => (
        <div key={item.key} className={current === item.key ? "" : "hidden"}>
          {item.content}
        </div>
      ))}
    </>
  );
}
