"use client";

import { AnimatePresence, motion } from "motion/react";
import { Grain } from "@/components/intro/Grain";
import { Starfield } from "@/components/intro/Starfield";

/**
 * 氛围场景的全屏背景 —— 全部由渐变 + 噪点 + CSS 动画生成，一张图都不加载
 * （PLAN.md §6：「黑白低饱和，禁止大图片」）。换场景时整层交叉淡入。
 */

type Layer = { background: string; animation?: string; blend?: string };

/** 四个场景各自的质感层，从下往上叠 */
const SCENES: Record<string, { layers: Layer[]; stars?: boolean }> = {
  rain: {
    layers: [
      {
        background:
          "radial-gradient(122% 92% at 50% 16%, #202020 0%, #131313 38%, #0A0A0A 74%)",
        animation: "dcGlow 11000ms ease-in-out infinite",
      },
      {
        background:
          "repeating-linear-gradient(14deg, rgba(237,237,237,0) 0px, rgba(237,237,237,0) 22px, rgba(237,237,237,0.05) 23px, rgba(237,237,237,0) 25px)",
        animation: "dcRain 5200ms linear infinite",
      },
      {
        background:
          "repeating-linear-gradient(11deg, rgba(237,237,237,0) 0px, rgba(237,237,237,0) 46px, rgba(237,237,237,0.035) 47px, rgba(237,237,237,0) 50px)",
        animation: "dcRain 8600ms linear infinite",
      },
    ],
  },
  waves: {
    layers: [
      {
        background:
          "radial-gradient(120% 84% at 50% 96%, #262626 0%, #151515 44%, #0A0A0A 80%)",
        animation: "dcGlow 14000ms ease-in-out infinite",
      },
      {
        background:
          "repeating-linear-gradient(177deg, rgba(237,237,237,0) 0px, rgba(237,237,237,0) 52px, rgba(237,237,237,0.05) 54px, rgba(237,237,237,0) 58px)",
        animation: "dcDriftX 26000ms linear infinite",
      },
      {
        background:
          "repeating-linear-gradient(182deg, rgba(237,237,237,0) 0px, rgba(237,237,237,0) 88px, rgba(237,237,237,0.035) 90px, rgba(237,237,237,0) 96px)",
        animation: "dcDriftX 41000ms linear infinite reverse",
      },
    ],
  },
  fire: {
    layers: [
      {
        background:
          "radial-gradient(96% 70% at 50% 104%, #3C3C3C 0%, #1C1C1C 38%, #0A0A0A 74%)",
        animation: "dcFlicker 4200ms ease-in-out infinite",
      },
      {
        background:
          "radial-gradient(38% 30% at 50% 98%, rgba(237,237,237,0.14) 0%, rgba(237,237,237,0) 70%)",
        animation: "dcFlicker 2600ms ease-in-out infinite",
        blend: "screen",
      },
    ],
  },
  space: {
    stars: true,
    layers: [
      {
        background:
          "radial-gradient(88% 68% at 50% 42%, #1C1C1C 0%, #0D0D0D 52%, #060606 100%)",
        animation: "dcGlow 17000ms ease-in-out infinite",
      },
    ],
  },
};

export function SceneBackdrop({
  sceneKey,
  reduced,
}: {
  sceneKey: string;
  reduced: boolean;
}) {
  const scene = SCENES[sceneKey] ?? SCENES.rain;

  return (
    <div className="absolute inset-0 overflow-hidden bg-shell" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.div
          key={sceneKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {scene.layers.map((layer, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                background: layer.background,
                animation: reduced ? undefined : layer.animation,
                mixBlendMode: layer.blend as React.CSSProperties["mixBlendMode"],
              }}
            />
          ))}
          {scene.stars && <Starfield animate={!reduced} />}
        </motion.div>
      </AnimatePresence>

      {/* 噪点 + 暗角：所有场景共用，压住渐变的塑料感 */}
      <Grain id="lounge-grain" opacity={0.055} baseFrequency={0.85} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 72% at 50% 50%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.78) 100%)",
        }}
      />
    </div>
  );
}
