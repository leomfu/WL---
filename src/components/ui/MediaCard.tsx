import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 内容页「图片卡」模式（对照 design-v2/ContentTemplate.dc.html §③）：
 * 白卡面 + 1px 灰边，图片区在上、信息区在下。摄影、视频、唱片封面这类内容图片
 * 共用这一个外壳——图片保持原色（CLAUDE.md 明确豁免的那条），框、标签、文字仍是黑白。
 * `media` 整块由调用方自己画（<Image>、播放按钮遮罩、iframe 都行），
 * 这里只负责外壳的白卡边框、留白和标题/描述这几行的排版。
 */
export function MediaCard({
  media,
  title,
  meta,
  desc,
  footer,
  href,
  external,
  aspect = "3 / 2",
  className = "",
}: {
  media: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  desc?: ReactNode;
  /** 描述下面再挂一行（比如视频卡片"在 B 站上看"那个外链） */
  footer?: ReactNode;
  href?: string;
  external?: boolean;
  /** CSS aspect-ratio 值，摄影/唱片封面用默认的 3/2，视频用 16/9 */
  aspect?: string;
  className?: string;
}) {
  const card = (
    <div className={`card-face flex flex-col overflow-hidden ${className}`}>
      <div className="relative w-full overflow-hidden bg-line" style={{ aspectRatio: aspect }}>
        {media}
      </div>
      <div className="flex flex-col gap-2 px-[18px] py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15.5px] text-ink">{title}</span>
          {meta && <span className="shrink-0 text-xs text-faint">{meta}</span>}
        </div>
        {desc && <span className="text-[13.5px] leading-[1.7] text-muted">{desc}</span>}
        {footer}
      </div>
    </div>
  );

  if (!href) return card;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="group block">
        {card}
      </a>
    );
  }

  return (
    <Link href={href} className="group block">
      {card}
    </Link>
  );
}
