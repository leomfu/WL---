import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogList, type PostCard } from "@/components/blog/BlogList";
import { NewsPanel } from "@/components/news/NewsPanel";
import { ContentFooter, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getPosts } from "@/lib/content";
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
  return pageMetadata(locale, "blog", "/blog");
}

/**
 * 博客 —— 2026-09-08 把「文章」和「新闻」合并成一页，页内三个筛选平铺成一排：
 *
 *   文章       content/posts/ 的 markdown（自己写的，下面还有一层类型筛选）
 *   世界新闻   各家报社今天的头条，只有标题和链接
 *   AI 更新    官方更新 + 中文解读
 *
 * 新闻原来是独立的 /news 页、页内自己还有两个筛选；这里没有套成两层，
 * 而是把那两个直接摊到同一排上 —— 两层筛选读起来是两个决定，一层只是一个。
 *
 * ⚠️ **只有「文章」是服务端渲染的**。两栏新闻 2026-09-09 改成了客户端按需加载
 * （切过来才 fetch `/data/news.json`）—— 三栏全服务端渲染时这一页 HTML 有 187 KB，
 * 只想读文章的人白扛一份新闻页。理由和取舍写在 components/news/NewsPanel 顶部。
 *
 * ⚠️ 三块必须分开。自己写的文章和抓来的新闻标题混在一张清单里，
 * 会让人以为那些新闻也是他写的。
 */
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const tHome = await getTranslations("home");
  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;

  // 正文不进客户端包，只给列表需要的字段
  const posts: PostCard[] = getPosts().map(
    ({ slug, title, title_en, summary, summary_en, date, type, tags, minutes }) => ({
      slug,
      title,
      title_en,
      summary,
      summary_en,
      date,
      type,
      tags,
      minutes,
    }),
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        lead={t.rich("lead", {
          count: posts.length,
          // 篇数用主文字色，跟画板一致
          em: (chunks) => <span className="text-ink">{chunks}</span>,
        })}
      />

      <Reveal delay={120} className="mt-8">
        <SegmentedTabs
          storageKey="blog-tab"
          tabs={[
            {
              key: "posts",
              label: t("tabPosts"),
              content: (
                <div className="mt-8">
                  <BlogList posts={posts} />
                </div>
              ),
            },
            /* 这两栏是**按需加载**的：切过来才 fetch /data/news.json
               （NewsPanel 从 TabActiveContext 得知自己有没有被选中）。
               文章那一栏仍然是服务端渲染的，一个字没少 —— 理由见 NewsPanel 顶部 */
            { key: "world", label: t("tabWorld"), content: <NewsPanel board="world" /> },
            { key: "ai", label: t("tabAi"), content: <NewsPanel board="ai" /> },
          ]}
        />
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
