import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HobbyOrbit } from "@/components/about/HobbyOrbit";
import { Timeline } from "@/components/about/Timeline";
import { PageHeader, ContentFooter } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getAbout, getTimeline } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { renderMarkdown } from "@/lib/markdown";
import { localePath } from "@/lib/nav";
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
  return pageMetadata(locale, "about", "/about");
}

/**
 * 关于页 —— 三块：
 *
 *   正文 + 履历   左右并排（正文 content/about/about.{locale}.md，
 *                 履历 content/about/timeline.json，右栏 sticky 跟着走）
 *   爱好          「我的爱好」同心轨道图（components/about/HobbyOrbit），整栏居中
 *
 * ⚠️ 两处布局约束，都别动：
 *
 * ① 这一页套了一层 `max-w-[1080px] mx-auto`，**比全站 1240px 的版心窄**。
 *    站主原话「内容居中一些，看着不别扭观感流畅」——正文列孤零零贴在版心左边、
 *    右边空掉一大块，整页是歪的。收窄居中之后左右才平衡。
 * ② 履历在**右栏**，不是正文下面。站主指定要「一边介绍一边显示经历」
 *    （照隔壁 项目文件存放处/网站设计 那个站的关于页排的）——读到「客服那一年」
 *    的时候，右边正好停着 2025.07 出港客服那一格，两边互相印证。
 *    右栏 sticky 就是为这个：正文滚起来，履历不滚走。
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tHome = await getTranslations("home");

  const html = await renderMarkdown(getAbout(locale).body, locale);
  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  const tagline = locale === "en" ? siteConfig.taglineEn : siteConfig.tagline;

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <PageHeader title={t("title")} lead={tagline} />

      {/* 正文 | 履历。窄屏一栏时履历排在正文下面，顺序和阅读顺序一致 */}
      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <Reveal delay={120}>
          <div className="prose-bw" dangerouslySetInnerHTML={{ __html: html }} />
        </Reveal>

        {/* top 要让开 fixed 顶栏再留一点空，高度从 token 算，别再写死 */}
        <aside className="lg:sticky lg:top-[calc(var(--spacing-topnav)+24px)] lg:self-start">
          <Timeline locale={locale} entries={getTimeline()} />
        </aside>
      </div>

      <HobbyOrbit locale={locale} />

      <Reveal delay={360}>
        <ContentFooter
          note={tHome.rich("footerNote", {
            link: (chunks) => (
              <Link href={localePath(locale, "/contact")} className="link-underline">
                {chunks}
              </Link>
            ),
          })}
          copyright={tHome("copyright", { year: siteConfig.since, name })}
        />
      </Reveal>
    </div>
  );
}
