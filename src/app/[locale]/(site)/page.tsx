import Link from "next/link";
import { PosterHero } from "@/components/home/PosterHero";
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
 * 2026-09-01：开场页（那只时钟 + 点一下进站）整个下线，`/zh/` 直接就是这一页，
 * 顶上换成 PosterHero（按 mono-color 设计系统做的单色海报，来自站主那张背影照）。
 * 原来的 /zh/home/ 已经不存在，全站链接都指向语言根路径。四块层层收紧的密度，节奏全靠排版：
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
  const intro = await renderMarkdown(getHomeIntro(locale).body, locale);
  const now = getNow(locale);
  const featured = getProjects().filter((p) => p.featured).slice(0, 3);
  const posts = getPosts().slice(0, 4);

  /** 块 A 的引言：站主自己在自我介绍里写的那句话，中英各取原文对应的一句 */
  const quote =
    locale === "en"
      ? "Knowing how to use AI isn't the hard part. Knowing whether what it gives you is actually right is."
      : "我不觉得会用 AI 是什么本事，真正难的是判断它给的东西对不对。";

  return (
    <>
      {/* 单色海报那一屏：按 mono-color 设计系统把站主那张背影照重做成编辑式海报。
          纸色 #FAFAF7 和内容区的 #fafafa 几乎同色，所以它像印在页面上而不是贴上去的一块图，
          也就不需要旧版那种底部渐隐来接色。负边距顶掉 main 的内边距。 */}
      <div className="-mx-6 -mt-[88px] mb-14 sm:-mx-10 sm:mb-16 lg:-mt-[104px]">
        <PosterHero />
      </div>

      {/* 块 A · 引言：整页最重的一块 */}
      <Reveal>
        <span className="block text-[10.5px] tracking-(--tracking-eyebrow) text-faint uppercase">
          {t("eyebrow")}
        </span>
        <h1 className="mt-[22px] font-serif text-[26px] leading-[1.55] font-light tracking-[-0.01em] text-ink [text-wrap:pretty] sm:text-[34px]">
          {quote}
        </h1>
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

      {/* 块 C · 在做的：编号 + 细线清单 */}
      <Reveal delay={240} className="mt-[68px] sm:mt-[88px]">
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

            const row = (
              <div className="flex flex-col gap-3 border-t border-line py-[22px] sm:grid sm:grid-cols-[52px_1fr_auto] sm:items-baseline sm:gap-6">
                <span className="font-serif text-2xl font-light text-line-strong sm:text-[26px]">
                  {no}
                </span>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[16.5px] text-ink">{label}</span>
                  <span className="text-sm leading-[1.75] text-muted">{desc}</span>
                </div>
                {status && (
                  <span className="text-[11px] tracking-(--tracking-label) text-faint uppercase sm:justify-self-end">
                    {status}
                  </span>
                )}
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
        <p className="mt-6 text-[13px] text-muted">
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
      <Reveal delay={360} className="mt-[68px] sm:mt-[88px]">
        <SectionTitle title={t("writingTitle")} />
        <div className="mt-4 flex flex-col">
          {posts.length === 0 && (
            <p className="py-6 text-base leading-[1.9] text-muted">{t("noPosts")}</p>
          )}
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={localePath(locale, `/blog/${post.slug}`)}
              className={`group flex flex-col gap-1.5 py-[15px] sm:grid sm:grid-cols-[92px_1fr] sm:items-baseline sm:gap-6 ${
                i < posts.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="text-[12.5px] text-faint">{shortDate(post.date, locale)}</span>
              <span className="self-start border-b border-line-strong pb-px text-[15px] text-ink transition-colors group-hover:border-ink">
                {localized(locale, post.title, post.title_en)}
              </span>
            </Link>
          ))}
        </div>
        {posts.length > 0 && (
          <p className="mt-6 text-[13px] text-muted">
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
    </>
  );
}
