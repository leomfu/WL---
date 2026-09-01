"use client";

import type { ReactNode } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

/**
 * 新闻页顶部的两个筛选 —— 世界新闻 / AI 更新。
 *
 * 切换的逻辑已经抽到 ui/SegmentedTabs（项目页也用同一个），这里只剩一层薄封装：
 * 把新闻页那两个具名 props 转成通用的 tabs 数组。保留这一层是为了不动新闻页的 JSX ——
 * 那一页两块内容都很长，直接改调用处容易把嵌套改错。
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
  return (
    <SegmentedTabs
      storageKey="news-tab"
      tabs={[
        { key: "world", label: worldLabel, content: world },
        { key: "ai", label: aiLabel, content: ai },
      ]}
    />
  );
}
