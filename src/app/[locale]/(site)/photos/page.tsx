import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { localized } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { localePath } from "@/lib/nav";
import { archiveByYear, featureAlbums, getAlbums } from "@/lib/photos";
import { albumDates, type Album } from "@/lib/photoTypes";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(locale, "photos", "/photos");
}

/**
 * 摄影列表页 —— 两级组织：
 * 上半部「专题」（成组的作品，大图卡片），下半部「档案」（按年份分组的辑清单）。
 * 数据来自 content/photos/*.json，图片由 `npm run photos` 压出来。
 */
export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("photos");

  const albums = getAlbums();
  const features = featureAlbums(albums);
  const archive = archiveByYear(albums);

  /** 「地点 · 2026.07.11 — 07.13 · 12 帧」 */
  const metaLine = (album: Album) =>
    [
      localized(locale, album.location ?? "", album.locationEn),
      albumDates(album.date, album.dateEnd),
      t("frames", { count: album.photos.length }),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      {albums.length === 0 && (
        <Reveal delay={120}>
          <p className="mt-11 text-base leading-[1.9] text-muted">{t("empty")}</p>
        </Reveal>
      )}

      {/* ---------------- 专题 ---------------- */}
      {features.length > 0 && (
        <Reveal delay={120} className="mt-12">
          <SectionLabel label={t("feature")} note={t("featureNote")} />
          <div className="mt-6 flex flex-col gap-11">
            {features.map((album) => {
              const cover = album.photos[0];
              const title = localized(locale, album.title, album.titleEn);
              const summary = localized(locale, album.summary ?? "", album.summaryEn);

              return (
                <Link
                  key={album.slug}
                  href={localePath(locale, `/photos/${album.slug}`)}
                  className="group flex flex-col gap-4"
                >
                  {cover && (
                    <div className="relative aspect-[3/2] w-full overflow-hidden bg-line">
                      <Image
                        src={cover.src}
                        alt={title}
                        width={cover.width}
                        height={cover.height}
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, 700px"
                        className="size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <span className="text-[17px] text-ink decoration-line-strong underline-offset-[6px] group-hover:underline">
                      {title}
                    </span>
                    <span className="text-[12.5px] text-faint">{metaLine(album)}</span>
                    {summary && (
                      <span className="mt-0.5 text-sm leading-[1.75] text-muted">{summary}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Reveal>
      )}

      {/* ---------------- 档案 ---------------- */}
      {archive.length > 0 && (
        <Reveal delay={200} className={features.length > 0 ? "mt-[76px]" : "mt-12"}>
          <SectionLabel label={t("archive")} note={t("archiveNote")} />

          <div className="mt-2">
            {archive.map(({ year, albums: list }) => (
              <div key={year} className="mt-9">
                <div className="flex items-center gap-4">
                  <span className="text-[12.5px] tracking-[0.14em] text-faint">{year}</span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[11px] tracking-[0.08em] text-faint">
                    {t("albumCount", { count: list.length })}
                  </span>
                </div>

                <div className="flex flex-col">
                  {list.map((album) => (
                    <Link
                      key={album.slug}
                      href={localePath(locale, `/photos/${album.slug}`)}
                      className="group flex flex-col gap-1.5 border-b border-line py-[18px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    >
                      <span className="text-[15.5px] text-ink transition-colors group-hover:text-muted">
                        {localized(locale, album.title, album.titleEn)}
                      </span>
                      <span className="shrink-0 text-[12.5px] text-faint">{metaLine(album)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </>
  );
}

/** 板块小标签：大字距全大写那一档（对照画板里 label 的处理） */
function SectionLabel({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line pb-3">
      <span className="text-[10.5px] tracking-(--tracking-label) text-faint">{label}</span>
      {note && <span className="text-[12px] text-faint">{note}</span>}
    </div>
  );
}
