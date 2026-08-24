"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { siteConfig } from "~/site.config";

/**
 * giscus 评论 —— 数据存在 GitHub 仓库的 Discussions 里，所以静态站也能有评论。
 * 前提：仓库 public + 开启 Discussions + 装好 giscus app（见 docs/进度.md）。
 * 四个 id 没填就显示一行说明，不插脚本。
 */
export function Giscus({ term }: { term: string }) {
  const t = useTranslations("giscus");
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);

  const { repo, repoId, category, categoryId, theme } = siteConfig.giscus;
  const configured = Boolean(repo && repoId && categoryId);

  useEffect(() => {
    if (!configured || !host.current) return;
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
  }, [category, categoryId, configured, locale, repo, repoId, term, theme]);

  if (!configured) {
    return (
      <p className="border border-dashed border-line bg-card px-5 py-4 text-[13px] leading-[1.8] text-muted">
        {t("notConfigured")}
      </p>
    );
  }

  return <div ref={host} className="giscus" />;
}
