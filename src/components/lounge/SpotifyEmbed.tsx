"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Spotify 官方嵌入的包装层 —— 存在的唯一理由是：**大陆网络根本连不上 open.spotify.com**。
 *
 * 连不上时 iframe 里会出现浏览器自己的错误页：一大块白底 + 「网址…可能暂时无法连接」。
 * 那块白在一整页黑里非常刺眼，而且访客看到只会以为是这个网站坏了。
 * 所以这里先探一次可达性，探不通就不挂 iframe，改放一张同色系的说明卡。
 *
 * 探测手法：no-cors 的 fetch。响应是 opaque（读不到内容），但**能不能连上**这件事
 * 是如实反映的 —— 连上了就 resolve（哪怕 404），DNS/连接失败或超时就 reject。
 * 正好是我们要的那个信号，且不需要对方给 CORS 头。
 *
 * 结果全页只探一次（模块级 promise）：音乐层两个歌单 + 播客层一个节目共用一个结论。
 */

const PROBE_URL = "https://open.spotify.com/favicon.ico";
const PROBE_TIMEOUT = 6000;

let probe: Promise<boolean> | null = null;

function spotifyReachable() {
  probe ??= new Promise<boolean>((resolve) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT);
    fetch(PROBE_URL, {
      mode: "no-cors",
      cache: "no-store",
      signal: abort.signal,
    })
      .then(() => resolve(true))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(timer));
  });
  return probe;
}

/** 嵌入地址 → 能在 App / 网页版打开的正常地址 */
const openUrlOf = (src: string) =>
  src.replace("/embed/", "/").split("?")[0] ?? src;

export function SpotifyEmbed({
  src,
  title,
  height,
  onFallback,
  fallbackLabel,
}: {
  src: string;
  title: string;
  height: number;
  /** 音乐层专用：一键切回站内曲库。播客层没有替代品，不传 */
  onFallback?: () => void;
  fallbackLabel?: string;
}) {
  const t = useTranslations("lounge.spotify");
  /** 以后播客位换成小宇宙之类的非 Spotify 嵌入时，不该被这个探测拦住 */
  const isSpotify = src.startsWith("https://open.spotify.com/");
  const [state, setState] = useState<"probing" | "ok" | "blocked">(
    isSpotify ? "probing" : "ok",
  );

  useEffect(() => {
    if (!isSpotify) return;
    let alive = true;
    spotifyReachable().then((ok) => {
      if (alive) setState(ok ? "ok" : "blocked");
    });
    return () => {
      alive = false;
    };
  }, [isSpotify]);

  return (
    <div className="w-full max-w-[460px] rounded-[3px] border border-shell-line-2 bg-[#0E0E0E] p-3">
      {state === "ok" ? (
        <iframe
          key={src}
          title={title}
          src={src}
          width="100%"
          height={height}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="block border-0 grayscale transition-[filter] duration-500 hover:grayscale-0"
        />
      ) : (
        /* 高度和 iframe 对齐，探测完不跳版 */
        <div
          className="flex flex-col items-center justify-center px-6 text-center"
          style={{ height }}
        >
          {state === "probing" ? (
            <span className="text-[11.5px] tracking-[0.14em] text-shell-faint">
              {t("probing")}
            </span>
          ) : (
            <>
              <span className="text-[13px] tracking-[0.06em] text-shell-dim">
                {t("blockedTitle")}
              </span>
              <p className="mt-3 max-w-[300px] text-[11.5px] leading-[1.9] text-shell-faint">
                {t("blockedBody")}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={openUrlOf(src)}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-white/15 px-4 py-2.5 text-[12.5px] tracking-[0.06em] text-shell-dim transition-colors hover:border-white/35 hover:text-shell-ink"
                >
                  {t("open")}
                </a>
                {onFallback && fallbackLabel && (
                  <button
                    type="button"
                    onClick={onFallback}
                    className="border border-white/15 px-4 py-2.5 text-[12.5px] tracking-[0.06em] text-shell-dim transition-colors hover:border-white/35 hover:text-shell-ink"
                  >
                    {fallbackLabel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
