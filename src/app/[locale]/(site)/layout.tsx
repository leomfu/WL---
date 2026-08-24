import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { CommandPalette } from "@/components/search/CommandPalette";
import { SiteShell } from "@/components/shell/SiteShell";
import { PageFade } from "@/components/ui/PageFade";
import { getPosts } from "@/lib/content";
import { localized } from "@/lib/format";
import { EXTRA_PAGES, NAV_ITEMS } from "@/lib/nav";

/**
 * 主站骨架层 —— 开场页（/[locale]/page.tsx）和放松区不在这一组里，
 * 它们各有自己的整屏布局。路由组 (site) 不影响 URL。
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /** ⌘K 的搜索索引：构建时生成，只带标题和摘要，正文不进浏览器包 */
  const posts = getPosts().map((post) => ({
    slug: post.slug,
    title: localized(locale, post.title, post.title_en),
    summary: localized(locale, post.summary, post.summary_en),
  }));
  const pages = [...NAV_ITEMS, ...EXTRA_PAGES].map(({ key, path }) => ({ key, path }));

  return (
    <SiteShell>
      <PageFade>{children}</PageFade>
      <CommandPalette pages={pages} posts={posts} />
    </SiteShell>
  );
}
