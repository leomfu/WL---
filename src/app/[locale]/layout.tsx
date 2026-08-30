import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Inter, Noto_Serif_SC } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@/components/analytics/Analytics";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { getMusic } from "@/lib/content";
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
        <NextIntlClientProvider>
          {/*
           * 播放器挂在这一层 —— 它是 (site) 和 focus 的共同祖先，客户端跳页不会卸载。
           * 所以从唱片页走开之后音乐照放，右下角换成迷你卡片接着控制。
           * 放进唱片页里就会随页面一起被卸掉，音乐当场断。
           */}
          <PlayerProvider library={getMusic()}>{children}</PlayerProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
