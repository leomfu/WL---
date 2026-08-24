import { getTranslations, setRequestLocale } from "next-intl/server";
import { LibraryShelf } from "@/components/library/LibraryShelf";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getLibrary } from "@/lib/content";
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
  return pageMetadata(locale, "library", "/library");
}

/** 书影音 —— 数据来自 content/library/library.json。不进侧边栏，从页脚和 ⌘K 进 */
export default async function LibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("library");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <Reveal delay={120} className="mt-10">
        <LibraryShelf items={getLibrary()} />
      </Reveal>
    </>
  );
}
