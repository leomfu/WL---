import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localePath } from "@/lib/nav";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 旧地址 `/lounge/` 的跳转页。
 *
 * 板块 2026-08-30 改名成「专注」，路由跟着从 /lounge 变成 /focus。
 * 静态导出没有 middleware，也没有服务器能发 301，所以这里放一张最朴素的跳转页：
 * `<meta http-equiv="refresh">` 立刻跳走（React 19 会把它提到 <head> 里），
 * 外加一句人话和一个手动链接 —— 万一自动跳转被拦了，人还能自己点。
 *
 * `robots: noindex` 是为了别让搜索引擎把这张空页面当成一个页面收走；
 * sitemap 里也只有 /focus/（它是从 NAV_ITEMS 生成的，那儿已经改了）。
 */
export const metadata = {
  robots: { index: false, follow: true },
};

export default async function LoungeMovedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("focus.moved");
  const to = localePath(locale, "/focus");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-shell px-6 text-center text-shell-ink">
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <p className="text-[10px] tracking-(--tracking-label) text-shell-faint uppercase">
        {t("label")}
      </p>
      <h1 className="font-serif text-[26px] font-light">{t("title")}</h1>
      <Link
        href={to}
        className="text-[13.5px] text-shell-dim underline decoration-shell-line-3 underline-offset-4 transition-colors hover:text-shell-ink"
      >
        {t("go")}
      </Link>
    </main>
  );
}
