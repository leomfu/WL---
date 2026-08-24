import { getPosts } from "@/lib/content";
import { localePath } from "@/lib/nav";
import { siteConfig } from "~/site.config";

/**
 * RSS —— 静态导出下的 route handler 必须是静态的（只有 GET + force-static），
 * 构建时会写成 out/rss.xml。侧边栏的 RSS 那一项指向它。
 * 条目用文章原文语言的标题（一篇文章只发一次，不按语言拆两份）。
 */
export const dynamic = "force-static";

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function GET() {
  const posts = getPosts();
  const site = siteConfig.url.replace(/\/$/, "");
  const self = `${site}/rss.xml`;

  const items = posts
    .map((post) => {
      const path = localePath(post.lang, `/blog/${post.slug}`);
      const url = `${site}${path}`;
      const title = post.lang === "en" && post.title_en ? post.title_en : post.title;
      const summary =
        post.lang === "en" && post.summary_en ? post.summary_en : post.summary;

      return `    <item>
      <title>${escape(title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      <pubDate>${new Date(`${post.date}T08:00:00+08:00`).toUTCString()}</pubDate>
      <description>${escape(summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(siteConfig.name)}</title>
    <link>${escape(site)}</link>
    <description>${escape(siteConfig.tagline)}</description>
    <language>zh-CN</language>
    <atom:link href="${escape(self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
