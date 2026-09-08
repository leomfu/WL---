"use client";

import { useEffect, type ReactNode } from "react";
import { useStoredState } from "@/lib/useStoredState";

/**
 * 页面顶部的一排筛选 —— 点一下切一块，不用往下滑。
 * 博客页（文章 / 世界新闻 / AI 更新）、爱好页（摄影 / 唱片 / 书影音）、
 * 项目页（我做的 / 用到的开源 / 小工具）共用这一个。
 *
 * 每一块的内容都是**服务端渲染好**再以 props 传进来的（server component 可以作为
 * props 传给 client component），所以这个客户端组件只负责切换，不参与渲染内容本身 ——
 * 页面该发多少 JS 还是多少，不会因为加了筛选就把整页变成客户端组件。
 *
 * 不用条件渲染而是给没选中的那块挂 `hidden`：两块内容始终在 DOM 里，
 * ⌘K 搜索、浏览器的页内查找、以及爬虫都能拿到全部内容。
 *
 * 选中项记在 localStorage（storageKey 各页自己给一个），常看哪一边下次进来就停在哪一边。
 *
 * 地址里带 `#<tab key>` 可以直接落到某一栏（/zh/hobbies/#records 就是唱片那栏）——
 * 2026-09-08 合并板块之后，⌘K 里「摄影」「唱片」「书影音」「新闻」这些旧入口
 * 都是靠它跳到合并后页面的对应筛选上的。localStorage 里存的那个让位给 hash。
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

  /**
   * hash → 选中项。挂在 effect 里而不是初始值里：服务端渲染时没有 location，
   * 直接读会让首屏 HTML 和水合结果对不上。hashchange 也听着，
   * 好让「已经在这一页时又点了一个 #hash 链接」也能切过去。
   */
  useEffect(() => {
    const fromHash = () => {
      const key = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (key && tabs.some((t) => t.key === key)) setTab(key);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // tabs 是每次渲染新建的数组，进依赖会每帧重跑；这里只关心挂载和 hash 变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
