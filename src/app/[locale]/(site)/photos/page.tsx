import { setRequestLocale } from "next-intl/server";
import { PhotosSection } from "@/components/photos/PhotosSection";
import { pageMetadata } from "@/lib/metadata";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(locale, "photos", "/photos");
}

/**
 * 摄影 —— 内容全在 components/photos/PhotosSection（专题 + 按年份的档案，
 * 开头是那张双色调海报）。这一页只负责路由和 metadata。
 *
 * 这个页面 2026-09-08 上午被并进过 /hobbies，下午站主要求撤销，又变回独立页。
 * 入口不在顶栏，在**关于页那张同心轨道图**上（components/about/HobbyOrbit）。
 * 内容抽在 Section 组件里就是为了这种反复：合并还是拆开，只是换个壳。
 */
export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PhotosSection locale={locale} />;
}
