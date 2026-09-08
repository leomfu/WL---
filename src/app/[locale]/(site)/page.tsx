import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { ContentFooter, SectionTitle } from "@/components/ui/PageHeader";
import {
  getHomeIntro,
  getNow,
  getPosts,
  getProjects,
  localized,
  monthLabel,
  shortDate,
} from "@/lib/content";
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
  return pageMetadata(locale, "home", "");
}

/**
 * 首页 —— 对照 design-v2/Home.dc.html。
 *
 * 2026-09-01：开场页（那只时钟 + 点一下进站）整个下线，`/zh/` 直接就是这一页。
 * 2026-09-08：顶上那张单色海报（PosterHero）搬去了爱好页的摄影栏——站主要求首页不放照片，
 * 那张背影照更该当摄影的开场。这里换成一块**报头**：Logo + 名字 + 一句话定位，
 * 纯排版，没有图。原来的 /zh/home/ 已经不存在，全站链接都指向语言根路径。
 * 块 A 那句大字引言 2026-09-08 从硬编码搬进了 messages 的 `home.quote`
 * （原来引的是已经被整篇换掉的旧关于页，句子也过时了）。
 *
 * ⚠️ **整页收在 1080px 居中版心里**（和关于页、联系页同一档，见 docs/进度.md 的宽度表）。
 * 摊在 1240px 上时四块都是歪的：眉标被甩到一千二百像素外、引言右边空一大片、
 * 「在做的」那几行描述拉成一千像素长的一句话。站主原话「首页的排版也有些别扭」。
 *
 * ⚠️ **块 C 和块 D 在宽屏上并排**（`lg:grid-cols-2`）。首页是门口，
 * 「在做的」和「最近写的」本来就该一眼同时看见；并排之后每行的字数也回到正常。
 * 两块底部那句「更多…」用 `mt-auto` 对齐，长短不一时下沿也是平的。
 *
 * 四块层层收紧的密度，节奏全靠排版：
 * A 引言（整页最重，一句站主自己写的话）→ B 关于（收紧）→ C 在做的（编号清单）
 * → D 最近写的（最紧凑，日期领读）。原来单独的"现在是"板块已并入 C 的日期注记
 * （复用 content/now/*.md 的 updated 字段），不再单列一段——它的文字内容和
 * "在做的"高度重叠，见 docs/进度.md 这一轮的说明。
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  const tagline = locale === "en" ? siteConfig.taglineEn : siteConfig.tagline;
  const intro = await renderMarkdown(getHomeIntro(locale).body, locale);
  const now = getNow(locale);
  const featured = getProjects().filter((p) => p.featured).slice(0, 3);
  const posts = getPosts().slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      {/* 报头：Logo + 名字 + 一句话定位，靠一道细线收住 */}
      <Reveal className="flex flex-col gap-7 border-b border-line pb-11 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div className="flex items-center gap-5">
          <span className="flex size-[64px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-card sm:size-[76px]">
            <Image
              src={siteConfig.logo}
              alt={name}
              width={44}
              height={44}
              className="size-[38px] object-contain sm:size-[44px]"
            />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-[38px] leading-none font-light tracking-[0.02em] text-ink sm:text-[52px]">
              {name}
            </h1>
            {/* 限宽：这句现在比原来长，不限的话会一直伸到右边那个眉标底下 */}
            <p className="max-w-[46ch] text-[14px] leading-[1.7] text-muted sm:text-[15px]">
              {tagline}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10.5px] tracking-(--tracking-eyebrow) text-faint uppercase sm:pb-1.5">
          {t("eyebrow")}
        </span>
      </Reveal>

      {/* 块 A · 引言：整页最重的一块 */}
      <Reveal delay={80} className="mt-[52px]">
        <h2 className="max-w-[860px] font-serif text-[26px] leading-[1.55] font-light tracking-[-0.01em] text-ink [text-wrap:pretty] sm:text-[34px]">
          {t("quote")}
        </h2>
      </Reveal>

      {/* 块 B · 关于：密度陡然收紧 */}
      <Reveal
        delay={120}
        className="mt-[52px] grid grid-cols-1 gap-3 sm:grid-cols-[104px_1fr] sm:items-start sm:gap-8"
      >
        <span className="text-[10.5px] tracking-(--tracking-label) text-faint uppercase sm:pt-1.5">
          {t("aboutLabel")}
        </span>
        <div className="prose-bw prose-about" dangerouslySetInnerHTML={{ __html: intro }} />
      </Reveal>

      {/* 块 C 和块 D 并排：首页是门口，「在做的」和「最近写的」该一眼同时看见。
          窄屏仍然上下排（gap 就是原来那个 68px 的块间距）。 */}
      <div className="mt-[68px] grid gap-[68px] sm:mt-[88px] lg:grid-cols-2 lg:gap-16">
        {/* 块 C · 在做的：编号 + 细线清单 */}
        <Reveal delay={240} className="flex h-full flex-col">
          <SectionTitle
            title={t("buildingTitle")}
            note={now.updated ? monthLabel(now.updated, locale) : undefined}
          />
          <div className="mt-2 flex flex-col">
            {featured.map((project, i) => {
              const label = localized(locale, project.name, project.name_en);
              const desc = localized(locale, project.desc, project.desc_en);
              const status = project.status
                ? localized(locale, project.status, project.status_en)
                : undefined;
              const no = String(i + 1).padStart(2, "0");

              /* 状态标签原来是单独一列右对齐的。并排之后这一栏只有五百来像素，
                 再挤一列会把名字压断行，所以状态跟在名字后面同一行 */
              const row = (
                <div className="grid grid-cols-[44px_1fr] gap-4 border-t border-line py-5 sm:gap-5">
                  <span className="font-serif text-2xl leading-none font-light text-line-strong sm:text-[26px]">
                    {no}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[16px] text-ink">{label}</span>
                      {status && (
                        <span className="text-[10.5px] tracking-(--tracking-label) text-faint uppercase">
                          {status}
                        </span>
                      )}
                    </span>
                    <span className="text-[13.5px] leading-[1.8] text-muted">{desc}</span>
                  </div>
                </div>
              );

              return project.link ? (
                <a
                  key={project.slug}
                  href={project.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group"
                >
                  {row}
                </a>
              ) : (
                <Link key={project.slug} href={localePath(locale, "/projects")} className="group">
                  {row}
                </Link>
              );
            })}
          </div>
          {/* mt-auto：两栏长短不一时，两句「更多…」的下沿仍然是平的 */}
          <p className="mt-auto pt-6 text-[13px] text-muted">
            {t.rich("moreProjects", {
              link: (chunks) => (
                <Link href={localePath(locale, "/projects")} className="link-underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Reveal>

        {/* 块 D · 最近写的：最紧凑的一块，日期领读 */}
        <Reveal delay={360} className="flex h-full flex-col">
          <SectionTitle title={t("writingTitle")} />
          <div className="mt-4 flex flex-col">
            {posts.length === 0 && (
              <p className="py-6 text-base leading-[1.9] text-muted">{t("noPosts")}</p>
            )}
            {posts.map((post, i) => (
              <Link
                key={post.slug}
                href={localePath(locale, `/blog/${post.slug}`)}
                className={`group grid grid-cols-[76px_1fr] items-baseline gap-4 py-[15px] sm:gap-5 ${
                  i < posts.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="text-[12.5px] text-faint">{shortDate(post.date, locale)}</span>
                <span className="self-start border-b border-line-strong pb-px text-[15px] leading-[1.6] text-ink transition-colors group-hover:border-ink">
                  {localized(locale, post.title, post.title_en)}
                </span>
              </Link>
            ))}
          </div>
          {posts.length > 0 && (
            <p className="mt-auto pt-6 text-[13px] text-muted">
              {t.rich("morePosts", {
                link: (chunks) => (
                  <Link href={localePath(locale, "/blog")} className="link-underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </Reveal>
      </div>

      {/* 页脚 */}
      <Reveal delay={480}>
        <ContentFooter
          note={t.rich("footerNote", {
            link: (chunks) => (
              <Link href={localePath(locale, "/contact")} className="link-underline">
                {chunks}
              </Link>
            ),
          })}
          copyright={t("copyright", { year: siteConfig.since, name })}
        />
      </Reveal>
    </div>
  );
}
