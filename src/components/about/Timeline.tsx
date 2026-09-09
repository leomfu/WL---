import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { localized } from "@/lib/format";
import type { TimelineEntry } from "@/lib/types";

/**
 * 关于页那条履历 —— content/about/timeline.json，一格一年。
 *
 * 摆在关于页的**右栏**（300px，sticky），所以这里的字号和间距都是按窄栏调的：
 * 年份 11px、标题 14.5px、说明 12.5px。搬到宽处用要重新调，别直接照搬。
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
    <Reveal delay={240}>
      {/* 右栏顶上一道细线 + 小标签，和左边正文的第一行齐平 */}
      <div className="flex items-baseline gap-3 border-b border-line pb-3">
        <span className="text-[10.5px] tracking-(--tracking-label) text-faint">
          {t("title")}
        </span>
        <span className="text-[11.5px] text-faint">{t("note")}</span>
      </div>

      <ol className="mt-7">
        {entries.map((entry, i) => {
          const last = i === entries.length - 1;
          /* key 带上序号：同一个 YYYY.MM 出现两条时，光用年份会撞 */
          return (
            <li key={`${entry.year}-${i}`} className="relative flex gap-4">
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

              <div className={last ? "pb-0" : "pb-7"}>
                <span className="font-mono text-[11px] tracking-[0.12em] text-faint tabular-nums">
                  {entry.year}
                </span>
                <h3 className="mt-1 text-[14.5px] leading-[1.5] text-ink">
                  {localized(locale, entry.title, entry.titleEn)}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-[1.8] text-muted">
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
