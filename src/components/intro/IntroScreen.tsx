"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Grain } from "./Grain";
import { Starfield } from "./Starfield";
import { TimeDial } from "./TimeDial";
import { useStoredState } from "@/lib/useStoredState";

const INTRO_SEEN_KEY = "intro-seen";
/**
 * 语言切换点在开场页时设的短时效标记：切换会导航到 `/{otherLocale}/`（还是开场页，
 * 只是换了语言），新页面读到这个标记就跳过入场编排、直接呈现最终态，读完立刻清掉。
 * 不用它的话，每次切语言都会把 stagger 淡入的入场动画从头重放一遍。
 */
const LOCALE_SWITCH_KEY = "intro-locale-switch";

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

  /**
   * 从「切语言」跳过来的这一次，跳过入场编排、直接呈现最终态。
   * 用 useState 的惰性初始化只读一次（挂载时），读完在下面的 effect 里立刻清掉标记，
   * 不会影响下一次真正的开场页访问。
   */
  const [skipEntrance] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(LOCALE_SWITCH_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!skipEntrance) return;
    try {
      sessionStorage.removeItem(LOCALE_SWITCH_KEY);
    } catch {
      // 隐私模式下可能直接抛错，读都读到了，清不掉也无所谓
    }
  }, [skipEntrance]);

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

  /**
   * 减少动态效果时：不做位移，只留最基本的淡入。
   * 从切语言跳过来时：`initial={false}` 让 Framer Motion 直接从 animate 目标值起render，
   * 不经过 initial→animate 这段过渡，新页面第一帧就是最终态。
   */
  const rise = (delay: number) => {
    if (reduced) return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } };
    if (skipEntrance) return { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } };
    return {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.9, ease: EASE, delay: delay / 1000 },
    };
  };

  /** 倒转穿梭的过场；prefers-reduced-motion 下直接跳过，只留淡出 */
  const warping = leaving && !reduced;

  return (
    <motion.main
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

      {/* --- 星点：极淡、和仪器有疏密关系，见 Starfield.tsx 顶部注释 --- */}
      <Starfield />

      {/* --- 精密仪器：自己独立定位/独立尺寸，见 TimeDial.tsx 顶部注释 --- */}
      <TimeDial warping={warping} reduced={reduced} />

      {/* --- 键盘可达的进入按钮，兼「点哪都能进站」的唯一入口 ---
          显式钉在最低的 z 层（z-0）：语言切换是它的兄弟节点、更高的 z 层，
          不是嵌套在它里面——这样点语言切换的点击事件根本落不到这个按钮上，
          不需要靠事件冒泡的先后顺序去赌。stopPropagation 只是兜底。
          视觉上不可见，但可以被 Tab 聚焦、Enter/Space 触发，聚焦时有清晰的焦点环。 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          enter();
        }}
        aria-label={t("enter")}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-shell-ink"
      />

      {/* --- 左上角：语言切换 + 小标签，同一行、同一条左基线（和页脚/文案块都是 left-[92px]）---
          语言切换 z-20，明确高于铺满整页的进站按钮（z-0）：点它只切语言、不进站。
          小标签是 pointer-events-none，不会挡住切换按钮的点击。 */}
      <div className="absolute left-5 top-5 z-20 flex items-center gap-4 sm:left-9 sm:top-8 sm:gap-5 lg:left-[92px] lg:top-14">
        <motion.div {...rise(BEAT.controls)}>
          <Link
            href={`/${otherLocale}/`}
            onClick={(e) => {
              e.stopPropagation();
              try {
                sessionStorage.setItem(LOCALE_SWITCH_KEY, "1");
              } catch {
                // 隐私模式下可能直接抛错，顶多是新页面重放一次入场动画，不影响切语言本身
              }
            }}
            aria-label={t("switchLocale")}
            className="flex h-8 items-center gap-2 rounded-full border border-shell-line-2 bg-white/[0.02] px-3 text-shell-dim transition-colors hover:border-shell-line-3 hover:text-shell-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shell-ink"
          >
            <GlobeIcon />
            <span className="text-[11px] tracking-[0.14em]">{otherLocale.toUpperCase()}</span>
          </Link>
        </motion.div>

        <motion.span
          {...rise(BEAT.eyebrow)}
          className="pointer-events-none whitespace-nowrap text-[9.5px] uppercase tracking-[0.3em] text-shell-faint sm:text-[10.5px] sm:tracking-[0.36em]"
        >
          {t("eyebrow")}
        </motion.span>
      </div>

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
