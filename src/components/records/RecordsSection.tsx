import { getTranslations } from "next-intl/server";
import { Chart } from "@/components/records/Chart";
import { Turntable } from "@/components/records/Turntable";
import { FootNote } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getMusic } from "@/lib/content";

/**
 * 爱好页「唱片」那一栏 —— 原来的 /records 页整块搬过来的（2026-09-08 合并）。
 *
 * 两块：
 * ① 一台真能转、真出声的黑胶唱机（斜放在透视里，见 components/records/Turntable）；
 * ② 「按心情听」榜单：content/music/chart.json 的 4 个心情场景，整行可点 = 装到
 *    唱机上播放（见 components/records/Chart）。
 *
 * 2026-08-31 撤掉的那面「我听的」专辑墙（RecordShelf + getRecords()）仍然没删，
 * 只是不渲染；想恢复随时能接回来。
 *
 * 曲库和播放状态都在 app/[locale]/layout.tsx 的 PlayerProvider 上，
 * 这一栏只决定「有没有曲库，要不要摆这台唱机和这份榜单」。
 */
export async function RecordsSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "records" });

  const music = getMusic();
  const sceneTrackCount = music.scenes.reduce((n, s) => n + s.tracks.length, 0);
  const hasMusic = music.resident.length + sceneTrackCount > 0;

  return (
    <>
      <p className="max-w-[640px] text-[15.5px] leading-[1.8] text-muted">{t("lead")}</p>

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
