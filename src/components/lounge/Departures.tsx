"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { C, Hub, TickMarks, handPoints } from "./dial";
import { siteConfig } from "~/site.config";

/**
 * 放松区第三层「时刻表」—— 这一层不播放任何东西，它的全部作用是**离开这里**。
 *
 * 原来这个位置是 Spotify 的嵌入播放器。撤掉的理由：正版流媒体不可能给出
 * 能塞进 <audio> 的直链（授权条款只认「听众自己有订阅」或「播放全程在他们的播放器里」），
 * 所以嵌入永远是别人的白色方框，大陆还连不上，在这一整页黑里怎么摆都别扭。
 * 与其把一个残废的播放器伪装成一层，不如老实承认：这些东西在别处。
 *
 * 于是这一层重做成车站时刻表 —— 时刻表本来就是「时间的表格」，
 * 而它的唯一用途就是告诉你从这里能去哪儿，和这一层的处境严丝合缝。
 *
 * 中心那块站台钟走的是**真实的当前时间**，和音乐层形成对照：
 * 音乐层的指针走「这首歌的时间」，这里的指针走「现实的时间」——
 * 你到了这一层，就是要回到现实、准备离开了。
 *
 * 指针角度和数字都是挂载后用 ref 直接写 DOM 的（和开场页 TimeDial 同一套做法）：
 * 服务端不知道用户此刻几点，首帧一律渲染占位，hydration 不会 mismatch，
 * 之后每秒对一次时也不触发 React 重渲染。
 */

/** 首帧固定角度：10:09:36，钟表广告里那个对称的经典姿势 */
const IDLE = { hour: 304.8, minute: 57.6, second: 216 } as const;

/** 减少动态效果时不每秒走针，20 秒对一次 */
const STILL_TICK_MS = 20_000;

const two = (n: number) => String(n).padStart(2, "0");

export function Departures({ reduced }: { reduced: boolean }) {
  const t = useTranslations("lounge.departures");
  const locale = useLocale();
  const en = locale === "en";

  const hourRef = useRef<SVGGElement | null>(null);
  const minuteRef = useRef<SVGGElement | null>(null);
  const secondRef = useRef<SVGGElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const write = () => {
      const now = new Date();
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();

      hourRef.current?.setAttribute(
        "transform",
        `rotate(${(h + m / 60) * 30} ${C} ${C})`,
      );
      minuteRef.current?.setAttribute(
        "transform",
        `rotate(${(m + s / 60) * 6} ${C} ${C})`,
      );
      secondRef.current?.setAttribute("transform", `rotate(${s * 6} ${C} ${C})`);
      if (textRef.current) {
        textRef.current.textContent = `${two(now.getHours())}:${two(m)}:${two(s)}`;
      }
    };

    write();
    const timer = setInterval(write, reduced ? STILL_TICK_MS : 1000);
    return () => clearInterval(timer);
  }, [reduced]);

  const departures = siteConfig.lounge.departures;

  return (
    <div className="flex w-full flex-col items-center gap-9">
      {/* 站台钟 */}
      <div className="flex flex-col items-center gap-3.5">
        <div className="relative size-[clamp(112px,17vmin,148px)]">
          <svg
            viewBox={`0 0 ${200} ${200}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            <circle
              cx={C}
              cy={C}
              r={95}
              fill="none"
              stroke="rgba(237,237,237,0.2)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <TickMarks />

            <g ref={hourRef} transform={`rotate(${IDLE.hour} ${C} ${C})`}>
              <polygon points={handPoints(48, 1.6, 13)} fill="#EDEDED" opacity={0.9} />
            </g>
            <g ref={minuteRef} transform={`rotate(${IDLE.minute} ${C} ${C})`}>
              <polygon points={handPoints(72, 1.15, 15)} fill="#EDEDED" opacity={0.92} />
            </g>
            {/* 减少动态效果时不显示秒针 —— 每 20 秒跳一下比不动更烦人 */}
            {!reduced && (
              <g ref={secondRef} transform={`rotate(${IDLE.second} ${C} ${C})`}>
                <line
                  x1={C}
                  y1={C + 18}
                  x2={C}
                  y2={C - 80}
                  stroke="rgba(237,237,237,0.45)"
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
            <Hub r={3.6} />
          </svg>
        </div>

        <span
          ref={textRef}
          className="font-mono text-[19px] tracking-[0.14em] text-shell-ink tabular-nums sm:text-[21px]"
        >
          --:--:--
        </span>
        <span className="text-[10px] tracking-[0.26em] text-shell-faint uppercase">
          {t("nowLabel")}
        </span>
      </div>

      {/* 时刻表本体 —— 一行一个去处，加去处就在 site.config 的 departures 里加一行 */}
      <ul className="w-full max-w-[440px] border-t border-shell-line-2">
        {departures.map((item) => (
          <li
            key={item.url}
            className="group flex items-baseline border-b border-shell-line-2"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex grow items-baseline gap-5 py-4 sm:gap-7"
            >
              <span className="w-[4.6rem] shrink-0 text-[9.5px] tracking-[0.24em] text-shell-faint uppercase transition-colors group-hover:text-shell-dim sm:w-[5.4rem]">
                {en ? item.platformEn : item.platform}
              </span>
              <span className="grow text-[15px] tracking-[0.04em] text-shell-dim transition-colors group-hover:text-shell-ink">
                {en ? item.labelEn : item.label}
              </span>
              <span
                className="shrink-0 text-[12px] text-shell-faint transition-all duration-300 group-hover:translate-x-[3px] group-hover:text-shell-ink"
                aria-hidden
              >
                ↗
              </span>
            </a>

            {/* 直接交给 App 打开。大陆网络下网页版常常连不上，这条往往是唯一通的 */}
            {"appUrl" in item && item.appUrl && (
              <a
                href={item.appUrl}
                className="shrink-0 py-4 pl-5 text-[10px] tracking-[0.16em] text-[#3E3E3E] uppercase transition-colors hover:text-shell-ink"
              >
                {t("openApp")}
              </a>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[11px] leading-[1.9] tracking-[0.06em] text-shell-faint">
          {t("note")}
        </p>
        <p className="max-w-[420px] text-center text-[10.5px] leading-[1.8] text-[#3E3E3E]">
          {t("appNote")}
        </p>
      </div>
    </div>
  );
}
