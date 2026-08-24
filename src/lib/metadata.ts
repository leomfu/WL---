import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteConfig } from "~/site.config";
import { localePath } from "./nav";

/**
 * 每页的双语 metadata（标题 / 描述 / canonical / hreflang / OG）。
 * 文案走 messages 的 pageMeta 命名空间，两种语言都有。
 * OG 图不在这里指定 —— Next 会自动挂上 app/[locale]/opengraph-image 生成的那张。
 */
export async function pageMetadata(
  locale: string,
  key: string,
  path: string,
): Promise<Metadata> {
  const page = await getTranslations({ locale, namespace: `pageMeta.${key}` });
  const site = await getTranslations({ locale, namespace: "meta" });

  const title = `${page("title")} · ${site("title")}`;
  const description = page("description");
  const url = localePath(locale, path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, localePath(l, path)]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: site("title"),
      locale: locale === "zh" ? "zh_CN" : "en_US",
      title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    metadataBase: new URL(siteConfig.url),
  };
}
