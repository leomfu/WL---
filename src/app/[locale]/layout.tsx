import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Inter, Noto_Serif_SC } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@/components/analytics/Analytics";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * 标题用的细衬线。next/font 在**构建时**把字体下载下来跟着站点一起发，
 * 访客不需要连 Google（国内连不上），所以这就是自托管。
 * 中文字体按 unicode-range 切成上百个小文件，浏览器只会下当前页面用得到的那几块。
 */
const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-noto-serif",
  display: "swap",
});

type Params = { locale: string };

/** 静态导出：两种语言都在构建时生成 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<Params>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${notoSerif.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
