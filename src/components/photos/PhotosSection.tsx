import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { MediaCard } from "@/components/ui/MediaCard";
import { Reveal } from "@/components/ui/Reveal";
import { localized } from "@/lib/format";
import { localePath } from "@/lib/nav";
import { archiveByYear, featureAlbums, getAlbums } from "@/lib/photos";
import { albumDates, type Album } from "@/lib/photoTypes";
import { PosterHero } from "./PosterHero";

/**
 * 爱好页「摄影」那一栏 —— 原来的 /photos 列表页整块搬过来的（2026-09-08 合并）。
 * 两级组织没变：上半「专题」（成组的作品，大图卡片），下半「档案」（按年份分组）。
 * 单辑详情页仍在 /photos/<slug>/，只是没有 /photos/ 这个索引页了。
 *
 * 开头那张双色调海报是从首页搬来的（站主要求首页不再放照片，
 * 它更该当摄影的开场）——它本来就是站主自己那张背影照。
 */
export async function PhotosSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "photos" });

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
      {/* 开场大图：负边距顶掉 main 的左右内边距，让海报出血到窗口两侧 */}
      <div className="-mx-5 mt-8 mb-12 sm:-mx-10">
        <PosterHero />
      </div>

      <p className="max-w-[640px] text-[15.5px] leading-[1.8] text-muted">{t("lead")}</p>

      {albums.length === 0 && (
        <Reveal delay={120}>
          <p className="mt-11 text-base leading-[1.9] text-muted">{t("empty")}</p>
        </Reveal>
      )}

      {/* ---------------- 专题：图片卡（对照 design-v2/ContentTemplate.dc.html §③）---------------- */}
      {features.length > 0 && (
        <Reveal delay={120} className="mt-12">
          <SectionLabel label={t("feature")} note={t("featureNote")} />
          {/* 整幅版面下专题卡排两列；原来是 700px 窄列所以只能单列 */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {features.map((album) => {
              const cover = album.photos[0];
              const title = localized(locale, album.title, album.titleEn);
              const summary = localized(locale, album.summary ?? "", album.summaryEn);

              return (
                <MediaCard
                  key={album.slug}
                  href={localePath(locale, `/photos/${album.slug}`)}
                  media={
                    cover && (
                      <Image
                        src={cover.src}
                        alt={title}
                        width={cover.width}
                        height={cover.height}
                        loading="lazy"
                        sizes="(max-width: 1280px) 100vw, 50vw"
                        className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]"
                      />
                    )
                  }
                  title={title}
                  meta={metaLine(album)}
                  desc={summary || undefined}
                />
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

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((album) => {
                    const cover = album.photos[0];
                    const title = localized(locale, album.title, album.titleEn);
                    return (
                      <MediaCard
                        key={album.slug}
                        href={localePath(locale, `/photos/${album.slug}`)}
                        media={
                          cover && (
                            <Image
                              src={cover.thumb}
                              alt={title}
                              width={cover.width}
                              height={cover.height}
                              loading="lazy"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]"
                            />
                          )
                        }
                        title={title}
                        meta={t("frames", { count: album.photos.length })}
                        desc={
                          [
                            localized(locale, album.location ?? "", album.locationEn),
                            albumDates(album.date, album.dateEnd),
                          ]
                            .filter(Boolean)
                            .join(" · ") || undefined
                        }
                      />
                    );
                  })}
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
