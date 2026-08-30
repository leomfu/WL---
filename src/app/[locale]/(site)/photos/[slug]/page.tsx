import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlbumGrid } from "@/components/photos/AlbumGrid";
import { Reveal } from "@/components/ui/Reveal";
import { localized } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { localePath } from "@/lib/nav";
import { getAlbums } from "@/lib/photos";
import { albumDates } from "@/lib/photoTypes";
import { routing } from "@/i18n/routing";

type Params = { locale: string; slug: string };

/** 两种语言 × 所有辑，构建时全量生成 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAlbums().map((album) => ({ locale, slug: album.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  const album = getAlbums().find((a) => a.slug === slug);
  if (!album) return {};

  const base = await pageMetadata(locale, "photos", `/photos/${slug}`);
  const title = localized(locale, album.title, album.titleEn);
  const description =
    localized(locale, album.summary ?? "", album.summaryEn) ||
    [localized(locale, album.location ?? "", album.locationEn), albumDates(album.date, album.dateEnd)]
      .filter(Boolean)
      .join(" · ");

  return {
    ...base,
    title,
    description,
    openGraph: { ...base.openGraph, title, description },
    twitter: { ...base.twitter, title, description },
  };
}

/** 单辑页：缩略图网格 → 点开看整帧（← → 翻页、ESC 关闭），底部上一辑/下一辑 */
export default async function AlbumPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const albums = getAlbums();
  const index = albums.findIndex((a) => a.slug === slug);
  if (index === -1) notFound();

  const album = albums[index];
  const newer = albums[index - 1];
  const older = albums[index + 1];

  const t = await getTranslations("photos");
  const title = localized(locale, album.title, album.titleEn);
  const summary = localized(locale, album.summary ?? "", album.summaryEn);
  const location = localized(locale, album.location ?? "", album.locationEn);

  return (
    <>
      <Reveal>
        <Link
          href={localePath(locale, "/photos")}
          className="inline-block text-[12.5px] text-muted transition-colors hover:text-ink"
        >
          ← {t("title")}
        </Link>

        <h1 className="mt-5 font-serif text-[30px] leading-[1.35] font-light tracking-[-0.01em] text-ink sm:text-[38px]">
          {title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px] text-faint">
          <span className="border border-line px-1.5 py-0.5 text-[10.5px] tracking-[0.1em]">
            {album.kind === "feature" ? t("kindFeature") : t("kindArchive")}
          </span>
          {location && <span>{location}</span>}
          <span>{albumDates(album.date, album.dateEnd)}</span>
          <span>{t("frames", { count: album.photos.length })}</span>
        </div>

        {summary && (
          <p className="mt-5 max-w-[560px] text-[14.5px] leading-[1.85] text-muted">{summary}</p>
        )}
      </Reveal>

      <Reveal delay={120} className="mt-9">
        {album.photos.length > 0 ? (
          <AlbumGrid photos={album.photos} title={title} />
        ) : (
          <p className="text-base leading-[1.9] text-muted">{t("albumEmpty")}</p>
        )}
      </Reveal>

      {/* 上一辑 / 下一辑 */}
      <Reveal delay={200} className="mt-[72px] border-t border-line pt-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
          {newer ? (
            <Link
              href={localePath(locale, `/photos/${newer.slug}`)}
              className="group flex max-w-[46%] flex-col gap-1.5"
            >
              <span className="text-[10.5px] tracking-(--tracking-label) text-faint">
                {t("newer")}
              </span>
              <span className="text-sm text-ink transition-colors group-hover:text-muted">
                {localized(locale, newer.title, newer.titleEn)}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {older && (
            <Link
              href={localePath(locale, `/photos/${older.slug}`)}
              className="group flex max-w-[46%] flex-col gap-1.5 sm:items-end sm:text-right"
            >
              <span className="text-[10.5px] tracking-(--tracking-label) text-faint">
                {t("older")}
              </span>
              <span className="text-sm text-ink transition-colors group-hover:text-muted">
                {localized(locale, older.title, older.titleEn)}
              </span>
            </Link>
          )}
        </div>
        <Link
          href={localePath(locale, "/photos")}
          className="mt-8 inline-block text-[12.5px] text-muted transition-colors hover:text-ink"
        >
          ← {t("backToList")}
        </Link>
      </Reveal>
    </>
  );
}
