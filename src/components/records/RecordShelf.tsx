import Image from "next/image";
import { localized } from "@/lib/format";
import type { RecordItem } from "@/lib/types";

/**
 * 「我听的」——一面专辑/歌手墙。数据在 content/music/records.json，组件不写死任何一条。
 *
 * 封面是**内容图片**，所以允许有颜色（和视频封面同一个先例）；但默认还是按全站的做法
 * 去色，鼠标移上去才还原 —— 这样一整面墙远看仍是黑白的，凑近了才亮起来。
 *
 * 封面文件都在站内（public/images/records/，由 scripts/fetch-record-covers.mjs 下载），
 * 不热链网易云的图床。没有封面的条目走下面那个纯文字唱片套，
 * **不会因为图挂了就缺一块** —— 这是刻意的降级路径，别改成「图裂了显示 alt」。
 */
export function RecordShelf({
  items,
  locale,
  labels,
}: {
  items: RecordItem[];
  locale: string;
  labels: { album: string; artist: string };
}) {
  if (items.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-6">
      {items.map((item) => {
        const title = localized(locale, item.title, item.titleEn);
        const artist = item.artist
          ? localized(locale, item.artist, item.artistEn)
          : labels.artist;
        const note = item.note
          ? localized(locale, item.note, item.noteEn)
          : undefined;

        const sleeve = item.cover ? (
          <Image
            src={item.cover}
            alt=""
            width={480}
            height={480}
            sizes="(min-width: 640px) 220px, 45vw"
            className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 group-hover:grayscale-0"
            aria-hidden
          />
        ) : (
          /* 没有封面：一张素唱片套。碟片从套子里露出来一角 */
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-paper">
            <span
              className="absolute -right-[18%] size-[76%] rounded-full border border-line"
              aria-hidden
            />
            <span
              className="absolute -right-[18%] size-[26%] rounded-full border border-line"
              aria-hidden
            />
            <span className="relative px-4 text-center font-serif text-[15px] leading-[1.4] font-light text-ink">
              {title}
            </span>
          </div>
        );

        const card = (
          <>
            <div className="aspect-square overflow-hidden border border-line bg-card">
              {sleeve}
            </div>
            <div className="mt-3">
              <p className="text-[13.5px] leading-[1.5] text-ink">{title}</p>
              <p className="mt-1 text-[12px] text-faint">
                {artist}
                {item.year && (
                  <span className="ml-2 tabular-nums">{item.year}</span>
                )}
              </p>
              {note && (
                <p className="mt-1.5 text-[11.5px] leading-[1.7] text-muted">
                  {note}
                </p>
              )}
            </div>
          </>
        );

        return (
          <li key={item.id}>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group block"
                aria-label={`${title} · ${artist} · ${item.kind === "album" ? labels.album : labels.artist}`}
              >
                {card}
              </a>
            ) : (
              <div className="group">{card}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
