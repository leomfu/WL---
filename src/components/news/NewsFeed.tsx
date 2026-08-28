"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { longDate } from "@/lib/format";
import type { NewsCategory, NewsItem } from "@/lib/types";

/**
 * 新闻列表 —— 按日期分组，组内每条标一个分类。
 * 分类筛选是纯前端的（一次最多几十条，构建时全给到客户端）。
 *
 * 所有条目都是**外链**，点了就走 —— 这一页不转载别人的正文，
 * 只做"今天有什么值得点开"的索引。
 */

type Row = { item: NewsItem; category: NewsCategory };

export function NewsFeed({
  categories,
  today,
  yesterday,
}: {
  categories: NewsCategory[];
  /** 日期分组的表头文案在服务端算好（"今天"要按北京时间，客户端时区不一定对） */
  today: string;
  yesterday: string;
}) {
  const t = useTranslations("news");
  const locale = useLocale();
  const en = locale === "en";
  const [filter, setFilter] = useState("all");

  const groups = useMemo(() => {
    const rows: Row[] = [];
    for (const category of categories) {
      if (filter !== "all" && category.key !== filter) continue;
      for (const item of category.items) rows.push({ item, category });
    }
    rows.sort((a, b) => (b.item.at ?? b.item.date).localeCompare(a.item.at ?? a.item.date));

    const byDate = new Map<string, Row[]>();
    for (const row of rows) {
      const list = byDate.get(row.item.date);
      if (list) list.push(row);
      else byDate.set(row.item.date, [row]);
    }
    return [...byDate.entries()];
  }, [categories, filter]);

  const dateLabel = (date: string) => {
    if (date === today) return t("today");
    if (date === yesterday) return t("yesterday");
    return longDate(date, locale);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-[22px] border-b border-line pb-[15px] text-[13px]">
        {[{ key: "all", label: t("all") }, ...categories.map((c) => ({ key: c.key, label: en ? c.labelEn : c.label }))].map(
          (tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                aria-pressed={active}
                className={
                  active
                    ? "border-b border-ink pb-1 text-ink"
                    : "border-b border-transparent pb-1 text-muted transition-colors hover:text-ink"
                }
              >
                {tab.label}
              </button>
            );
          },
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-[13.5px] leading-[1.9] text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-9 flex flex-col gap-9">
          {groups.map(([date, rows]) => (
            <section key={date}>
              <h2 className="flex items-baseline gap-3 text-[13px] tracking-[0.12em] text-faint uppercase">
                {dateLabel(date)}
                <span className="h-px grow bg-line" aria-hidden />
                <span className="text-[11.5px] normal-case">{t("count", { n: rows.length })}</span>
              </h2>

              <ul className="mt-3.5">
                {rows.map(({ item, category }) => (
                  <li key={item.url} className="border-b border-line last:border-b-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-4"
                    >
                      <span className="w-[7.5rem] shrink-0 text-[12px] tracking-[0.04em] text-faint">
                        {en ? category.labelEn : category.label}
                      </span>
                      <span className="grow text-[14.5px] leading-[1.7] text-ink transition-colors group-hover:text-muted">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[12px] text-faint">
                        {en ? item.sourceEn : item.source}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
