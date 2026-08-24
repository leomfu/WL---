import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** 页面大标题：细衬线 46px + 一行引导语（对照各画板顶部） */
export function PageHeader({
  title,
  lead,
}: {
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <Reveal>
      <h1 className="font-serif text-[34px] leading-[1.3] font-light tracking-[-0.01em] text-ink sm:text-[46px]">
        {title}
      </h1>
      {lead && (
        <p className="mt-3.5 text-[15.5px] leading-[1.8] text-muted">{lead}</p>
      )}
    </Reveal>
  );
}

/** 板块小标题：18px 中等字重 + 右侧灰色注记（首页「现在是 · 2026 年 8 月」） */
export function SectionTitle({
  title,
  note,
}: {
  title: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3.5">
      <h2 className="text-lg font-medium tracking-[0.01em] text-ink">{title}</h2>
      {note && <span className="text-[13px] text-faint">{note}</span>}
    </div>
  );
}

/** 内容区页脚：上细线 + 左侧一句话 + 右侧版权 */
export function ContentFooter({
  note,
  copyright,
}: {
  note: ReactNode;
  copyright: string;
}) {
  return (
    <div className="mt-[88px] flex flex-col gap-3 border-t border-line pt-[26px] text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>{note}</span>
      <span className="text-xs text-faint">{copyright}</span>
    </div>
  );
}

/** 一句话说明用的小注记行：短横线 + 灰字（工具页底部那行） */
export function FootNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-14 flex items-center gap-2.5 border-t border-line pt-6 text-[12.5px] text-faint">
      <span className="h-px w-[22px] shrink-0 bg-line" />
      {children}
    </div>
  );
}
