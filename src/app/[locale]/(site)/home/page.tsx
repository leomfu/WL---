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
  return pageMetadata(locale, "home", "/home");
}

/** 首页 —— 对照 docs/design/Main.dc.html 右侧内容区 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tType = await getTranslations("blog.types");

  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  const intro = await renderMarkdown(getHomeIntro(locale).body, locale);
  const now = getNow(locale);
  const nowHtml = await renderMarkdown(now.body, locale);
  const featured = getProjects().filter((p) => p.featured).slice(0, 3);
  const posts = getPosts().slice(0, 4);

  return (
    <>
      {/* 名字：细衬线大字 */}
      <Reveal>
        <h1 className="font-serif text-[34px] leading-[1.3] font-light tracking-[-0.01em] text-ink sm:text-[46px]">
          {name}
        </h1>
      </Reveal>

      {/* 自我介绍两段（content/home/intro.*.md） */}
      <Reveal delay={120} className="mt-[30px]">
        <div className="prose-bw" dangerouslySetInnerHTML={{ __html: intro }} />
      </Reveal>

      {/* 现在是 */}
      <Reveal delay={240} className="mt-[68px] sm:mt-[88px]">
        <SectionTitle
          title={t("nowTitle")}
          note={now.updated ? monthLabel(now.updated, locale) : undefined}
        />
        <div
          className="prose-bw prose-tight mt-5"
          dangerouslySetInnerHTML={{ __html: nowHtml }}
        />
      </Reveal>

      {/* 我在做的 */}
      <Reveal delay={360} className="mt-[68px] sm:mt-[88px]">
        <SectionTitle title={t("buildingTitle")} />
        <div className="mt-5 flex flex-col gap-5">
          {featured.map((project) => {
            const label = localized(locale, project.name, project.name_en);
            const desc = localized(locale, project.desc, project.desc_en);
            return (
              <p key={project.slug} className="text-base leading-[1.9] text-body">
                {project.link ? (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline"
                  >
                    {label}
                  </a>
                ) : (
                  <Link href={localePath(locale, "/projects")} className="link-underline">
                    {label}
                  </Link>
                )}
                {/* 分隔符和句末符号跟着语言走（中文 —— / 。，英文 · / .） */}
                {t("projectSeparator")}
                {desc}
                {project.stack && project.stack.length > 0 && (
                  <span className="text-muted">
                    {" "}
                    {project.stack.join(" / ")}
                    {t("stackSuffix")}
                  </span>
                )}
              </p>
            );
          })}
          <p className="text-base leading-[1.9] text-muted">
            {t.rich("moreProjects", {
              link: (chunks) => (
                <Link href={localePath(locale, "/projects")} className="link-underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </Reveal>

      {/* 我写的 */}
      <Reveal delay={480} className="mt-[68px] sm:mt-[88px]">
        <SectionTitle title={t("writingTitle")} />
        <div className="mt-5 flex flex-col">
          {posts.length === 0 && (
            <p className="text-base leading-[1.9] text-muted">{t("noPosts")}</p>
          )}
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={localePath(locale, `/blog/${post.slug}`)}
              className={`group flex items-baseline justify-between gap-6 py-[17px] ${
                i < posts.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="flex flex-wrap items-baseline gap-3">
                <span className="border-b border-transparent text-base text-ink transition-colors group-hover:border-ink">
                  {localized(locale, post.title, post.title_en)}
                </span>
                <span className="border border-line px-1.5 py-0.5 text-[10.5px] tracking-[0.1em] text-faint">
                  {tType(post.type)}
                </span>
              </span>
              <span className="shrink-0 text-[13px] whitespace-nowrap text-faint">
                {shortDate(post.date, locale)}
              </span>
            </Link>
          ))}
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
        </div>
      </Reveal>

      {/* 页脚 */}
      <Reveal delay={600}>
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
