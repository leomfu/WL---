"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { NavIcon } from "@/components/icons/NavIcon";
import { SocialIcon } from "@/components/icons/SocialIcon";
import { NAV_GROUPS, NAV_HOME, localePath, type NavKey } from "@/lib/nav";
import { useStoredState } from "@/lib/useStoredState";
import { siteConfig } from "~/site.config";

/**
 * 左侧暗色侧边栏 —— 对照 docs/design/Main.dc.html 左栏。
 * 桌面端 264px 常驻，点 ‹ 收成 64px 图标条（记在 localStorage）；
 * 视觉稿没画移动端，这里收成顶部条 + 全屏抽屉，复用同一份内容（PLAN.md §4）。
 */

const COLLAPSE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  const [storedCollapsed, setStoredCollapsed] = useStoredState(COLLAPSE_KEY, "0");
  const collapsed = storedCollapsed === "1";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleCollapsed = () => setStoredCollapsed(collapsed ? "0" : "1");

  /** 抽屉打开时锁住背景滚动 */
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const isActive = (path: string) => {
    const full = localePath(locale, path);
    return pathname === full || pathname.startsWith(full);
  };

  const otherLocale = locale === "zh" ? "en" : "zh";
  /** 语言切换保持当前路径：/zh/projects/ → /en/projects/ */
  const otherLocaleHref = pathname.replace(/^\/[^/]+/, `/${otherLocale}`) || `/${otherLocale}/`;

  /**
   * 点 Logo 回开场页。用原生 <a> 走整页跳转（不是 next/link 的软跳转）：
   * 开场页那两道「本次会话看过就跳走」的拦截里，有一道是 HTML 解析阶段的内联脚本，
   * 只有整页加载才会跑；?replay=1 就是给这两道拦截看的放行标记。
   */
  const introHref = `/${locale}/?replay=1`;

  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  /** 这一行只有一行高、还要 truncate，所以用短版一句话（整句在开场页和 meta 里） */
  const tagline = locale === "en" ? siteConfig.taglineShortEn : siteConfig.taglineShort;

  /** 一条导航项。写成函数而不是内嵌组件，免得每次渲染都换掉一层组件类型 */
  const renderLink = (item: { key: NavKey; path: string }) => {
    const active = isActive(item.path);
    return (
      <Link
        key={item.key}
        href={localePath(locale, item.path)}
        aria-current={active ? "page" : undefined}
        title={collapsed ? t(`nav.${item.key}`) : undefined}
        className={[
          "flex h-9 items-center gap-3 rounded-lg text-sm tracking-[0.01em] transition-colors",
          collapsed ? "justify-center px-0" : "px-[13px]",
          active
            ? "bg-shell-ink text-shell"
            : "text-shell-muted hover:bg-white/[0.04] hover:text-shell-ink",
        ].join(" ")}
      >
        <NavIcon name={item.key} />
        {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
      </Link>
    );
  };

  const panel = (
    /**
     * 分组之后这一列比原来长（13 项 + 4 个组标题），窗口矮一点就装不下。
     * 所以只让「导航 + 连接」那一段滚动，顶部 Logo 和底部的 中/EN · ⌘K 钉住不动 ——
     * 语言切换是每页都可能要点的东西，不该藏在滚动条下面。
     */
    <div className="flex h-full flex-col px-[18px] pt-[26px] pb-[22px]">
      {/* 折叠按钮（桌面端才有意义） */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
        className="hidden self-end pr-1 text-[15px] leading-none text-shell-faint transition-colors hover:text-shell-ink lg:block"
      >
        {collapsed ? "›" : "‹"}
      </button>

      {/* Logo 圆徽 → 重看开场页；名字 + 一句话定位 → 首页 */}
      <div
        className={`mt-7 flex shrink-0 items-center gap-[13px] ${collapsed ? "justify-center px-0" : "px-[5px]"}`}
      >
        <a
          href={introHref}
          aria-label={t("nav.replayIntro")}
          title={t("nav.replayIntro")}
          className="flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-shell-line-2 bg-[#131313] transition-colors hover:border-shell-line-3 hover:bg-white/[0.06]"
        >
          <Image
            src={siteConfig.logo}
            alt={name}
            width={30}
            height={30}
            className="size-[30px] object-contain invert"
          />
        </a>
        {!collapsed && (
          <Link
            href={localePath(locale, NAV_HOME.path)}
            aria-label={t("nav.toHome")}
            title={t("nav.toHome")}
            className="group flex min-w-0 cursor-pointer flex-col gap-[3px]"
          >
            <span className="truncate text-base font-medium tracking-[0.01em] text-shell-ink decoration-shell-faint underline-offset-4 group-hover:underline">
              {name}
            </span>
            <span className="truncate text-xs tracking-[0.02em] text-shell-dim transition-colors group-hover:text-shell-muted">
              {tagline}
            </span>
          </Link>
        )}
      </div>

      {/* 中间这一段（导航 + 连接）是唯一会滚动的部分 */}
      <div className="mt-7 flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto">
        {/* 导航：首页单列在最上面，其余按四组排（组标题用极淡的小字 + 大字距） */}
        <nav className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">{renderLink(NAV_HOME)}</div>

          {NAV_GROUPS.map((group) => (
            <div key={group.key} className="flex flex-col gap-1.5">
              {collapsed ? (
                <span className="mx-auto h-px w-5 bg-shell-line-2" aria-hidden />
              ) : (
                <div className="px-[13px] text-[10px] tracking-(--tracking-label) text-shell-faint">
                  {t(`nav.groups.${group.key}`)}
                </div>
              )}
              <div className="flex flex-col gap-0.5">{group.items.map(renderLink)}</div>
            </div>
          ))}
        </nav>

        {/* 连接 / CONNECT */}
        <div className="flex flex-col gap-3">
          {!collapsed && (
            <div className="px-[13px] text-[10.5px] tracking-(--tracking-label) text-shell-faint">
              {t("nav.connect")}
            </div>
          )}
          <div className="flex flex-col gap-px">
            {siteConfig.socials.map((social) => {
              const label = locale === "en" ? social.labelEn : social.label;
              const href = social.href || undefined;
              const external = Boolean(href) && !social.href.startsWith("/");

              return (
                <a
                  key={social.key}
                  href={href}
                  title={collapsed ? label : undefined}
                  {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                  className={[
                    "flex h-8 items-center gap-3 text-[13.5px] transition-colors",
                    collapsed ? "justify-center px-0" : "px-[13px]",
                    href
                      ? "text-shell-dim hover:text-shell-ink"
                      : "cursor-default text-shell-mute",
                  ].join(" ")}
                >
                  <SocialIcon name={social.key} />
                  {!collapsed && <span>{label}</span>}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部：中/EN + ⌘K（钉在最下面，不跟着滚） */}
      <div
        className={[
          "mt-4 shrink-0 flex items-center border-t border-shell-line pt-3.5 text-[11.5px] tracking-[0.06em]",
          collapsed ? "flex-col gap-3" : "justify-between px-[13px]",
        ].join(" ")}
      >
        <span className="flex gap-[7px]">
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
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          aria-label={t("common.search")}
          className="rounded border border-shell-line-2 px-[7px] py-[3px] text-[10.5px] text-shell-faint transition-colors hover:border-shell-line-3 hover:text-shell-dim"
        >
          ⌘K
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ---------- 桌面端：常驻侧栏 ---------- */}
      <aside
        className="sticky top-0 hidden h-dvh shrink-0 border-r border-shell-line bg-shell text-shell-ink transition-[width] duration-300 lg:block"
        style={{ width: collapsed ? "var(--spacing-rail)" : "var(--spacing-sidebar)" }}
      >
        {panel}
      </aside>

      {/* ---------- 移动端：顶部条 ---------- */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-shell-line bg-shell px-4 text-shell-ink lg:hidden">
        {/* 和桌面侧栏一致：Logo → 开场页，名字 → 首页 */}
        <div className="flex items-center gap-2.5">
          <a
            href={introHref}
            aria-label={t("nav.replayIntro")}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-shell-line-2 bg-[#131313] transition-colors hover:border-shell-line-3"
          >
            <Image
              src={siteConfig.logo}
              alt={name}
              width={20}
              height={20}
              className="size-5 object-contain invert"
            />
          </a>
          <Link
            href={localePath(locale, NAV_HOME.path)}
            aria-label={t("nav.toHome")}
            className="cursor-pointer text-sm font-medium transition-colors hover:text-shell-muted"
          >
            {name}
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            aria-label={t("common.search")}
            className="flex size-9 items-center justify-center text-shell-dim"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("nav.menu")}
            className="flex size-9 items-center justify-center text-shell-ink"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* ---------- 移动端：全屏抽屉 ---------- */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.24 }}
            className="fixed inset-0 z-50 bg-shell text-shell-ink lg:hidden"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label={t("nav.close")}
              className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center text-shell-dim"
            >
              <CloseIcon />
            </button>
            {/* 点抽屉里任何一处（导航链接也算）就收起来 */}
            <div className="h-full pt-2" onClick={() => setDrawerOpen(false)}>
              {panel}
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
