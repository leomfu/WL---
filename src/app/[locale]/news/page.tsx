import { setRequestLocale } from "next-intl/server";
import { Moved } from "@/components/shell/Moved";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** 别让搜索引擎收这张空页面，但要让它顺着链接爬到新地址去 */
export const metadata = {
  robots: { index: false, follow: true },
};

/** 旧地址 `/news/` —— 2026-09-08 改版后搬到 `/blog#world`，见 components/shell/Moved.tsx */
export default async function MovedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Moved locale={locale} reasonKey="news" to="/blog#world" />;
}
