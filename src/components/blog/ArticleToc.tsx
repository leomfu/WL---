"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Heading } from "@/lib/markdown";

/**
 * 长文侧边目录（xl 以上才出现，窄屏不显示 —— 700px 内容列两侧才有位置）。
 * 当前小节靠 IntersectionObserver 高亮。
 */
export function ArticleToc({ headings }: { headings: Heading[] }) {
  const t = useTranslations("blog");
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="sticky top-[104px] flex flex-col gap-3">
      <span className="text-[10px] tracking-(--tracking-label) text-faint">
        {t("toc")}
      </span>
      <nav className="flex flex-col gap-2 border-l border-line pl-3.5">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={[
              "text-[12.5px] leading-[1.5] transition-colors",
              heading.depth === 3 ? "pl-3" : "",
              active === heading.id ? "text-ink" : "text-faint hover:text-muted",
            ].join(" ")}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
