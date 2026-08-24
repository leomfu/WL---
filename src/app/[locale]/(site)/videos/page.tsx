import { getTranslations, setRequestLocale } from "next-intl/server";
import { VideoCard } from "@/components/media/VideoCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getVideos } from "@/lib/content";
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
  return pageMetadata(locale, "videos", "/videos");
}

/** 视频作品区 —— 数据来自 content/videos.json，播放器点击后才加载 */
export default async function VideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("videos");
  const videos = getVideos();

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      <div className="mt-11 flex flex-col gap-7">
        {videos.length === 0 && (
          <Reveal delay={120}>
            <p className="text-base leading-[1.9] text-muted">{t("empty")}</p>
          </Reveal>
        )}
        {videos.map((video, i) => (
          <Reveal key={`${video.platform}-${video.id}`} delay={120 + i * 90}>
            <VideoCard video={video} />
          </Reveal>
        ))}
      </div>
    </>
  );
}
