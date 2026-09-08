import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LibraryShelf } from "@/components/library/LibraryShelf";
import { PhotosSection } from "@/components/photos/PhotosSection";
import { RecordsSection } from "@/components/records/RecordsSection";
import { ContentFooter, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getLibrary } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { localePath } from "@/lib/nav";
import { routing } from "@/i18n/routing";
import { siteConfig } from "~/site.config";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "hobbies", "/hobbies");
}

/**
 * 爱好 —— 2026-09-08 把原来三个独立页合并成一页，页内用筛选切：
 *
 *   摄影   原 /photos 索引页（单辑详情页 /photos/<slug>/ 仍在）
 *   唱片   原 /records
 *   书影音 原 /library
 *
 * 三块都在**服务端渲染好**再作为 props 交给 SegmentedTabs；没选中的那块只是挂了
 * hidden，仍在 DOM 里 —— ⌘K 搜索、页内查找和爬虫都拿得到。所以这一页虽然长，
 * 但只有唱机和照片放大这些本来就要交互的组件会往客户端发 JS。
 *
 * 地址带 #photos / #records / #library 可以直接落到对应那栏（⌘K 里三个旧入口就靠它）。
 */
export default async function HobbiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hobbies");
  const tHome = await getTranslations("home");
  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      <Reveal delay={120} className="mt-8">
        <SegmentedTabs
          storageKey="hobbies-tab"
          tabs={[
            {
              key: "photos",
              label: t("tabPhotos"),
              content: <PhotosSection locale={locale} />,
            },
            {
              key: "records",
              label: t("tabRecords"),
              content: (
                <div className="mt-8">
                  <RecordsSection locale={locale} />
                </div>
              ),
            },
            {
              key: "library",
              label: t("tabLibrary"),
              content: (
                <div className="mt-8">
                  <LibraryShelf items={getLibrary()} />
                </div>
              ),
            },
          ]}
        />
      </Reveal>

      <Reveal delay={240}>
        <ContentFooter
          note={t.rich("footerNote", {
            link: (chunks) => (
              <Link href={localePath(locale, "/contact")} className="link-underline">
                {chunks}
              </Link>
            ),
          })}
          copyright={tHome("copyright", { year: siteConfig.since, name })}
        />
      </Reveal>
    </>
  );
}
