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

/**
 * 联系页 —— 对照 docs/design/BlogContact.dc.html 下半「说点什么」。
 *
 * 2026-09-08 改成**左右两栏**（左：衬线大字邮箱 + 写邮件/复制；右：社交清单竖排）。
 * 原来是上下两块、各限 860px 左对齐，一个邮箱加六个链接摊在 1240px 版心里，
 * 右边空掉一大片，整页很空（站主原话「排版很不舒服」）。
 * 两栏之后宽度是被用掉的，不是被避开的，和关于页「正文 | 履历」同一个语法。
 *
 * 社交清单从原来的双列改成**单列竖排**：右栏只有 320px，双列会把 @handle 挤断行。
 */
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
  const socials = siteConfig.socials;

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <PageHeader title={t("title")} lead={t("lead")} />

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        {/* 左：邮箱 —— 这一页真正要人做的那件事，所以字最大 */}
        <Reveal delay={120}>
          <div className="text-[11px] tracking-[0.18em] text-faint">
            {t("emailLabel")}
          </div>
          <div className="mt-5 font-serif text-[26px] leading-tight font-light tracking-[0.01em] break-all text-ink sm:text-[34px]">
            {siteConfig.email}
          </div>
          <EmailActions email={siteConfig.email} />
        </Reveal>

        {/* 右：在别处 —— 320px 窄栏，所以单列竖排 */}
        <Reveal delay={260} className="lg:pt-0.5">
          <div className="text-[11px] tracking-[0.18em] text-faint">
            {t("elsewhere")}
          </div>
          <div className="mt-3.5 grid grid-cols-1">
            {socials.map((social) => {
              const label = locale === "en" ? social.labelEn : social.label;
              const row = (
                <>
                  <span className="flex shrink-0 items-center gap-[11px] text-[14.5px] text-ink">
                    <SocialIcon name={social.key} />
                    {label}
                  </span>
                  {/* 右栏只有 320px，@handle 有的很长（@WeiliangF27854），
                      压小一档 + truncate，宁可截断也不让它把行挤成两行 */}
                  <span className="min-w-0 truncate text-[12px] text-faint">
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
                  className="flex items-center justify-between gap-3 border-b border-line py-[13px] transition-colors hover:border-ink"
                >
                  {row}
                </a>
              ) : (
                <div
                  key={social.key}
                  className="flex items-center justify-between gap-3 border-b border-line py-[13px]"
                >
                  {row}
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>

      <Reveal delay={420}>
        <ContentFooter
          note={t.rich("footerNote", {
            link: (chunks) => (
              <Link href={localePath(locale, "/blog")} className="link-underline">
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
