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
 * 同日第三轮又加厚了一次（站主：「再加一点流转的速度，再加点交互效果，再美观一些」）：
 * 转速 60s → 42s；内圈补了 60 道反着转的刻度；节点反白时起一圈光晕；
 * 停在某个节点上时轨道整圈提亮、圆心 Logo 让位、**图下面那行说明换成这一样的介绍**。
 *
 * 这仍然是个**服务端组件，零客户端 JS**：数字（几辑、几首、几条）在构建时数好写进
 * HTML，转、hover、连那行会换的说明，全靠 CSS（`:has()` 选中鼠标停在哪根辐条上）。
 * 那一大段样式在 globals.css 末尾，改之前先读那儿的结构说明。
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
    <Reveal delay={300} className="mt-[88px] border-t border-line pt-12">
      <SectionTitle title={t("title")} note={t("hint")} />

      <div className="orbit-wrap mt-10 flex flex-col items-center">
        <div className="orbit">
          <div className="orbit-ticks" aria-hidden />
          <div className="orbit-ring" aria-hidden />

          {/* 圆心：不动的那个锚。纯装饰，所以不可点也不进无障碍树 */}
          <div className="orbit-hub" aria-hidden>
            <Image
              src={siteConfig.logo}
              alt=""
              width={34}
              height={34}
              className="orbit-hub-mark size-[26px] object-contain opacity-80 sm:size-[32px]"
            />
          </div>

          <div className="orbit-rotor">
            {nodes.map((node, i) => (
              <Link
                key={node.key}
                href={localePath(locale, node.path)}
                className="orbit-arm"
                data-k={node.key}
                style={{ "--a": ANGLES[i] } as React.CSSProperties}
              >
                <span className="orbit-spoke" aria-hidden />
                <span className="orbit-node">
                  <span className="orbit-face">
                    <span className="text-[14px] tracking-[0.04em] sm:text-[15px]">
                      {t(node.key)}
                    </span>
                    <span className="text-[10.5px] tracking-[0.12em] opacity-65">
                      {node.count}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 停在哪个圈上，这里就说哪一样。四条叠在同一格里交叉淡入，高度固定不顶页面 */}
        <div className="orbit-notes mt-9 w-full text-[13.5px] leading-[1.8] text-muted">
          <p className="orbit-note text-faint" data-k="idle">
            {t("idle")}
          </p>
          {nodes.map((node) => (
            <p key={node.key} className="orbit-note" data-k={node.key}>
              {t(`${node.key}Note`)}
            </p>
          ))}
        </div>
      </div>

      {/* 三个节点在转，读屏和「不用鼠标的人」需要一份规规矩矩的清单兜底。
          视觉上它也有用：直接说清这三条链接通向哪儿。 */}
      <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[13px]">
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
