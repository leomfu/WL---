"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { localized, shortDate, yearOf } from "@/lib/format";
import { localePath } from "@/lib/nav";
import type { PostType } from "@/lib/types";

/**
 * 文章列表 —— 对照 docs/design/BlogContact.dc.html 上半「写字的地方」。
 * 全部/博客/长文/想法 四个筛选是纯前端的（文章总量不大，构建时全给到客户端）。
 * 年份变化时插一条分隔行，长列表才不会失去时间感。
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

  let lastYear = "";

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
      <div className="mt-2 flex flex-col">
        {visible.length === 0 && (
          <p className="py-10 text-base leading-[1.9] text-muted">{t("empty")}</p>
        )}

        {visible.map((post, i) => {
          const year = yearOf(post.date);
          const newYear = year !== lastYear;
          lastYear = year;

          return (
            <div key={post.slug}>
              {newYear && i > 0 && (
                <div className="flex items-center gap-[30px] pt-8 pb-2">
                  <span className="w-[86px] shrink-0 text-[11px] tracking-(--tracking-label) text-faint">
                    {year}
                  </span>
                  <span className="h-px grow border-t border-dashed border-[#D8D8D8]" />
                </div>
              )}

              <Link
                href={localePath(locale, `/blog/${post.slug}`)}
                className={`group flex flex-col gap-2.5 py-[25px] sm:flex-row sm:gap-[30px] ${
                  i === visible.length - 1 ? "" : "border-b border-line"
                }`}
              >
                <span className="w-[86px] shrink-0 pt-1 text-[12.5px] whitespace-nowrap text-faint">
                  {shortDate(post.date, locale)}
                </span>
                <span className="flex flex-col gap-[9px]">
                  <span className="self-start border-b border-transparent pb-0.5 text-[17px] text-ink transition-colors group-hover:border-ink">
                    {localized(locale, post.title, post.title_en)}
                  </span>
                  <span className="text-sm leading-[1.75] text-muted">
                    {localized(locale, post.summary, post.summary_en)}
                  </span>
                  <span className="flex flex-wrap items-center gap-2.5 text-[10.5px] tracking-[0.1em] text-faint">
                    <span className="border border-line px-1.5 py-0.5">{tType(post.type)}</span>
                    {post.tags.map((tag) => (
                      <span key={tag} className="border border-line px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                    <span>{t("minutes", { minutes: post.minutes })}</span>
                  </span>
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
