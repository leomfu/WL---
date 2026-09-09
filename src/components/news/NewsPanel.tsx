"use client";

import { useContext, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListRow, ListRowGroup } from "@/components/ui/ListRow";
import { FootNote, SectionTitle } from "@/components/ui/PageHeader";
import { TabActiveContext } from "@/components/ui/SegmentedTabs";
import { longDate } from "@/lib/format";
import type { NewsData, NewsItem, Outlet } from "@/lib/types";

/**
 * 博客页里「世界新闻」和「AI 更新」两栏。
 *
 * ── 为什么是客户端组件（2026-09-09 从服务端渲染改过来的）──
 * 这一页三栏都留在 DOM 里（未选中的只挂 hidden），新闻服务端渲染进去之后
 * 单页 HTML 从 67 KB 涨到 187 KB —— 只想读文章的人完整扛了一份新闻页。
 * 现在改成**切到这一栏才 fetch** `/data/news.json`（由 scripts/build-news-data.mjs
 * 在构建时生成）。
 *
 * ⚠️ 这是对「未选中也留在 DOM 里」那条约定的**有意例外**，只针对新闻：
 * 那些标题是别人家报社的，本来就不该作为这个站的正文被搜索引擎收录。
 * **自己写的文章仍然全部服务端渲染**，一个字都没少 —— 别把这条例外推广到文章上。
 *
 * 两栏共用一次请求：`cache` 是模块级的，谁先激活谁发起，另一栏直接复用。
 */

/** 模块级缓存：两栏共用一次请求，切来切去不会重复拉 */
let cache: Promise<NewsData> | null = null;

function loadNews(): Promise<NewsData> {
  cache ??= fetch("/data/news.json").then((res) => {
    if (!res.ok) throw new Error(`news.json ${res.status}`);
    return res.json() as Promise<NewsData>;
  });
  return cache;
}

/** 北京时间的 YYYY-MM-DD —— 抓取脚本按东八区归日，这里要对齐 */
function cnDay(offsetDays = 0) {
  return new Date(Date.now() + 8 * 3600 * 1000 - offsetDays * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
}

function groupByDate(items: NewsItem[]) {
  const map = new Map<string, NewsItem[]>();
  for (const item of items) {
    const list = map.get(item.date);
    if (list) list.push(item);
    else map.set(item.date, [item]);
  }
  return [...map.entries()];
}

/** 报社/来源入口目录。整幅版面下铺三列 */
function OutletList({ outlets }: { outlets: Outlet[] }) {
  return (
    <ul className="mt-5 grid gap-x-8 gap-y-0 sm:grid-cols-2 xl:grid-cols-3">
      {outlets.map((outlet) => (
        <li key={outlet.url} className="border-b border-line py-2.5">
          <a
            href={outlet.url}
            target="_blank"
            rel="noreferrer"
            className="text-[13.5px] text-ink transition-colors hover:text-muted"
          >
            {outlet.name} ↗
          </a>
          {outlet.note && (
            <span className="ml-2.5 text-[12px] text-faint">{outlet.note}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function NewsPanel({ board }: { board: "world" | "ai" }) {
  /** 这一栏是不是当前选中的（由 ui/SegmentedTabs 提供）。false 时不发请求 ——
      这正是这次改造的全部意义 */
  const active = useContext(TabActiveContext);
  const t = useTranslations("news");
  const locale = useLocale();
  const en = locale === "en";

  const [news, setNews] = useState<NewsData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || news || failed) return;
    let alive = true;
    loadNews().then(
      (data) => alive && setNews(data),
      () => {
        // 拉不到就把 cache 清掉，下次切过来还能重试
        cache = null;
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [active, news, failed]);

  if (!news) {
    return (
      <div className="mt-8 py-10 text-[13.5px] text-faint">
        {failed ? t("loadFailed") : active ? t("loading") : null}
      </div>
    );
  }

  const updated = (
    <FootNote>
      {news.generatedAt
        ? t("updated", { time: longDate(news.generatedAt.slice(0, 10), locale) })
        : t("neverUpdated")}
    </FootNote>
  );

  /* ---------------- 世界新闻 ---------------- */
  if (board === "world") {
    const today = cnDay();
    const yesterday = cnDay(1);
    const dateLabel = (date: string) =>
      date === today
        ? t("today")
        : date === yesterday
          ? t("yesterday")
          : longDate(date, locale);

    return (
      <div className="mt-8">
        <SectionTitle
          title={t("worldTitle")}
          note={t("worldNote", {
            n: news.world.items.length,
            outlets: news.world.outlets.length,
          })}
        />

        {news.world.items.length === 0 ? (
          <p className="mt-5 text-[13.5px] leading-[1.9] text-muted">{t("empty")}</p>
        ) : (
          <div className="mt-6 flex flex-col gap-8">
            {groupByDate(news.world.items).map(([date, items]) => (
              <section key={date}>
                <h3 className="flex items-baseline gap-3 pb-3 text-[12px] tracking-[0.14em] text-faint">
                  {dateLabel(date)}
                  <span className="h-px grow bg-line" aria-hidden />
                </h3>
                <ListRowGroup>
                  {items.map((item, i) => (
                    <ListRow
                      key={item.url}
                      href={item.url}
                      external
                      last={i === items.length - 1}
                      left={en ? item.sourceEn : item.source}
                      title={item.title}
                    />
                  ))}
                </ListRowGroup>
              </section>
            ))}
          </div>
        )}

        <p className="mt-9 text-[12.5px] tracking-[0.02em] text-faint">{t("outletsLead")}</p>
        <OutletList outlets={news.world.outlets} />
        {updated}
      </div>
    );
  }

  /* ---------------- AI 更新 ---------------- */
  /** 已经写过解读的更新，不在下面的「其余更新」里重复出现 */
  const digested = new Set(news.digests.map((d) => d.url));
  const restOfAi = news.ai.items.filter((item) => !digested.has(item.url));

  return (
    <div className="mt-8">
      <SectionTitle title={t("aiTitle")} note={t("aiNote")} />

      {news.digests.length === 0 ? (
        <p className="mt-5 text-[13.5px] leading-[1.9] text-muted">{t("noDigest")}</p>
      ) : (
        <div className="mt-7 flex flex-col gap-10">
          {news.digests.map((digest) => (
            <article
              key={digest.url + digest.title}
              className="max-w-column border-l border-line pl-5 sm:pl-6"
            >
              <p className="text-[11.5px] tracking-[0.12em] text-faint">
                {longDate(digest.date, locale)} · {digest.source}
              </p>
              <h3 className="mt-2 font-serif text-[19px] leading-[1.45] font-light text-ink sm:text-[21px]">
                {en ? digest.titleEn : digest.title}
              </h3>
              <div className="mt-3 flex flex-col gap-3">
                {(en ? digest.bodyEn : digest.body).split("\n\n").map((para, i) => (
                  <p key={i} className="text-[14.5px] leading-[1.95] text-body">
                    {para}
                  </p>
                ))}
              </div>
              <a
                href={digest.url}
                target="_blank"
                rel="noreferrer"
                className="link-underline mt-3.5 inline-block text-[13px] text-muted"
              >
                {t("readOriginal")} ↗
              </a>
            </article>
          ))}
        </div>
      )}

      {restOfAi.length > 0 && (
        <div className="mt-11">
          <p className="text-[12.5px] tracking-[0.02em] text-faint">{t("restLead")}</p>
          <div className="card-face mt-3 flex flex-col">
            {restOfAi.map((item, i) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className={`group flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-paper sm:flex-row sm:items-baseline sm:gap-4 sm:px-6 ${
                  i === restOfAi.length - 1 ? "" : "border-b border-line-soft"
                }`}
              >
                <span className="w-[7rem] shrink-0 text-[12px] text-faint">
                  {en ? item.sourceEn : item.source}
                </span>
                <span className="grow text-[13.5px] leading-[1.7] text-muted transition-colors group-hover:text-ink">
                  {item.title}
                </span>
                <span className="shrink-0 text-[11.5px] text-faint">{item.date}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-9 text-[12.5px] tracking-[0.02em] text-faint">{t("outletsLeadAi")}</p>
      <OutletList outlets={news.ai.outlets} />
      {updated}
    </div>
  );
}
