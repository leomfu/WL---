import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 首页占位 —— 真正的首页（左侧暗色侧边栏 + 内容区）在阶段 2 做，
 * 对照 docs/design/Main.dc.html。这里先保证开场页有地方可去。
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="bg-content flex min-h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-column flex-col gap-6">
        <h1 className="font-serif text-[46px] leading-tight font-light text-ink">
          {t("placeholderTitle")}
        </h1>
        <p className="text-base leading-relaxed text-muted">
          {t("placeholderNote")}
        </p>
        <Link
          href={`/${locale}/`}
          className="link-underline self-start text-sm"
        >
          {t("backToIntro")}
        </Link>
      </div>
    </main>
  );
}
