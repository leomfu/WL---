"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * dcRise：滚动进入视口时淡入上移（PLAN.md §5 动效词汇表）。
 * 同一屏内的区块用 delay 做 120ms 递进的 stagger。
 */
const EASE = [0.22, 0.61, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={
        reduced
          ? { duration: 0.2 }
          : { duration: 0.8, ease: EASE, delay: delay / 1000 }
      }
    >
      {children}
    </motion.div>
  );
}
