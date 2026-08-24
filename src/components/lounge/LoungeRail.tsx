"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { NavIcon } from "@/components/icons/NavIcon";
import { NAV_ITEMS, localePath, type NavKey } from "@/lib/nav";
import { siteConfig } from "~/site.config";

/**
 * 沉浸模式的左侧图标条 —— 对照 docs/design/Lounge.dc.html 左栏：
 * 64px 宽，只有 Logo + 图标导航，底部竖排「ESC 退出沉浸」。
 * 鼠标移到左侧或按 ESC 时展开成完整侧栏（expanded 由页面控制）。
 */
export function LoungeRail({ expanded }: { expanded: boolean }) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <motion.aside
      animate={{ width: expanded ? 264 : 64 }}
      transition={{ duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative z-20 flex shrink-0 flex-col items-center gap-6 overflow-hidden border-r border-[#171717] bg-shell py-6"
    >
      <Link
        href={localePath(locale, "/home")}
        className={`flex w-full items-center gap-3 ${expanded ? "px-6" : "justify-center"}`}
      >
        <Image
          src={siteConfig.logo}
          alt={locale === "en" ? siteConfig.nameEn : siteConfig.name}
          width={26}
          height={26}
          className="size-[26px] shrink-0 object-contain opacity-85 invert"
        />
        {expanded && (
          <span className="truncate text-sm text-shell-ink">
            {locale === "en" ? siteConfig.nameEn : siteConfig.name}
          </span>
        )}
      </Link>

      <nav className="flex w-full flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.key === "lounge";
          return (
            <Link
              key={item.key}
              href={localePath(locale, item.path)}
              title={t(`nav.${item.key}`)}
              className={[
                "flex h-10 items-center gap-3 transition-colors",
                expanded ? "px-6" : "justify-center",
                active ? "text-shell-ink" : "text-[#2E2E2E] hover:text-shell-dim",
              ].join(" ")}
            >
              <NavIcon name={item.key as NavKey} />
              {expanded && <span className="text-sm">{t(`nav.${item.key}`)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="rounded border border-shell-line-2 px-1.5 py-1 text-[9.5px] tracking-[0.08em] text-shell-faint">
          ESC
        </span>
        <span
          className="text-[9px] tracking-[0.12em] text-[#3A3A3A]"
          style={expanded ? undefined : { writingMode: "vertical-rl" }}
        >
          {t("lounge.exit")}
        </span>
      </div>
    </motion.aside>
  );
}
