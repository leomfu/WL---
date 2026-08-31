"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListRow, ListRowGroup } from "@/components/ui/ListRow";
import { localized, shortDate, yearOf } from "@/lib/format";
import { localePath } from "@/lib/nav";
import type { PostType } from "@/lib/types";

/**
 * 文章列表 —— 对照 design-v2/ContentTemplate.dc.html §②「列表行」。
 * 全部/博客/长文/想法 四个筛选是纯前端的（文章总量不大，构建时全给到客户端）。
 * 同一年份的连续几条揉进一张白卡（ListRowGroup），年份变化时在卡外插一条分隔行——
 * 年份标签本来就不是一条内容，不该挤进卡里。第一组前面不出现年份标签
 * （紧跟在筛选栏下面，时间线足够清楚），这是原实现就有的行为，这次没改。
 */

export type PostCard = {
  slug: string;
  title: string;
  title_en?: string;
  summary: string;
  summary_en?: string;
  date: string;
  type: PostType;
  tags: string[];
  minutes: number;
};

const FILTERS = ["all", "blog", "essay", "thought"] as const;

export function BlogList({ posts }: { posts: PostCard[] }) {
  const t = useTranslations("blog");
  const tType = useTranslations("blog.types");
  const locale = useLocale();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const visible = useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => p.type === filter)),
    [filter, posts],
  );

  /** 按年份把连续的条目揉成一组，好各自塞进一张白卡 */
  const groups = useMemo(() => {
    const list: { year: string; items: PostCard[] }[] = [];
    for (const post of visible) {
      const year = yearOf(post.date);
      const current = list[list.length - 1];
      if (current && current.year === year) current.items.push(post);
      else list.push({ year, items: [post] });
    }
    return list;
  }, [visible]);

  return (
    <>
      {/* 筛选 + 排序说明 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-[15px]">
        <div className="flex gap-[22px] text-[13px]">
          {FILTERS.map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={
                  active
                    ? "border-b border-ink pb-1 text-ink"
                    : "border-b border-transparent pb-1 text-muted transition-colors hover:text-ink"
                }
              >
                {key === "all" ? t("filterAll") : tType(key)}
              </button>
            );
          })}
        </div>
        <span className="text-xs tracking-[0.06em] text-faint">{t("order")}</span>
      </div>

      {/* 条目 */}
      <div className="mt-6 flex flex-col gap-8">
        {visible.length === 0 && (
          <p className="py-10 text-base leading-[1.9] text-muted">{t("empty")}</p>
        )}

        {groups.map(({ year, items }, gi) => (
          <div key={year + gi}>
            {gi > 0 && (
              <div className="flex items-center gap-[30px] pb-3">
                <span className="w-[86px] shrink-0 text-[11px] tracking-(--tracking-label) text-faint">
                  {year}
                </span>
                <span className="h-px grow border-t border-dashed border-[#D8D8D8]" />
              </div>
            )}

            <ListRowGroup>
              {items.map((post, i) => (
                <ListRow
                  key={post.slug}
                  href={localePath(locale, `/blog/${post.slug}`)}
                  last={i === items.length - 1}
                  left={shortDate(post.date, locale)}
                  title={localized(locale, post.title, post.title_en)}
                  desc={localized(locale, post.summary, post.summary_en)}
                  footer={
                    <span className="flex flex-wrap items-center gap-2.5 text-[10.5px] tracking-[0.1em] text-faint">
                      <span className="tag-framed">{tType(post.type)}</span>
                      {post.tags.map((tag) => (
                        <span key={tag} className="tag-framed">
                          {tag}
                        </span>
                      ))}
                      <span>{t("minutes", { minutes: post.minutes })}</span>
                    </span>
                  }
                />
              ))}
            </ListRowGroup>
          </div>
        ))}
      </div>
    </>
  );
}
