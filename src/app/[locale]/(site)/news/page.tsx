import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsFeed } from "@/components/news/NewsFeed";
import { ContentFooter, FootNote, PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getNews } from "@/lib/content";
import { longDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
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
  const t = Date.now() + 8 * 3600 * 1000 - offsetDays * 86400 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * 新闻 —— 每天早上抓一次 RSS 存成文件（scripts/fetch-news.mjs + GitHub Actions 定时），
 * 这一页只是把结果按日期和分类排出来。全是外链，不转载正文。
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
  const picks = news.picks.filter((p) => !p.url.endsWith("/status/1"));
  const links = news.categories.flatMap((c) =>
    c.links.map((link) => ({ ...link, category: en ? c.labelEn : c.label })),
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        lead={t("lead")}
      />

      <Reveal delay={120} className="mt-10">
        <NewsFeed categories={news.categories} today={cnDay()} yesterday={cnDay(1)} />
      </Reveal>

      {/* 手动精选：真正有价值的是那句点评，不是链接本身 */}
      {picks.length > 0 && (
        <Reveal delay={180} className="mt-[72px]">
          <SectionTitle title={t("picksTitle")} note={t("picksNote")} />
          <ul className="mt-5 flex flex-col gap-5">
            {picks.map((pick) => (
              <li key={pick.url} className="border-l border-line pl-5">
                <a
                  href={pick.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[14.5px] leading-[1.7] text-ink link-underline"
                >
                  {en ? pick.titleEn : pick.title}
                </a>
                <p className="mt-1.5 text-[13.5px] leading-[1.85] text-muted">
                  {en ? pick.commentEn : pick.comment}
                </p>
                <p className="mt-1 text-[12px] text-faint">
                  {pick.source} · {longDate(pick.date, locale)}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {/* 跳转口：X 抓不了，也不该抓 —— 想看一手就直接过去 */}
      <Reveal delay={240} className="mt-[72px]">
        <SectionTitle title={t("linksTitle")} note={t("linksNote")} />
        <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.url} className="flex items-baseline gap-3 border-b border-line py-2">
              <span className="w-[7.5rem] shrink-0 text-[12px] text-faint">{link.category}</span>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-[13.5px] text-ink transition-colors hover:text-muted"
              >
                {link.name} ↗
              </a>
            </li>
          ))}
        </ul>
      </Reveal>

      <FootNote>
        {news.generatedAt
          ? t("updated", { time: longDate(news.generatedAt.slice(0, 10), locale) })
          : t("neverUpdated")}
      </FootNote>

      <ContentFooter note={t("footerNote")} copyright={tHome("copyright", { year: siteConfig.since, name })} />
    </>
  );
}
