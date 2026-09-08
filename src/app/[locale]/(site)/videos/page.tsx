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

/**
 * 视频作品区 —— 数据来自 content/videos.json，播放器点击后才加载 */
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
    <div className={videos.length <= 2 ? "mx-auto w-full max-w-[960px]" : ""}>
      <PageHeader title={t("title")} lead={t("lead")} />


      {/* 条数少就单列大卡居中，多了才铺两列 —— 一条视频排成两列，右半边是空的。
          阈值写在这儿而不是写死列数：以后多发几条不用回来改代码。 */}
      <div
        className={
          videos.length <= 2
            ? "mt-11 grid grid-cols-1 gap-7"
            : "mt-11 grid grid-cols-1 gap-7 xl:grid-cols-2"
        }
      >
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
    </div>
  );
}
