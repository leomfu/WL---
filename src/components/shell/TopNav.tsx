"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { SocialIcon } from "@/components/icons/SocialIcon";
import { NAV_HOME, NAV_TOP, localePath, type NavItem } from "@/lib/nav";
import { siteConfig } from "~/site.config";

/**
 * 顶栏 —— 2026-09-08 取代原来的左侧暗色侧边栏（components/shell/Sidebar.tsx 已删）。
 *
 * 布局：一条 64px 高的暗色横条钉在最上面，**三段式** ——
 * 左 Logo + 名字 / 中 导航 / 右 中·EN · 分隔线 · 社交图标 · ⌘K。
 * 颜色仍走侧栏时代那套 shell-* 暗侧灰阶，所以整站的黑白关系没变，
 * 只是那块暗色从左边一竖条改成了上边一横条。
 *
 * ⚠️ **导航是 `absolute left-1/2 -translate-x-1/2`，不是 flex 里的一项** ——
 * 站主要求它在**视窗正中**（2026-09-08 第二轮）。用 flex 的话它的位置会被
 * 左右两段的宽度推着走：中文和英文的名字不一样长、社交图标在 xl 才出现，
 * 三种情况下导航都会落在不同的地方。绝对居中才是真的每次都在正中间。
 * 七项导航约 380px，两侧留白在 lg（1024px）下也够，不会压到 Logo 或右边那组。
 *
 * 断点：
 *   <lg   汉堡 + 全屏抽屉（抽屉里是竖排的同一份导航 + 社交 + 语言）
 *   lg    导航平铺居中，社交图标先收起来
 *   xl    社交图标一起出来
 *
 * 顶栏是 fixed 的（不随内容滚走），页面内容由 SiteShell 用 padding-top 让位。
 */

export function TopNav() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  const [drawerOpen, setDrawerOpen] = useState(false);

  /** 抽屉打开时锁住背景滚动 */
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  /**
   * 首页要精确匹配，否则 `/zh/` 是所有路径的前缀，哪一页都会把首页也点亮。
   * 其余的用前缀匹配，好让 /blog/xxx 这样的详情页也点亮所在板块。
   */
  const isActive = (path: string) => {
    const full = localePath(locale, path);
    return path === "" ? pathname === full : pathname === full || pathname.startsWith(full);
  };

  const otherLocale = locale === "zh" ? "en" : "zh";
  /** 语言切换保持当前路径：/zh/projects/ → /en/projects/ */
  const otherLocaleHref = pathname.replace(/^\/[^/]+/, `/${otherLocale}`) || `/${otherLocale}/`;

  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  const homeHref = localePath(locale, NAV_HOME.path);

  const openPalette = () =>
    window.dispatchEvent(new CustomEvent("open-command-palette"));

  /** 一条导航项。当前项用一道下划线标出来（横排里反色底块太重） */
  const renderLink = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <Link
        key={item.key}
        href={localePath(locale, item.path)}
        aria-current={active ? "page" : undefined}
        className={[
          "relative py-1 text-[13.5px] tracking-[0.02em] transition-colors",
          active ? "text-shell-ink" : "text-shell-dim hover:text-shell-ink",
        ].join(" ")}
      >
        {t(`nav.${item.key}`)}
        {active && (
          <span className="absolute inset-x-0 -bottom-[7px] h-px bg-shell-ink" aria-hidden />
        )}
      </Link>
    );
  };

  /**
   * 中 / EN。
   * ⚠️ 当前语言那一侧的 href 是 `"#"`（空操作），**不是首页**。
   * 2026-09-09 修：搬顶栏时这里被写成了 homeHref，于是在 /zh/blog/ 上点「中」
   * 会被踢回首页 —— 语言切换是每页都可能点的东西，坏掉的是全站级功能。
   */
  const localeSwitch = (
    <span className="flex items-center gap-[7px] text-[11.5px] tracking-[0.06em]">
      <Link
        href={locale === "zh" ? "#" : otherLocaleHref}
        aria-current={locale === "zh" ? "true" : undefined}
        className={locale === "zh" ? "text-shell-ink" : "text-shell-faint hover:text-shell-ink"}
      >
        {t("common.zh")}
      </Link>
      <span className="text-[#2E2E2E]">/</span>
      <Link
        href={locale === "en" ? "#" : otherLocaleHref}
        aria-current={locale === "en" ? "true" : undefined}
        className={locale === "en" ? "text-shell-ink" : "text-shell-faint hover:text-shell-ink"}
      >
        {t("common.en")}
      </Link>
    </span>
  );

  /** 社交图标一排（顶栏里只有图标，标题在 title/aria-label 上） */
  const socialRow = (
    <div className="flex items-center gap-[18px]">
      {siteConfig.socials.map((social) => {
        const label = locale === "en" ? social.labelEn : social.label;
        const href = social.href || undefined;
        const external = Boolean(href) && !social.href.startsWith("/");

        return (
          <a
            key={social.key}
            href={href}
            title={label}
            aria-label={label}
            {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
            className={
              href
                ? "text-shell-dim transition-colors hover:text-shell-ink"
                : "cursor-default text-shell-mute"
            }
          >
            <SocialIcon name={social.key} />
          </a>
        );
      })}
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-shell-line bg-shell text-shell-ink lg:h-(--spacing-topnav)">
        <div className="relative flex h-full items-center px-5 sm:px-10">
          {/* Logo + 名字 —— 都回首页 */}
          <Link
            href={homeHref}
            aria-label={t("nav.toHome")}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="flex size-8 items-center justify-center rounded-full border border-shell-line-2 bg-[#131313] transition-colors group-hover:border-shell-line-3 lg:size-[34px]">
              <Image
                src={siteConfig.logo}
                alt={name}
                width={22}
                height={22}
                className="size-[19px] object-contain invert lg:size-[21px]"
              />
            </span>
            <span className="text-sm font-medium tracking-[0.01em] text-shell-ink transition-colors group-hover:text-shell-muted">
              {name}
            </span>
          </Link>

          {/* 导航（桌面端）—— 绝对居中，见文件顶部那段说明 */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {NAV_TOP.map(renderLink)}
          </nav>

          {/* 右侧：中/EN · 分隔线 · 社交 · ⌘K */}
          <div className="ml-auto flex shrink-0 items-center gap-5">
            <span className="hidden lg:flex">{localeSwitch}</span>
            <span className="hidden h-4 w-px bg-shell-line-2 xl:block" aria-hidden />
            <span className="hidden xl:flex">{socialRow}</span>

            <button
              type="button"
              onClick={openPalette}
              aria-label={t("common.search")}
              className="hidden rounded border border-shell-line-2 px-[7px] py-[3px] text-[10.5px] tracking-[0.06em] text-shell-faint transition-colors hover:border-shell-line-3 hover:text-shell-dim lg:block"
            >
              ⌘K
            </button>

            {/* 移动端：搜索 + 汉堡 */}
            <button
              type="button"
              onClick={openPalette}
              aria-label={t("common.search")}
              className="flex size-9 items-center justify-center text-shell-dim lg:hidden"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.menu")}
              className="-mr-1 flex size-9 items-center justify-center text-shell-ink lg:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* ---------- 移动端：全屏抽屉 ---------- */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.24 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-shell text-shell-ink lg:hidden"
          >
            <div className="flex h-14 items-center justify-between px-5">
              <span className="text-sm font-medium">{name}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("nav.close")}
                className="-mr-2 flex size-10 items-center justify-center text-shell-dim"
              >
                <CloseIcon />
              </button>
            </div>

            <nav
              className="flex flex-col px-5 pt-4"
              onClick={() => setDrawerOpen(false)}
            >
              {NAV_TOP.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.key}
                    href={localePath(locale, item.path)}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "border-b border-shell-line py-[15px] font-serif text-[22px] font-light transition-colors",
                      active ? "text-shell-ink" : "text-shell-dim hover:text-shell-ink",
                    ].join(" ")}
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-6 px-5 py-8">
              <div className="text-[10.5px] tracking-(--tracking-label) text-shell-faint">
                {t("nav.connect")}
              </div>
              {socialRow}
              <div className="pt-2">{localeSwitch}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="9" cy="9" r="5.6" />
      <path d="m13.3 13.3 3.2 3.2" />
    </svg>
  );
}
