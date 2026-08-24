import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/shell/SiteShell";
import { PageFade } from "@/components/ui/PageFade";

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

  return (
    <SiteShell>
      <PageFade>{children}</PageFade>
    </SiteShell>
  );
}
