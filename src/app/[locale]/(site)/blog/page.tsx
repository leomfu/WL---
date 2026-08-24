import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogList, type PostCard } from "@/components/blog/BlogList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getPosts } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { routing } from "@/i18n/routing";

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

/** 「写字的地方」列表页 —— 对照 docs/design/BlogContact.dc.html 上半 */
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

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
      <Reveal delay={120} className="mt-10">
        <BlogList posts={posts} />
      </Reveal>
    </>
  );
}
