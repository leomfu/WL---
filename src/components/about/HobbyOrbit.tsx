import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SectionTitle } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getLibrary, getMusic } from "@/lib/content";
import { localePath } from "@/lib/nav";
import { getAlbums } from "@/lib/photos";
import { siteConfig } from "~/site.config";

/**
 * 关于页下半那张「我的爱好」同心轨道图。
 *
 * 2026-09-08 站主的原话：「将爱好结合到关于的板块里面。设计一个交互动态。
 * 爱好相互连接的互动的感觉效果。可以进行点击跳转爱好里的页面。」
 * 选的是同心轨道：圆心是他的 Logo，三个爱好在同一条轨道上慢慢公转，
 * 各有一根辐条连回圆心 —— 三样东西是**同一个人身上长出来的**，这是这张图要说的话。
 * 和唱片页那张黑胶、番茄钟原来那只表盘同属一套圆形语言，不是另起一个视觉。
 *
 * 这是个**服务端组件**：数字（几辑照片、几首歌、几条书影音）在构建时数好写进 HTML，
 * 转和 hover 全是 CSS（见 globals.css 末尾那一大段），一行客户端 JS 都不用发。
 *
 * 三个节点是真链接（`<Link>`），所以：右键新标签页打开、键盘 Tab 过去回车、
 * 爬虫抓到三条内链 —— 都成立。别改成 onClick 跳转。
 */

/** 三根辐条的角度。0deg 指向 6 点钟方向（辐条是从圆心往下画的），所以 180 是正上方 */
const ANGLES = ["180deg", "300deg", "60deg"] as const;

export async function HobbyOrbit({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "about.orbit" });

  const music = getMusic();
  const trackCount =
    music.resident.length + music.scenes.reduce((n, s) => n + s.tracks.length, 0);

  const nodes = [
    { key: "photos", path: "/photos", count: t("photosCount", { n: getAlbums().length }) },
    { key: "records", path: "/records", count: t("recordsCount", { n: trackCount }) },
    { key: "library", path: "/library", count: t("libraryCount", { n: getLibrary().length }) },
  ] as const;

  return (
    <Reveal delay={180} className="mt-[88px] border-t border-line pt-12">
      <SectionTitle title={t("title")} note={t("hint")} />
      <p className="mt-3 max-w-[560px] text-[14px] leading-[1.85] text-muted">{t("note")}</p>

      <div className="mt-10 flex justify-center sm:mt-12">
        <div className="orbit">
          <div className="orbit-ring" aria-hidden />

          {/* 圆心：不动的那个锚。纯装饰，所以不可点也不进无障碍树 */}
          <div className="orbit-hub" aria-hidden>
            <Image
              src={siteConfig.logo}
              alt=""
              width={34}
              height={34}
              className="size-[26px] object-contain opacity-80 sm:size-[32px]"
            />
          </div>

          <div className="orbit-rotor">
            {nodes.map((node, i) => (
              <Link
                key={node.key}
                href={localePath(locale, node.path)}
                className="orbit-arm"
                style={{ "--a": ANGLES[i] } as React.CSSProperties}
              >
                <span className="orbit-spoke" aria-hidden />
                <span className="orbit-node">
                  <span className="orbit-face">
                    <span className="text-[14px] tracking-[0.04em] sm:text-[15px]">
                      {t(node.key)}
                    </span>
                    <span className="text-[10.5px] tracking-[0.1em] opacity-60">
                      {node.count}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 三个节点在转，读屏和「不用鼠标的人」需要一份规规矩矩的清单兜底。
          视觉上它也有用：直接说清这三条链接通向哪儿。 */}
      <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[13px] sm:mt-12">
        {nodes.map((node) => (
          <li key={node.key}>
            <Link
              href={localePath(locale, node.path)}
              className="link-underline text-muted transition-colors hover:text-ink"
            >
              {t(node.key)} <span className="text-faint">· {node.count} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
