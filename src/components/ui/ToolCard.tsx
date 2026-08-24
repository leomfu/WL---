import type { CSSProperties } from "react";
import { ToolIcon } from "@/components/icons/ToolIcon";
import type { Tool } from "@/lib/types";

/**
 * 工具卡片 —— 对照 docs/design/Tools.dc.html（左上角那张就是 hover 态）。
 * 图标平时黑白，hover 时亮起 brandColor：全站唯一允许出现彩色的地方（PLAN.md §5）。
 */
export function ToolCard({
  tool,
  desc,
}: {
  tool: Tool;
  desc: string;
}) {
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noreferrer noopener"
      style={{ "--brand": tool.brandColor || "#111111" } as CSSProperties}
      className="group flex items-center gap-[15px] rounded-[11px] border border-line bg-card px-[17px] py-[15px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#F0F0F0] bg-[#FBFBFB] text-ink transition-colors duration-300 group-hover:text-[var(--brand)]">
        <ToolIcon name={tool.icon} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-1">
        <span className="truncate text-[15.5px] tracking-[0.01em] text-ink">
          {tool.name}
        </span>
        <span className="truncate text-[12.5px] text-muted">{desc}</span>
      </span>
      <span className="text-sm text-[#C4C4C4] transition-colors group-hover:text-ink">↗</span>
    </a>
  );
}
