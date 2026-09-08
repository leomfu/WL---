import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { CommandPalette } from "@/components/search/CommandPalette";
import { SiteShell } from "@/components/shell/SiteShell";
import { PageFade } from "@/components/ui/PageFade";
import { getPosts } from "@/lib/content";
import { localized } from "@/lib/format";
import { NAV_ALIASES, NAV_ITEMS } from "@/lib/nav";

/**
 * 主站骨架层 —— 顶栏 + 整幅内容区。路由组 (site) 不影响 URL。
 * 2026-09-08 之后全站页面都在这一组里：开场页和整屏的放松区/专注页都已下线。
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
  /* ⌘K 里既有真实页面，也有合并掉的旧板块（摄影/唱片/书影音/新闻）——
     后者跳到合并后页面的对应筛选上，搜「摄影」照样找得到 */
  const pages = [...NAV_ITEMS, ...NAV_ALIASES].map(({ key, path }) => ({ key, path }));

  return (
    <SiteShell>
      <PageFade>{children}</PageFade>
      <CommandPalette pages={pages} posts={posts} />
    </SiteShell>
  );
}
