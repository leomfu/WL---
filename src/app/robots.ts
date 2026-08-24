import type { MetadataRoute } from "next";
import { siteConfig } from "~/site.config";

/** 静态导出要求这类路由是静态的 */
export const dynamic = "force-static";

/** robots.txt —— 全站允许抓取，并指向 sitemap */
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
