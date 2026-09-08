import { getTranslations } from "next-intl/server";
import { SectionTitle } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { localized } from "@/lib/format";
import type { TimelineEntry } from "@/lib/types";

/**
 * 关于页那条履历 —— content/about/timeline.json，一格一年。
 *
 * 一条竖线串起来，每格左边一个空心点、点在线上。**最后一格的点是实心的**：
 * 那是「现在停在这儿」的意思，不是装饰。竖线只画到最后一个点为止（不往下拖一截），
 * 所以这条线是有终点的，读起来是「到此为止」而不是「还有下文没显示」。
 *
 * 顺序完全照 json，这里不排序 —— 见 lib/content.ts 的 getTimeline。
 */
export async function Timeline({
  locale,
  entries,
}: {
  locale: string;
  entries: TimelineEntry[];
}) {
  if (entries.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "about.timeline" });

  return (
    <Reveal delay={240} className="mt-[88px] border-t border-line pt-12">
      <SectionTitle title={t("title")} note={t("note")} />

      <ol className="mt-8">
        {entries.map((entry, i) => {
          const last = i === entries.length - 1;
          return (
            <li key={entry.year} className="relative flex gap-6 sm:gap-8">
              {/* 点 + 竖线那一列。竖线画在「不是最后一格」的行上，所以自然停在末点 */}
              <div className="relative flex w-[9px] shrink-0 justify-center pt-[7px]">
                <span
                  className={[
                    "z-[1] size-[9px] shrink-0 rounded-full border transition-colors",
                    last
                      ? "border-ink bg-ink"
                      : "border-line-strong bg-paper",
                  ].join(" ")}
                  aria-hidden
                />
                {!last && (
                  <span
                    className="absolute top-[7px] bottom-0 left-1/2 w-px -translate-x-1/2 bg-line"
                    aria-hidden
                  />
                )}
              </div>

              <div className={last ? "pb-0" : "pb-9"}>
                <span className="font-mono text-[11.5px] tracking-[0.12em] text-faint tabular-nums">
                  {entry.year}
                </span>
                <h3 className="mt-1.5 text-[15.5px] text-ink">
                  {localized(locale, entry.title, entry.titleEn)}
                </h3>
                <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-[1.85] text-muted">
                  {localized(locale, entry.detail, entry.detailEn)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Reveal>
  );
}
