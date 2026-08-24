import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // 全站静态导出：不依赖任何服务器运行时，Vercel / Cloudflare Pages / GitHub Pages 都能上。
  // 因此不使用 middleware（next-intl 走 [locale] 段 + generateStaticParams）。
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default withNextIntl(nextConfig);
