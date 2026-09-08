import type { ReactNode } from "react";
import { localized } from "@/lib/format";
import type { Project } from "@/lib/types";

/**
 * 「我做的」那一栏的项目卡 —— 2026-09-08 从列表行（ui/ListRow）换过来的。
 *
 * 理由：站主自己的项目只有三个，它们是整个站最该被看见的东西，
 * 被压成和「用到的开源」那 12 条一模一样的行，等于把主角和配角排成一样大。
 * 开源那一栏仍然是列表 —— 那本来就是一份清单。
 *
 * 卡面上那个巨大的编号是**淡出去的底纹**（line-strong，不是主文字色），
 * 和首页「在做的」那三行的 01/02/03 是同一个手势；hover 时它加深一档，
 * 是这张卡唯一会动的地方 —— 卡本身不上浮不投影，页面上已经有够多会动的东西了。
 */
export function ProjectCard({
  project,
  index,
  locale,
  repoLabel,
  noLinkLabel,
}: {
  project: Project;
  /** 从 0 开始，卡面上显示成 01 / 02 / 03 */
  index: number;
  locale: string;
  repoLabel: string;
  noLinkLabel: string;
}) {
  const name = localized(locale, project.name, project.name_en);
  const desc = localized(locale, project.desc, project.desc_en);
  const no = String(index + 1).padStart(2, "0");

  /** 有线上地址就让标题可点，没有就是纯文字 —— 不给死链 */
  const title: ReactNode = project.link ? (
    <a
      href={project.link}
      target="_blank"
      rel="noreferrer noopener"
      className="border-b border-ink pb-0.5 transition-colors hover:border-line-strong"
    >
      {name} ↗
    </a>
  ) : (
    name
  );

  return (
    <article className="card-face group relative flex flex-col gap-4 overflow-hidden p-7 sm:p-8">
      {/* 编号底纹。绝对定位到右上角、被卡面裁掉一角，所以它是「纹」不是「字」 */}
      <span
        className="pointer-events-none absolute -top-3 right-4 font-serif text-[76px] leading-none font-light text-line-strong/45 transition-colors duration-500 select-none group-hover:text-line-strong/80 sm:-top-4 sm:text-[92px]"
        aria-hidden
      >
        {no}
      </span>

      <div className="relative flex items-baseline gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-faint tabular-nums">
          {project.year}
        </span>
        {project.status && (
          <span className="text-[10.5px] tracking-(--tracking-label) text-faint uppercase">
            {localized(locale, project.status, project.status_en)}
          </span>
        )}
      </div>

      <h3 className="relative max-w-[80%] text-[19px] leading-[1.4] text-ink">{title}</h3>

      <p className="relative text-[13.5px] leading-[1.85] text-muted">{desc}</p>

      <div className="relative mt-auto flex flex-wrap items-center gap-2.5 pt-2 text-[10.5px] tracking-[0.1em] text-faint">
        {project.stack?.map((tech) => (
          <span key={tech} className="tag-framed">
            {tech}
          </span>
        ))}
        {project.repo && (
          <a
            href={project.repo}
            target="_blank"
            rel="noreferrer noopener"
            className="border-b border-line-strong pb-px transition-colors hover:border-ink hover:text-ink"
          >
            {repoLabel} ↗
          </a>
        )}
        {!project.link && !project.repo && <span>{noLinkLabel}</span>}
      </div>
    </article>
  );
}
