"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Starfield } from "./Starfield";
import { Grain } from "./Grain";
import { TimeDial } from "./TimeDial";
import { useStoredState } from "@/lib/useStoredState";
import { siteConfig } from "~/site.config";

const INTRO_SEEN_KEY = "intro-seen";

/**
 * 侧栏 Logo 点回开场页时带的标记：`/{locale}/?replay=1`。
 * 带上它，「本次会话看过就跳走」的两道拦截（page.tsx 的内联脚本 + 下面的 useEffect）都放行。
 */
function isReplay() {
  if (typeof window === "undefined") return false;
  return /[?&]replay=1(?:&|$)/.test(window.location.search);
}

/** 进站过场：指针倒转 + 星点拉丝 → 淡出 → 跳转，整段 820ms */
const EXIT = {
  fadeDelay: 0.3,
  fadeDuration: 0.45,
  navigate: 820,
} as const;

/** 视觉稿里的入场节奏（ms），改这里就能整体调快慢 */
const BEAT = {
  rules: 300,
  eyebrow: 260,
  logo: 460,
  meta: 780,
  bottomRule: 900,
  button: 1080,
  footer: 1400,
  controls: 1600,
} as const;

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function IntroScreen() {
  const t = useTranslations("intro");
  const locale = useLocale();
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;

  /** 本次会话已经进过站就不再看开场页，直接放行；带 ?replay=1 是主动重看，照常放行 */
  const [seen, setSeen] = useStoredState(INTRO_SEEN_KEY, "0", "session");
  /**
   * 这里在 render 里读 URL：服务端恒为 false，客户端读真实 search。
   * 它只决定要不要挂滚动/按键监听，不影响任何标记，所以不会 hydration mismatch。
   */
  const ready = seen !== "1" || isReplay();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const otherLocale = locale === "zh" ? "en" : "zh";
  const homeHref = `/${locale}/home/`;

  /** 客户端路由跳回开场页时的兜底（首次访问由 page.tsx 里那段内联脚本处理） */
  useEffect(() => {
    if (isReplay()) return;
    if (seen === "1" && !leavingRef.current) router.replace(homeHref);
  }, [homeHref, router, seen]);

  const enter = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);

    setSeen("1");
    window.setTimeout(() => router.push(homeHref), reduced ? 0 : EXIT.navigate);
  }, [homeHref, reduced, router, setSeen]);

  /** 滚动 / 回车 / 点击，三种都能进站 */
  useEffect(() => {
    if (!ready || leaving) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        enter();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) enter();
    };
    const onTouchMove = () => enter();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [enter, leaving, ready]);

  /** 减少动态效果时：不做位移、不做循环动画，只留最基本的淡入 */
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 1.1, ease: EASE, delay: delay / 1000 },
        };

  const widen = (delay: number, origin: "left" | "right" | "center") =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { scaleX: 0 },
          animate: { scaleX: 1 },
          style: { transformOrigin: origin },
          transition: { duration: 1.4, ease: EASE, delay: delay / 1000 },
        };

  const loop = (name: string, duration: number, delay = 0) =>
    reduced
      ? undefined
      : `${name} ${duration}ms ease-in-out ${delay}ms infinite`;

  /** 倒转 + 拉丝的「穿梭时间」阶段；prefers-reduced-motion 下直接跳过，只留淡出 */
  const warping = leaving && !reduced;

  return (
    <motion.main
      onClick={enter}
      animate={
        warping
          ? { opacity: 0, scale: 1.08, filter: "blur(7px)" }
          : { opacity: leaving ? 0 : 1, scale: 1, filter: "blur(0px)" }
      }
      transition={
        warping
          ? { duration: EXIT.fadeDuration, delay: EXIT.fadeDelay, ease: EASE }
          : { duration: leaving ? 0.2 : 0.3, ease: EASE }
      }
      className="relative h-dvh w-full cursor-pointer overflow-hidden bg-void text-shell-ink select-none"
    >
      {/* --- 质感层：底部辉光 / 星点 / 噪点 / 暗角 --- */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(78% 52% at 50% 104%, #3A3A3A 0%, #1A1A1A 34%, #0A0A0A 62%, #060606 100%)",
          animation: loop("dcGlow", 9000),
        }}
        aria-hidden
      />
      {/* 穿梭时间那一下，中心的辉光短暂涨起来 */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          background:
            "radial-gradient(46% 34% at 50% 46%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0) 72%)",
          opacity: warping ? 1 : 0,
        }}
        aria-hidden
      />
      <Starfield animate={!reduced} warp={warping} />
      <Grain id="intro-grain" opacity={0.07} baseFrequency={0.8} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(96% 74% at 50% 46%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.72) 100%)",
        }}
        aria-hidden
      />

      {/* --- 左上角：语言切换 --- */}
      <motion.div
        {...rise(BEAT.controls)}
        className="absolute left-6 top-6 z-10 sm:left-9 sm:top-8"
      >
        <Link
          href={`/${otherLocale}/`}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("switchLocale")}
          className="flex h-9 items-center gap-2 rounded-full border border-shell-line-2 bg-white/[0.02] px-3 text-shell-dim transition-colors hover:border-shell-line-3 hover:text-shell-ink"
        >
          <GlobeIcon />
          <span className="text-[11px] tracking-[0.14em]">
            {otherLocale.toUpperCase()}
          </span>
        </Link>
      </motion.div>

      {/* --- 主体 --- */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 sm:px-16 lg:px-40">
        {/* 上分割线 + 小标题 */}
        <div className="flex w-full items-center gap-4 sm:gap-6">
          <motion.div {...widen(BEAT.rules, "right")} className="h-px flex-1 bg-rule" />
          <motion.span
            {...rise(BEAT.eyebrow)}
            className="whitespace-nowrap text-[10px] tracking-[0.28em] text-[#C4C4C4] sm:text-[11px] sm:tracking-(--tracking-eyebrow)"
          >
            {t("eyebrow")}
          </motion.span>
          <motion.div {...widen(BEAT.rules, "left")} className="h-px flex-1 bg-rule" />
        </div>

        {/* 时间之钟：走真实时间，进站时指针倒转 */}
        <motion.div {...rise(BEAT.logo)} className="my-6 sm:my-8">
          <TimeDial
            warping={warping}
            reduced={reduced}
            logoAlt={t("logoAlt")}
            className="h-[200px] w-[200px] sm:h-[280px] sm:w-[280px] lg:h-[352px] lg:w-[352px]"
            style={{ animation: loop("dcFloat", 11000) }}
          />
        </motion.div>

        {/* NAME / 一句话定位 / SINCE */}
        <motion.div
          {...rise(BEAT.meta)}
          className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8"
        >
          <MetaBlock
            label={t("nameLabel")}
            value={locale === "zh" ? siteConfig.name : siteConfig.nameEn}
            className="items-center lg:w-[190px] lg:items-start"
          />

          <div className="flex max-w-[560px] flex-col items-center gap-2.5 text-center">
            <span className="text-[15px] leading-relaxed tracking-[0.03em] text-shell-ink sm:text-base">
              {t("tagline")}
            </span>
            <span className="text-[11px] tracking-[0.16em] text-[#6E6E6E] sm:text-[11.5px]">
              {t("taglineSub")}
            </span>
          </div>

          <MetaBlock
            label={t("sinceLabel")}
            value={siteConfig.since}
            className="items-center lg:w-[190px] lg:items-end"
          />
        </motion.div>

        {/* 下分割线 */}
        <motion.div
          {...widen(BEAT.bottomRule, "center")}
          className="mt-6 h-px w-full bg-rule"
        />

        {/* 进入按钮 */}
        <motion.div
          {...rise(BEAT.button)}
          className="mt-8 flex flex-col items-center gap-4 sm:mt-11"
        >
          <Link
            href={homeHref}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              enter();
            }}
            className="group relative block cursor-pointer"
            style={{ animation: loop("dcBob", 3400) }}
          >
            <span
              className="block border border-shell-line-3 px-8 py-4 text-[11.5px] tracking-[0.24em] text-shell-ink transition-colors group-hover:border-shell-dim sm:px-10 sm:text-[12.5px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 6px)",
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            >
              {t("enter")}
            </span>
            <Corner className="-left-[5px] -top-[5px] border-l border-t" />
            <Corner className="-right-[5px] -top-[5px] border-r border-t" />
            <Corner className="-bottom-[5px] -left-[5px] border-b border-l" />
            <Corner className="-bottom-[5px] -right-[5px] border-b border-r" />
          </Link>

          <div className="flex items-center gap-2.5 text-[11.5px] text-shell-faint">
            <span>{t("enterHintPrefix")}</span>
            <kbd className="rounded border border-b-2 border-shell-line-2 px-2 py-0.5 font-sans text-shell-dim">
              {t("enterKey")}
            </kbd>
          </div>
        </motion.div>
      </div>

      {/* --- 页脚 --- */}
      <motion.div
        {...rise(BEAT.footer)}
        className="absolute inset-x-0 bottom-6 text-center text-[9px] tracking-[0.24em] text-shell-mute sm:bottom-8 sm:text-[10px] sm:tracking-[0.3em]"
      >
        {t("footer")}
      </motion.div>
    </motion.main>
  );
}

function MetaBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[9.5px] tracking-[0.26em] text-shell-faint">
        {label}
      </span>
      <span className="text-sm tracking-[0.04em] text-[#C4C4C4]">{value}</span>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-[11px] w-[11px] border-[#7A7A7A] ${className}`}
      aria-hidden
    />
  );
}

function GlobeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="10" cy="10" r="7.2" />
      <path d="M2.8 10h14.4M10 2.8c1.9 2 2.9 4.5 2.9 7.2s-1 5.2-2.9 7.2c-1.9-2-2.9-4.5-2.9-7.2s1-5.2 2.9-7.2z" />
    </svg>
  );
}
