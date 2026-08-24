import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ContentFooter } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getAbout } from "@/lib/content";
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

/** 关于页 —— 正文全部来自 content/about/about.{locale}.md */
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

  return (
    <>
      <PageHeader title={t("title")} />
      <Reveal delay={120} className="mt-10">
        <div className="prose-bw" dangerouslySetInnerHTML={{ __html: html }} />
      </Reveal>
      <Reveal delay={240}>
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
    </>
  );
}
