import { getTranslations, setRequestLocale } from "next-intl/server";
import { RecordShelf } from "@/components/records/RecordShelf";
import { Turntable } from "@/components/records/Turntable";
import { FootNote, PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getMusic, getRecords } from "@/lib/content";
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
  return pageMetadata(locale, "records", "/records");
}

/**
 * 唱片 —— 两块：
 * ① 一台真能转、真出声的黑胶唱机（复用放松区那两组曲库，播放内核见 lib/useAudioPlayer）；
 * ② 「我听的」专辑/歌手墙（content/music/records.json）。
 *
 * 曲库和放松区是同一份 getMusic()，不另起一套。
 */
export default async function RecordsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("records");

  const music = getMusic();
  const items = getRecords();
  const hasMusic = music.resident.length + music.netease.length > 0;

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      {hasMusic && (
        <Reveal delay={120} className="mt-10">
          <Turntable library={music} />
        </Reveal>
      )}

      {items.length > 0 && (
        <div className="mt-[72px]">
          <Reveal>
            <SectionTitle title={t("wall.title")} note={t("wall.note")} />
          </Reveal>
          <Reveal delay={120} className="mt-7">
            <RecordShelf
              items={items}
              locale={locale}
              labels={{ album: t("wall.kindAlbum"), artist: t("wall.kindArtist") }}
            />
          </Reveal>
        </div>
      )}

      <Reveal>
        <FootNote>{t("footnote")}</FootNote>
      </Reveal>
    </>
  );
}
