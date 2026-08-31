"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Grain } from "./Grain";
import { TimeDial } from "./TimeDial";
import { useStoredState } from "@/lib/useStoredState";

const INTRO_SEEN_KEY = "intro-seen";

/**
 * 侧栏 Logo 点回开场页时带的标记：`/{locale}/?replay=1`。
 * 带上它，「本次会话看过就跳走」的两道拦截（page.tsx 的内联脚本 + 下面的 useEffect）都放行。
 */
function isReplay() {
  if (typeof window === "undefined") return false;
  return /[?&]replay=1(?:&|$)/.test(window.location.search);
}

/**
 * 进站过场：仪器指针倒转穿梭 → 整页淡出 → 跳转，整段 EXIT.navigate 毫秒。
 * 指针倒转的时间轴在 TimeDial 的 WARP_MS 里，两边节奏要对得上。
 */
const EXIT = {
  fadeDelay: 0.5,
  fadeDuration: 0.6,
  navigate: 1400,
} as const;

/** 视觉稿里的入场节奏（ms），改这里就能整体调快慢 */
const BEAT = {
  eyebrow: 260,
  dial: 200,
  meta: 620,
  footer: 900,
  controls: 1100,
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

  /** 减少动态效果时：不做位移，只留最基本的淡入 */
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: EASE, delay: delay / 1000 },
        };

  /** 倒转穿梭的过场；prefers-reduced-motion 下直接跳过，只留淡出 */
  const warping = leaving && !reduced;

  return (
    <motion.main
      onClick={enter}
      animate={
        warping
          ? { opacity: 0, filter: "blur(4px)" }
          : { opacity: leaving ? 0 : 1, filter: "blur(0px)" }
      }
      transition={
        warping
          ? { duration: EXIT.fadeDuration, delay: EXIT.fadeDelay, ease: EASE }
          : { duration: leaving ? 0.2 : 0.3, ease: EASE }
      }
      className="relative h-dvh w-full cursor-pointer overflow-hidden bg-void text-shell-ink select-none"
    >
      {/* --- 质感层 1 · 主光：右上一片极缓的辉光，托住仪器（design-v2/Main.dc.html 定稿值） --- */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(66% 58% at 78% 30%, #1c1c1c 0%, #121212 38%, #0a0a0a 70%, #070707 100%)",
        }}
        aria-hidden
      />
      {/* --- 质感层 2 · 回光：左下一点冷调回光，避免整块死沉 --- */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(48% 44% at 12% 88%, rgba(237,237,237,0.045) 0%, rgba(237,237,237,0) 62%)",
        }}
        aria-hidden
      />

      {/* --- 颗粒：两层不同频率叠起来，比单层电子噪点更像胶片 --- */}
      <Grain id="intro-grain-soft" opacity={0.05} baseFrequency={0.28} numOctaves={4} blend="overlay" />
      <Grain id="intro-grain-fine" opacity={0.035} baseFrequency={1.4} numOctaves={2} blend="screen" />

      {/* --- 暗角 --- */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(130% 130% at 62% 40%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)",
        }}
        aria-hidden
      />

      {/* --- 精密仪器：多层同心环 + 细密刻度 + 副盘，被右边缘裁掉 ---
          全屏 SVG，viewBox + preserveAspectRatio="xMaxYMid slice" 自己做响应式缩放，
          裁切一直贴着容器右边，窄屏上构图不会塌。 */}
      <TimeDial warping={warping} reduced={reduced} />

      {/* --- 键盘可达的进入按钮 ---
          视觉上不可见（没有引导框了），但可以被 Tab 聚焦、Enter/Space 触发，
          聚焦时有清晰的焦点环，键盘用户不会因为去掉了「或按 Enter」的提示框而无路可走。
          放在最前面（DOM 顺序最先），后面的语言切换/文字层会自然盖在它上面，
          不会抢真实链接的点击。 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          enter();
        }}
        aria-label={t("enter")}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-shell-ink"
      />

      {/* --- 右上角：语言切换 --- */}
      <motion.div
        {...rise(BEAT.controls)}
        className="absolute right-5 top-5 z-10 sm:right-9 sm:top-8 lg:right-[92px] lg:top-14"
      >
        <Link
          href={`/${otherLocale}/`}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("switchLocale")}
          className="flex h-9 items-center gap-2 rounded-full border border-shell-line-2 bg-white/[0.02] px-3 text-shell-dim transition-colors hover:border-shell-line-3 hover:text-shell-ink"
        >
          <GlobeIcon />
          <span className="text-[11px] tracking-[0.14em]">{otherLocale.toUpperCase()}</span>
        </Link>
      </motion.div>

      {/* --- 左上角小标签 --- */}
      <motion.div
        {...rise(BEAT.eyebrow)}
        className="pointer-events-none absolute left-5 top-5 z-10 sm:left-9 sm:top-8 lg:left-[92px] lg:top-14"
      >
        <span className="whitespace-nowrap text-[9.5px] uppercase tracking-[0.3em] text-shell-faint sm:text-[10.5px] sm:tracking-[0.36em]">
          {t("eyebrow")}
        </span>
      </motion.div>

      {/* --- 左下文字块 --- */}
      <motion.div
        {...rise(BEAT.meta)}
        className="pointer-events-none absolute inset-x-5 bottom-24 z-10 flex flex-col gap-4 sm:inset-x-9 sm:bottom-28 lg:inset-x-auto lg:bottom-[148px] lg:left-[92px] lg:max-w-[620px]"
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 sm:gap-x-[22px]">
          <span className="font-serif text-[32px] leading-[1.24] tracking-[-0.01em] text-shell-ink sm:text-[46px] lg:text-[62px] lg:tracking-[-0.015em]" style={{ fontWeight: 200 }}>
            {t("tagline")}
          </span>
          {t("taglineTail") && (
            <span className="text-[13px] tracking-[0.14em] text-shell-dim sm:text-[16px] sm:tracking-[0.16em]">
              {t("taglineTail")}
            </span>
          )}
        </div>
        <span className="text-[11.5px] tracking-[0.04em] text-shell-faint sm:text-[13px] sm:tracking-[0.05em]">
          {t("taglineSub")}
        </span>
      </motion.div>

      {/* --- 页脚 --- */}
      <motion.div
        {...rise(BEAT.footer)}
        className="pointer-events-none absolute bottom-6 left-5 z-10 sm:bottom-8 sm:left-9 lg:bottom-14 lg:left-[92px]"
      >
        <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.18em] text-shell-line-3 sm:text-[10.5px] sm:tracking-[0.2em]">
          {t("footer")}
        </span>
      </motion.div>
    </motion.main>
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
