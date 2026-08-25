"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "~/site.config";

/**
 * giscus 评论 —— 数据存在 GitHub 仓库的 Discussions 里，所以静态站也能有评论。
 * 前提：仓库 public + 开启 Discussions + 装好 giscus app（见 docs/素材清单.md 第四节）。
 *
 * 两点刻意的取舍：
 * - **点一下才加载**（和视频卡片同一个做法）：giscus 的 iframe 一挂上就会向 GitHub
 *   发请求、还会把评论区的高度撑开导致跳动。没人想留言的时候不该有这些。
 * - **没配好时给访客看的是「还没开放」**，不是"把 id 填进 site.config.ts"这种开发者话术。
 */
export function Giscus({ term }: { term: string }) {
  const t = useTranslations("giscus");
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const { repo, repoId, category, categoryId, theme } = siteConfig.giscus;
  const configured = Boolean(repo && repoId && categoryId);

  useEffect(() => {
    if (!configured || !open || !host.current) return;
    const mount = host.current;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.entries({
      "data-repo": repo,
      "data-repo-id": repoId,
      "data-category": category,
      "data-category-id": categoryId,
      // 一个页面固定对应一条讨论；中英文两版共用一条，留言不按语言分家
      "data-mapping": "specific",
      "data-term": term,
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": theme || "light",
      "data-lang": locale === "en" ? "en" : "zh-CN",
      "data-loading": "lazy",
    }).forEach(([key, value]) => script.setAttribute(key, value));

    mount.appendChild(script);
    return () => {
      mount.innerHTML = "";
    };
  }, [category, categoryId, configured, locale, open, repo, repoId, term, theme]);

  if (!configured) {
    return (
      <p className="border border-dashed border-line bg-card px-5 py-4 text-[13px] leading-[1.8] text-muted">
        {t("notOpenYet")}
      </p>
    );
  }

  if (!open) {
    return (
      <div className="border border-dashed border-line bg-card px-5 py-6 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border border-ink bg-ink px-[26px] py-3 text-[13.5px] tracking-[0.04em] text-paper transition-colors hover:bg-body"
        >
          {t("load")}
        </button>
        <p className="mt-3.5 text-[12px] leading-[1.8] text-muted">{t("loadHint")}</p>
      </div>
    );
  }

  /** min-height 是给 iframe 占位的，免得加载完成的一瞬间页面往下一跳 */
  return <div ref={host} className="giscus min-h-[280px]" />;
}
