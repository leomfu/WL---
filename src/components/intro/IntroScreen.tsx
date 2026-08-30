"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { CityDepth } from "./CityDepth";
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

/**
 * 进站过场：指针倒转 + 颜色从画面深处涌回（CityDepth 的 uColor）
 * → 镜头沿深度轴推进穿入（uDolly）→ 淡出 → 跳转，整段 1600ms。
 * 时间轴的另一半在 CityDepth 的 TL 里，两边要一起改。
 */
const EXIT = {
  fadeDelay: 0.95,
  fadeDuration: 0.5,
  navigate: 1600,
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
          ? { opacity: 0, scale: 1.04, filter: "blur(6px)" }
          : { opacity: leaving ? 0 : 1, scale: 1, filter: "blur(0px)" }
      }
      transition={
        warping
          ? { duration: EXIT.fadeDuration, delay: EXIT.fadeDelay, ease: EASE }
          : { duration: leaving ? 0.2 : 0.3, ease: EASE }
      }
      className="relative h-dvh w-full cursor-pointer overflow-hidden bg-void text-shell-ink select-none"
      /* 所有叠在照片上的字统一带一层柔影：比把整张照片压暗划算得多 */
      style={{ textShadow: "0 1px 16px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.55)" }}
    >
      {/* --- 背景：外滩夜景 + 深度视差（默认黑白，进站那两秒才上色） --- */}
      <CityDepth warping={warping} reduced={reduced} alt={t("backdropAlt")} />

      {/* 叠字垫底：顶上压一点、底下压重一点，白字压在晚霞和灯火上才读得出来 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,6,6,0.52) 0%, rgba(6,6,6,0.16) 24%, rgba(6,6,6,0.10) 46%, rgba(6,6,6,0.34) 74%, rgba(6,6,6,0.78) 100%)",
        }}
        aria-hidden
      />
      {/* 穿梭时间那一下，中心的辉光短暂涨起来 */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          background:
            "radial-gradient(46% 34% at 50% 36%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0) 72%)",
          opacity: warping ? 1 : 0,
        }}
        aria-hidden
      />
      <Grain id="intro-grain" opacity={0.05} baseFrequency={0.8} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(102% 78% at 50% 44%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.62) 100%)",
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

      {/*
        --- 主体 ---
        只占屏幕上面这一段（天空 + 楼群），把下面的江面、堤岸和那个坐着的背影让出来：
        文字压在人身上会两败俱伤。整块内容在这个框里垂直居中，
        于是时间之钟正好落在陆家嘴上空、东方明珠塔尖之下。
      */}
      <div className="relative flex h-full flex-col items-center justify-start px-6 pb-[30vh] sm:px-16 lg:px-40">
        {/* 上分割线 + 小标题。
            首尾两块的 mt-auto / mb-auto 是「安全居中」：空间够时等同 justify-center，
            空间不够时 auto 边距收成 0，内容只会往下溢出——绝不会把顶上这行裁掉。 */}
        <div className="mt-auto flex w-full items-center gap-4 sm:gap-6">
          <motion.div {...widen(BEAT.rules, "right")} className="h-px flex-1 bg-rule" />
          <motion.span
            {...rise(BEAT.eyebrow)}
            className="whitespace-nowrap text-[10px] tracking-[0.28em] text-[#C4C4C4] sm:text-[11px] sm:tracking-(--tracking-eyebrow)"
          >
            {t("eyebrow")}
          </motion.span>
          <motion.div {...widen(BEAT.rules, "left")} className="h-px flex-1 bg-rule" />
        </div>

        {/* 时间之钟：走真实时间，进站时指针倒转。
            身后垫一块圆形玻璃（暗一点 + 极轻的背景模糊），
            让白色表盘在晚霞里读得出来，又不至于把塔挡死。 */}
        <motion.div {...rise(BEAT.logo)} className="relative my-5 sm:my-7">
          <div
            className="pointer-events-none absolute inset-[-7%] rounded-full backdrop-blur-[2px]"
            style={{
              background:
                "radial-gradient(circle, rgba(6,6,6,0.46) 0%, rgba(6,6,6,0.30) 54%, rgba(6,6,6,0) 78%)",
              maskImage:
                "radial-gradient(circle, #000 0%, #000 62%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(circle, #000 0%, #000 62%, transparent 80%)",
            }}
            aria-hidden
          />
          <TimeDial
            warping={warping}
            reduced={reduced}
            logoAlt={t("logoAlt")}
            /* 尺寸同时受 vh 约束：矮屏上表盘自己缩小，整块内容才不会压到江边那个人 */
            className="h-[min(172px,25vh)] w-[min(172px,25vh)] sm:h-[min(228px,29vh)] sm:w-[min(228px,29vh)] lg:h-[min(272px,32vh)] lg:w-[min(272px,32vh)]"
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

          {/* 一句话 + 一口气 + 另一种语言。三层依次变小变暗：
              主句是陈述（衬线、亮），tail 是说完之后自己点的那下头（小一号、暗一档），
              最下面那行是另一种语言的同一句。中文主句把字距拉开，英文收住 —— 
              0.16em 之于汉字是舒展，之于拉丁字母是散架。 */}
          <div className="flex max-w-[560px] flex-col items-center gap-3 text-center">
            <span className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
              <span
                className={[
                  "font-serif font-light text-shell-ink",
                  "text-[19px] leading-[1.5] sm:text-[22px]",
                  locale === "zh" ? "tracking-[0.16em]" : "tracking-[0.04em]",
                ].join(" ")}
              >
                {t("tagline")}
              </span>
              {t("taglineTail") && (
                <span className="text-[12px] tracking-[0.22em] text-shell-dim sm:text-[13px]">
                  {t("taglineTail")}
                </span>
              )}
            </span>
            <span className="text-[11px] tracking-[0.16em] text-[#A0A0A0] sm:text-[11.5px]">
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
          className="mt-8 mb-auto flex flex-col items-center gap-4 sm:mt-10"
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
              className="block border border-shell-line-3 px-8 py-4 text-[11.5px] tracking-[0.24em] text-shell-ink backdrop-blur-[3px] transition-colors group-hover:border-shell-dim sm:px-10 sm:text-[12.5px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 6px)",
                backgroundColor: "rgba(6,6,6,0.34)",
              }}
            >
              {t("enter")}
            </span>
            <Corner className="-left-[5px] -top-[5px] border-l border-t" />
            <Corner className="-right-[5px] -top-[5px] border-r border-t" />
            <Corner className="-bottom-[5px] -left-[5px] border-b border-l" />
            <Corner className="-bottom-[5px] -right-[5px] border-b border-r" />
          </Link>

          <div className="flex items-center gap-2.5 text-[11.5px] text-[#9A9A9A]">
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
        className="absolute inset-x-0 bottom-6 text-center text-[9px] tracking-[0.24em] text-[#8A8A8A] sm:bottom-8 sm:text-[10px] sm:tracking-[0.3em]"
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
      <span className="text-[9.5px] tracking-[0.26em] text-[#9A9A9A]">
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
