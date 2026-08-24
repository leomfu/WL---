import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SocialIcon } from "@/components/icons/SocialIcon";
import { ContentFooter, PageHeader } from "@/components/ui/PageHeader";
import { EmailActions } from "@/components/ui/EmailActions";
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
  return pageMetadata(locale, "contact", "/contact");
}

/** 联系页 —— 对照 docs/design/BlogContact.dc.html 下半「说点什么」 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tHome = await getTranslations("home");

  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  /** RSS 不算「在别处」，它在侧边栏里 */
  const socials = siteConfig.socials.filter((s) => s.key !== "rss");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      {/* 邮箱 */}
      <Reveal delay={120} className="mt-12">
        <div className="text-[11px] tracking-[0.18em] text-faint">
          {t("emailLabel")}
        </div>
        <div className="mt-5 font-serif text-[24px] leading-tight font-light tracking-[0.01em] break-all text-ink sm:text-[31px]">
          {siteConfig.email}
        </div>
        <EmailActions email={siteConfig.email} />
      </Reveal>

      {/* 在别处 */}
      <Reveal delay={260} className="mt-15">
        <div className="text-[11px] tracking-[0.18em] text-faint">
          {t("elsewhere")}
        </div>
        <div className="mt-3.5 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          {socials.map((social) => {
            const label = locale === "en" ? social.labelEn : social.label;
            const row = (
              <>
                <span className="flex items-center gap-[11px] text-[15px] text-ink">
                  <SocialIcon name={social.key} />
                  {label}
                </span>
                <span className="text-[13px] text-faint">
                  {social.handle} {social.href ? "↗" : ""}
                </span>
              </>
            );

            return social.href ? (
              <a
                key={social.key}
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between gap-4 border-b border-line py-[15px] transition-colors hover:border-ink"
              >
                {row}
              </a>
            ) : (
              <div
                key={social.key}
                className="flex items-center justify-between gap-4 border-b border-line py-[15px]"
              >
                {row}
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={420}>
        <ContentFooter
          note={t.rich("footerNote", {
            link: (chunks) => (
              <Link href={localePath(locale, "/guestbook")} className="link-underline">
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
