import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Giscus } from "@/components/comments/Giscus";
import { EmailActions } from "@/components/ui/EmailActions";
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

      {/* 没有 GitHub 账号的人也得有地方说话 —— 留言板不能只服务技术圈 */}
      <Reveal delay={200} className="mt-9 border border-line bg-card px-6 py-6 sm:px-7">
        <h2 className="text-[14.5px] font-medium tracking-[0.02em] text-ink">
          {t("noAccountTitle")}
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-[1.9] text-muted">
          {t("noAccountBody")}
        </p>
        <EmailActions email={siteConfig.email} />
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
