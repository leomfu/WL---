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
 * 关于页 —— 三块，从上到下一条**居中的脊**：
 *
 *   正文    content/about/about.{locale}.md（2026-09-08 全文重写，见 docs/进度.md）
 *   履历    content/about/timeline.json
 *   爱好    「我的爱好」同心轨道图（components/about/HobbyOrbit）
 *
 * ⚠️ 这一页自己套了一层 `max-w-[820px] mx-auto`，**比全站 1240px 的版心窄**。
 * 站主原话「内容居中一些，看着不别扭观感流畅」—— 700px 的正文列孤零零贴在
 * 1240px 版心的左边，右边空掉五百多像素，整页是歪的。收进一条居中的窄栏之后，
 * 标题、正文、履历、轨道图共用同一根中轴线，从上往下读是一条线不是两坨。
 * 别把这一层去掉改回全宽。
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
    <div className="mx-auto w-full max-w-[820px]">
      <PageHeader title={t("title")} lead={tagline} />

      {/* .prose-bw 自带 700px 上限，在这条 820px 的窄栏里再居中一次，
          左右各留 60px —— 和下面履历、轨道图的中轴对齐 */}
      <Reveal delay={120} className="mt-11">
        <div
          className="prose-bw mx-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Reveal>

      <Timeline locale={locale} entries={getTimeline()} />

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
