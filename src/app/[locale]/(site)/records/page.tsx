import { getTranslations, setRequestLocale } from "next-intl/server";
import { Chart } from "@/components/records/Chart";
import { Turntable } from "@/components/records/Turntable";
import { FootNote, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getMusic } from "@/lib/content";
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
 * ① 一台真能转、真出声的黑胶唱机（斜放在透视里，见 components/records/Turntable）；
 * ② 「按心情听」榜单：content/music/chart.json 的 4 个心情场景，铺开显示、整行可点=装到
 *    唱机上播放（见 components/records/Chart）。
 *
 * 2026-08-31：**撤掉了原来那面「我听的」专辑墙**（RecordShelf + getRecords()）——
 * 新榜单有封面、能试听、还能跳平台，覆盖了专辑墙的作用且更好，同一页两块重复内容
 * 没有意义。`content/music/records.json` 和 `npm run records` 脚本**没有删**（在
 * docs/进度.md 里记了），只是这页不再渲染 RecordShelf；`RecordShelf.tsx`、
 * `getRecords()`、`RecordItem` 类型也都留着，想恢复随时能接回来。
 *
 * 曲库和播放状态都在 app/[locale]/layout.tsx 的 PlayerProvider 上，
 * 这一页只决定「有没有曲库，要不要摆这台唱机和这份榜单」。
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
  const sceneTrackCount = music.scenes.reduce((n, s) => n + s.tracks.length, 0);
  const hasMusic = music.resident.length + sceneTrackCount > 0;

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      {hasMusic && (
        <Reveal delay={120} className="mt-10">
          <Turntable />
        </Reveal>
      )}

      {sceneTrackCount > 0 && (
        <Reveal delay={160} className="mt-[72px]">
          <Chart scenes={music.scenes} />
        </Reveal>
      )}

      <Reveal>
        <FootNote>{t("footnote")}</FootNote>
      </Reveal>
    </>
  );
}
