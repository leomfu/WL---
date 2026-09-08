import { setRequestLocale } from "next-intl/server";
import { RecordsSection } from "@/components/records/RecordsSection";
import { pageMetadata } from "@/lib/metadata";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(locale, "records", "/records");
}

/**
 * 唱片 —— 内容全在 components/records/RecordsSection（黑胶唱机 + 按心情听的榜单）。
 * 入口在关于页那张轨道图上，不在顶栏。
 */
export default async function RecordsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RecordsSection locale={locale} />;
}
