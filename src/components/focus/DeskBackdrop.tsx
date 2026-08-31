"use client";

import { Grain } from "@/components/ui/Grain";

/**
 * 专注区的背景 —— 一张写字台。中灰渐变 + 左上一点来光 + 哑光颗粒，
 * 全部纯 CSS/SVG 生成，不加载图片（对照 design-v2/Focus.dc.html）。
 *
 * 替掉的是原来 SceneBackdrop 那四套「氛围场景」（雨夜/海浪/篝火/深空，2026-08-29
 * 撤声音之后留下来当全屏背景、底部一排小字切换）。桌面隐喻定稿之后背景变成
 * 桌面本身的材质，不再需要可切换的场景——桌子只有一张，别再加场景选择器回来。
 */
export function DeskBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 桌面：左上来光，右下沉下去 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(152deg, #414141 0%, #383838 34%, #313131 68%, #2a2a2a 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(58% 52% at 28% 12%, rgba(237,237,237,0.07) 0%, rgba(237,237,237,0) 64%)",
        }}
      />
      {/* 台面的哑光颗粒 */}
      <Grain
        id="focus-desk-grain"
        opacity={0.055}
        baseFrequency={0.7}
        numOctaves={4}
        blend="overlay"
      />
    </div>
  );
}
