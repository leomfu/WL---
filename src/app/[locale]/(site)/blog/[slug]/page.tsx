import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleToc } from "@/components/blog/ArticleToc";
import { Giscus } from "@/components/comments/Giscus";
import { Reveal } from "@/components/ui/Reveal";
import { getPosts } from "@/lib/content";
import { localized, longDate } from "@/lib/format";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { pageMetadata } from "@/lib/metadata";
import { localePath } from "@/lib/nav";
import { routing } from "@/i18n/routing";

type Params = { locale: string; slug: string };

/** 两种语言 × 所有文章，构建时全量生成 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getPosts().map((post) => ({ locale, slug: post.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  const post = getPosts().find((p) => p.slug === slug);
  if (!post) return {};

  const base = await pageMetadata(locale, "blog", `/blog/${slug}`);
  const title = localized(locale, post.title, post.title_en);
  const description = localized(locale, post.summary, post.summary_en);

  return {
    ...base,
    title,
    description,
    openGraph: { ...base.openGraph, type: "article", title, description },
    twitter: { ...base.twitter, title, description },
  };
}

/** 文章详情页：正文 + 长文侧边目录 + 上一篇/下一篇 + giscus 评论 */
export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const posts = getPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const post = posts[index];
  const newer = posts[index - 1];
  const older = posts[index + 1];

  const t = await getTranslations("blog");
  const tType = await getTranslations("blog.types");

  const html = await renderMarkdown(post.body, locale);
  const headings = extractHeadings(post.body);
  const showToc = headings.length >= 3;

  /** 只有单语版本的文章，在另一种语言下也照常显示，顶部标一行说明（PLAN 阶段 3 §4） */
  const langMismatch = post.lang !== locale;

  return (
    <div className="relative">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-faint">
          <span>{longDate(post.date, locale)}</span>
          <span className="border border-line px-1.5 py-0.5 text-[10.5px] tracking-[0.1em]">
            {tType(post.type)}
          </span>
          <span>{t("minutes", { minutes: post.minutes })}</span>
        </div>

        <h1 className="mt-4 font-serif text-[30px] leading-[1.35] font-light tracking-[-0.01em] text-ink sm:text-[38px]">
          {localized(locale, post.title, post.title_en)}
        </h1>

        {langMismatch && (
          <p className="mt-5 border-l border-line-strong pl-4 text-[12.5px] leading-[1.7] text-faint">
            {t("originalLang", {
              lang: post.lang === "zh" ? t("langZh") : t("langEn"),
              target: locale === "zh" ? t("langZh") : t("langEn"),
            })}
          </p>
        )}
      </Reveal>

      {/* 侧边目录：位置在内容列右侧的留白里，窄屏不出现 */}
      {showToc && (
        <aside className="pointer-events-none absolute top-0 left-[calc(100%+56px)] hidden h-full w-[190px] xl:block">
          <div className="pointer-events-auto">
            <ArticleToc headings={headings} />
          </div>
        </aside>
      )}

      <Reveal delay={120} className="mt-9">
        <article className="prose-bw" dangerouslySetInnerHTML={{ __html: html }} />
      </Reveal>

      {/* 上一篇 / 下一篇 */}
      <Reveal delay={200} className="mt-[72px] border-t border-line pt-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
          {newer ? (
            <Link
              href={localePath(locale, `/blog/${newer.slug}`)}
              className="group flex max-w-[46%] flex-col gap-1.5"
            >
              <span className="text-[10.5px] tracking-(--tracking-label) text-faint">
                {t("next")}
              </span>
              <span className="text-sm text-ink transition-colors group-hover:text-muted">
                {localized(locale, newer.title, newer.title_en)}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {older && (
            <Link
              href={localePath(locale, `/blog/${older.slug}`)}
              className="group flex max-w-[46%] flex-col gap-1.5 sm:items-end sm:text-right"
            >
              <span className="text-[10.5px] tracking-(--tracking-label) text-faint">
                {t("prev")}
              </span>
              <span className="text-sm text-ink transition-colors group-hover:text-muted">
                {localized(locale, older.title, older.title_en)}
              </span>
            </Link>
          )}
        </div>
        <Link
          href={localePath(locale, "/blog")}
          className="mt-8 inline-block text-[12.5px] text-muted transition-colors hover:text-ink"
        >
          ← {t("backToList")}
        </Link>
      </Reveal>

      {/* 评论 */}
      <Reveal delay={280} className="mt-[72px] border-t border-line pt-7">
        <h2 className="text-lg font-medium text-ink">{t("comments")}</h2>
        <div className="mt-6">
          <Giscus term={`blog/${post.slug}`} />
        </div>
      </Reveal>
    </div>
  );
}
