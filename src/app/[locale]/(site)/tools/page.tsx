import { getTranslations, setRequestLocale } from "next-intl/server";
import { FootNote, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { ToolCard } from "@/components/ui/ToolCard";
import { getTools, localized } from "@/lib/content";
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
  return pageMetadata(locale, "tools", "/tools");
}

/** 工具页 —— 对照 docs/design/Tools.dc.html，数据来自 content/tools.json */
export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tools");
  const tools = getTools();

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      <div className="mt-11 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tools.map((tool, i) => (
          <Reveal key={tool.name} delay={120 + i * 55}>
            <ToolCard tool={tool} desc={localized(locale, tool.desc, tool.desc_en)} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={700}>
        <FootNote>{t("note")}</FootNote>
      </Reveal>
    </>
  );
}
