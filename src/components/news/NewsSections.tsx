import { getTranslations } from "next-intl/server";
import { ListRow, ListRowGroup } from "@/components/ui/ListRow";
import { FootNote, SectionTitle } from "@/components/ui/PageHeader";
import { getNews } from "@/lib/content";
import { longDate } from "@/lib/format";
import type { NewsItem, Outlet } from "@/lib/types";

/**
 * 博客页里「世界新闻」和「AI 更新」两栏 —— 原来的 /news 页拆过来的（2026-09-08 合并）。
 *
 * 原来是「新闻」一个独立页 + 页内两个筛选；合并之后新闻和文章同在博客页，
 * 三个筛选平铺成一排（文章 / 世界新闻 / AI 更新），不再套两层筛选。
 *
 * 两栏都在服务端渲染完，这一页没有交互，不往客户端发 JS。
 * ⚠️ 这里不转载任何正文，只有标题和链接。
 */

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

/** 抓取时间的注记 —— 两栏底下都挂一份 */
async function UpdatedNote({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "news" });
  const { generatedAt } = getNews();
  return (
    <FootNote>
      {generatedAt
        ? t("updated", { time: longDate(generatedAt.slice(0, 10), locale) })
        : t("neverUpdated")}
    </FootNote>
  );
}

/** 世界新闻：各家报社今天的头条，只有标题和链接，点了就走 */
export async function WorldNews({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "news" });
  const en = locale === "en";
  const news = getNews();

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
      <UpdatedNote locale={locale} />
    </div>
  );
}

/** AI 更新：官方更新 + 中文解读（解读写在 content/news/digests.json） */
export async function AiNews({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "news" });
  const en = locale === "en";
  const news = getNews();

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
              className="max-w-[760px] border-l border-line pl-5 sm:pl-6"
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
                className="mt-3.5 inline-block text-[13px] text-muted link-underline"
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
      <UpdatedNote locale={locale} />
    </div>
  );
}
