import { setRequestLocale } from "next-intl/server";
import { FocusStage } from "@/components/focus/FocusStage";
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
  return pageMetadata(locale, "focus", "/focus");
}

/**
 * 专注 —— 整屏沉浸模式，不套 (site) 的骨架（对照 docs/design/Lounge.dc.html）。
 * 侧栏在这里收成 64px 图标条，由 FocusStage 自己管。
 *
 * 2026-08-30 从 /lounge 改名过来（音乐层同时撤掉，理由见 FocusStage 的注释）。
 * 旧地址 /lounge/ 留了一张跳转页，见隔壁 lounge/page.tsx。
 */
export default async function FocusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <FocusStage />;
}
