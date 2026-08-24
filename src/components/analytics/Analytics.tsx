import { siteConfig } from "~/site.config";

/**
 * 访问统计 —— 只在 site.config.ts 里配了 umami 才会插脚本，没配就什么都不渲染。
 * 用 Umami 是因为它无 cookie、不采集个人信息，免费版够个人站用（PLAN.md §2）。
 * 如果最后部署到 Vercel，也可以改用 Vercel Analytics，那就装 @vercel/analytics 换掉这里。
 */
export function Analytics() {
  const { umamiSrc, umamiWebsiteId } = siteConfig.analytics;
  if (!umamiSrc || !umamiWebsiteId) return null;

  return <script defer src={umamiSrc} data-website-id={umamiWebsiteId} />;
}
