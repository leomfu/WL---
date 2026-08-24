"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { localePath } from "@/lib/nav";

/**
 * ⌘K 命令面板 —— 搜文章标题/摘要、跳任意页面、切换语言。
 * 索引是构建时生成的（由 (site)/layout.tsx 传进来），纯前端过滤，不请求任何接口。
 * 侧边栏和移动端顶部那两个 ⌘K 按钮通过 window 上的 open-command-palette 事件唤起。
 */

export type PalettePage = { key: string; path: string };
export type PalettePost = { slug: string; title: string; summary: string };

type Row =
  | { kind: "page"; id: string; label: string; hint?: string; href: string }
  | { kind: "post"; id: string; label: string; hint?: string; href: string }
  | { kind: "action"; id: string; label: string; hint?: string; href: string };

export function CommandPalette({
  pages,
  posts,
}: {
  pages: PalettePage[];
  posts: PalettePost[];
}) {
  const t = useTranslations("palette");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherLocale = locale === "zh" ? "en" : "zh";
  const otherLocaleHref = pathname.replace(/^\/[^/]+/, `/${otherLocale}`) || `/${otherLocale}/`;

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (text: string) => text.toLowerCase().includes(q);

    const pageRows: Row[] = pages
      .map((page) => ({
        kind: "page" as const,
        id: `page:${page.key}`,
        label: tNav(page.key),
        href: localePath(locale, page.path),
      }))
      .filter((row) => !q || match(row.label));

    const postRows: Row[] = posts
      .filter((post) => !q || match(post.title) || match(post.summary))
      .slice(0, 8)
      .map((post) => ({
        kind: "post" as const,
        id: `post:${post.slug}`,
        label: post.title,
        hint: post.summary,
        href: localePath(locale, `/blog/${post.slug}`),
      }));

    const actionRows: Row[] = [
      {
        kind: "action" as const,
        id: "action:locale",
        label: locale === "zh" ? t("switchToEn") : t("switchToZh"),
        href: otherLocaleHref,
      },
    ].filter((row) => !q || match(row.label));

    return [...pageRows, ...postRows, ...actionRows];
  }, [locale, otherLocaleHref, pages, posts, query, t, tNav]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const go = useCallback(
    (row?: Row) => {
      if (!row) return;
      close();
      router.push(row.href);
    },
    [close, router],
  );

  /** ⌘K / Ctrl+K 开关，以及侧栏按钮派发的事件 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (rows.length ? (c + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (rows.length ? (c - 1 + rows.length) % rows.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(rows[cursor]);
    }
  };

  const groupLabel = (kind: Row["kind"]) =>
    kind === "page" ? t("pages") : kind === "post" ? t("posts") : t("actions");

  /** 每组第一条才显示分组标题；先算好，别在渲染里改外部变量 */
  const listed = rows.map((row, i) => ({
    row,
    showGroup: i === 0 || rows[i - 1].kind !== row.kind,
  }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.18 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px]"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0.01 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] overflow-hidden border border-line bg-card shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={t("placeholder")}
                aria-label={t("placeholder")}
                className="h-13 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
              />
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="text-[11px] tracking-[0.08em] text-faint hover:text-ink"
              >
                esc
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto py-2">
              {rows.length === 0 && (
                <p className="px-4 py-6 text-[13px] text-muted">{t("empty")}</p>
              )}

              {listed.map(({ row, showGroup }, i) => {
                const active = i === cursor;

                return (
                  <div key={row.id}>
                    {showGroup && (
                      <div className="px-4 pt-3 pb-1.5 text-[10px] tracking-(--tracking-label) text-faint">
                        {groupLabel(row.kind)}
                      </div>
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(row)}
                      className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors ${
                        active ? "bg-[#f2f2f2]" : ""
                      }`}
                    >
                      <span className="text-[14.5px] text-ink">{row.label}</span>
                      {row.hint && (
                        <span className="line-clamp-1 text-[12.5px] text-faint">
                          {row.hint}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line px-4 py-2.5 text-[11px] tracking-[0.04em] text-faint">
              {t("hint")}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="9" cy="9" r="5.6" />
      <path d="m13.3 13.3 3.2 3.2" />
    </svg>
  );
}
