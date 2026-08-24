"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * 「写邮件 / 复制地址」两个按钮 —— 对照 docs/design/BlogContact.dc.html 下半。
 * 复制成功后右边浮出「已复制 ✓」，两秒后消失。
 */
export function EmailActions({ email }: { email: string }) {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // 剪贴板权限被拒（多见于 http 环境）：退回选中文本让用户自己复制
      window.prompt(tc("copy"), email);
    }
  };

  return (
    <div className="mt-[22px] flex flex-wrap items-center gap-[11px]">
      <a
        href={`mailto:${email}`}
        className="border border-ink bg-ink px-[26px] py-3.5 text-[13.5px] tracking-[0.04em] text-paper transition-colors hover:bg-body"
      >
        {t("write")}
      </a>
      <button
        type="button"
        onClick={copy}
        className="border border-line bg-card px-[26px] py-3.5 text-[13.5px] tracking-[0.04em] text-ink transition-colors hover:border-ink"
      >
        {tc("copy")}
      </button>
      <span
        aria-live="polite"
        className={`self-center text-xs text-faint transition-opacity duration-300 ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        {tc("copied")}
      </span>
    </div>
  );
}
