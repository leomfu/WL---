import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsTabs } from "@/components/news/NewsTabs";
import { ListRow, ListRowGroup } from "@/components/ui/ListRow";
import {
  ContentFooter,
  FootNote,
  PageHeader,
  SectionTitle,
} from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getNews } from "@/lib/content";
import { longDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import type { NewsItem, Outlet } from "@/lib/types";
import { routing } from "@/i18n/routing";
import { siteConfig } from "~/site.config";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "news", "/news");
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

/**
 * 新闻 —— 两个板块，都在服务端渲染完（这一页没有交互，不需要往客户端发 JS）：
 *
 *   世界新闻   各家报社今天的头条，只有标题和链接，点了就走；下面是报社入口目录。
 *   AI 更新    Claude / Anthropic 等的官方更新 + 中文解读；解读写在 content/news/digests.json。
 *
 * 这一页不转载任何正文。
 */
export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("news");
  const tHome = await getTranslations("home");
  const en = locale === "en";
  const name = en ? siteConfig.nameEn : siteConfig.name;

  const news = getNews();
  const today = cnDay();
  const yesterday = cnDay(1);
  const dateLabel = (date: string) =>
    date === today
      ? t("today")
      : date === yesterday
        ? t("yesterday")
        : longDate(date, locale);

  /** 已经写过解读的更新，不在下面的「其余更新」里重复出现 */
  const digested = new Set(news.digests.map((d) => d.url));
  const restOfAi = news.ai.items.filter((item) => !digested.has(item.url));

  const outletList = (outlets: Outlet[]) => (
    <ul className="mt-5 grid gap-x-8 gap-y-0 sm:grid-cols-2">
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

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      {/* 两个筛选：点一下切一块，不用往下滑 */}
      <Reveal delay={80} className="mt-9">
        <NewsTabs
          worldLabel={t("worldTitle")}
          aiLabel={t("aiTitle")}
          world={
            <div className="mt-8">
              <SectionTitle
                title={t("worldTitle")}
                note={t("worldNote", {
                  n: news.world.items.length,
                  outlets: news.world.outlets.length,
                })}
              />

              {news.world.items.length === 0 ? (
                <p className="mt-5 text-[13.5px] leading-[1.9] text-muted">
                  {t("empty")}
                </p>
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

              <p className="mt-9 text-[12.5px] tracking-[0.02em] text-faint">
                {t("outletsLead")}
              </p>
              {outletList(news.world.outlets)}
            </div>
          }
          ai={
            <div className="mt-8">
              <SectionTitle title={t("aiTitle")} note={t("aiNote")} />

              {news.digests.length === 0 ? (
                <p className="mt-5 text-[13.5px] leading-[1.9] text-muted">
                  {t("noDigest")}
                </p>
              ) : (
                <div className="mt-7 flex flex-col gap-10">
                  {news.digests.map((digest) => (
                    <article
                      key={digest.url + digest.title}
                      className="border-l border-line pl-5 sm:pl-6"
                    >
                      <p className="text-[11.5px] tracking-[0.12em] text-faint">
                        {longDate(digest.date, locale)} · {digest.source}
                      </p>
                      <h3 className="mt-2 font-serif text-[19px] leading-[1.45] font-light text-ink sm:text-[21px]">
                        {en ? digest.titleEn : digest.title}
                      </h3>
                      <div className="mt-3 flex flex-col gap-3">
                        {(en ? digest.bodyEn : digest.body)
                          .split("\n\n")
                          .map((para, i) => (
                            <p
                              key={i}
                              className="text-[14.5px] leading-[1.95] text-body"
                            >
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
                  <p className="text-[12.5px] tracking-[0.02em] text-faint">
                    {t("restLead")}
                  </p>
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

              <p className="mt-9 text-[12.5px] tracking-[0.02em] text-faint">
                {t("outletsLeadAi")}
              </p>
              {outletList(news.ai.outlets)}
            </div>
          }
        />
      </Reveal>

      <FootNote>
        {news.generatedAt
          ? t("updated", {
              time: longDate(news.generatedAt.slice(0, 10), locale),
            })
          : t("neverUpdated")}
      </FootNote>

      <ContentFooter
        note={t("footerNote")}
        copyright={tHome("copyright", { year: siteConfig.since, name })}
      />
    </>
  );
}
