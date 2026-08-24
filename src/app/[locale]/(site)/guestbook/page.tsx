import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Giscus } from "@/components/comments/Giscus";
import { ContentFooter, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { pageMetadata } from "@/lib/metadata";
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
  return pageMetadata(locale, "guestbook", "/guestbook");
}

/** 留言板 —— 一条独立的 giscus 讨论串 */
export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guestbook");
  const tHome = await getTranslations("home");
  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <Reveal delay={120} className="mt-10">
        <Giscus term="guestbook" />
      </Reveal>
      <Reveal delay={240}>
        <ContentFooter
          note={t.rich("footerNote", {
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
