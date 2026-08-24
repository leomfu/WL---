import { setRequestLocale } from "next-intl/server";
import { LoungeStage } from "@/components/lounge/LoungeStage";
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
  return pageMetadata(locale, "lounge", "/lounge");
}

/**
 * 放松区 —— 整屏沉浸模式，不套 (site) 的骨架（对照 docs/design/Lounge.dc.html）。
 * 侧栏在这里收成 64px 图标条，由 LoungeStage 自己管。
 */
export default async function LoungePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LoungeStage />;
}
