import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 内容页「列表行」模式（对照 design-v2/ContentTemplate.dc.html §②）：
 * 白卡面容器（`ListRowGroup`）里一行行铺开，每行左列窄（日期/来源/年份这类短标签），
 * 中间标题 + 描述，右侧一个带框标签。文章、新闻、书影音、项目列表共用这一对组件，
 * 不再各写各的行样式——但每页各自的交互（筛选、年份分隔行等）仍在各自组件里，
 * 这里只负责「一行长什么样」。
 */
export function ListRowGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card-face flex flex-col ${className}`}>{children}</div>;
}

export function ListRow({
  href,
  external,
  left,
  title,
  desc,
  right,
  footer,
  last = false,
}: {
  /** 有值就整行可点；不传就是普通展示行 */
  href?: string;
  /** true 用 <a target=_blank>（新闻这类外链），false/省略用 next/link（站内页面） */
  external?: boolean;
  /** 左列窄标签：日期 / 来源 / 年份 */
  left?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  /** 右侧带框标签（tag-framed），比如文章类型、书影音评分 */
  right?: ReactNode;
  /** 描述下面再挂一行的内容（比如博客的多个标签 chip + 阅读时长） */
  footer?: ReactNode;
  /** 最后一行不画底部分隔线 */
  last?: boolean;
}) {
  const row = (
    <div
      className={`flex flex-col gap-2 px-5 py-4 sm:grid sm:grid-cols-[104px_1fr_auto] sm:items-baseline sm:gap-[26px] sm:px-6 sm:py-5 ${
        last ? "" : "border-b border-line-soft"
      }`}
    >
      <span className="text-[12.5px] whitespace-nowrap text-faint sm:pt-0.5">{left}</span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[15.5px] text-ink">{title}</span>
        {desc && <span className="text-[13.5px] leading-[1.7] text-muted">{desc}</span>}
        {footer}
      </div>
      {right && <span className="tag-framed self-start sm:justify-self-end">{right}</span>}
    </div>
  );

  if (!href) return row;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="group block transition-colors hover:bg-paper"
      >
        {row}
      </a>
    );
  }

  return (
    <Link href={href} className="group block transition-colors hover:bg-paper">
      {row}
    </Link>
  );
}
