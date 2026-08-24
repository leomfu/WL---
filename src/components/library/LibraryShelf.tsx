"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localized, shortDate } from "@/lib/format";
import type { LibraryItem } from "@/lib/types";

/**
 * 书影音 —— 书/影/音三类切换。评分用实心/空心星，仍然是黑白。
 */
const FILTERS = ["all", "book", "movie", "album"] as const;

export function LibraryShelf({ items }: { items: LibraryItem[] }) {
  const t = useTranslations("library");
  const tType = useTranslations("library.types");
  const locale = useLocale();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [filter, items],
  );

  return (
    <>
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
      </div>

      <div className="mt-2 flex flex-col">
        {visible.length === 0 && (
          <p className="py-10 text-base leading-[1.9] text-muted">{t("empty")}</p>
        )}

        {visible.map((item, i) => {
          const title = localized(locale, item.title, item.title_en);
          const creator = localized(locale, item.creator, item.creator_en);
          const note = item.note ? localized(locale, item.note, item.note_en) : "";

          return (
            <div
              key={`${item.type}-${title}-${item.date}`}
              className={`flex flex-col gap-2 py-[22px] sm:flex-row sm:gap-[30px] ${
                i === visible.length - 1 ? "" : "border-b border-line"
              }`}
            >
              <span className="w-[86px] shrink-0 pt-1 text-[10.5px] tracking-[0.1em] text-faint">
                {tType(item.type)}
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="border-b border-line-strong pb-px text-[16.5px] text-ink transition-colors hover:border-ink"
                    >
                      {title} ↗
                    </a>
                  ) : (
                    <span className="text-[16.5px] text-ink">{title}</span>
                  )}
                  <span className="text-[13px] text-muted">{creator}</span>
                  {typeof item.rating === "number" && (
                    <span
                      className="text-[12px] tracking-[0.16em] text-faint"
                      aria-label={`${item.rating} / 5`}
                    >
                      {"★".repeat(item.rating)}
                      {"☆".repeat(Math.max(0, 5 - item.rating))}
                    </span>
                  )}
                </div>
                {note && <p className="text-sm leading-[1.75] text-muted">{note}</p>}
                <span className="text-[12px] text-faint">
                  {shortDate(item.date, locale)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
