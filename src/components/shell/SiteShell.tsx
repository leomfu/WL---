import type { ReactNode } from "react";
import { Grain } from "@/components/ui/Grain";
import { TopNav } from "./TopNav";

/**
 * 主站骨架：顶部暗色导航条 + 下面 1240px 居中版心的浅色内容区。
 *
 * 2026-09-08 改版：原来是「左侧 264px 暗色侧栏 + 右侧 700px 窄内容列」
 * （对照 docs/design/Main.dc.html）。站主要求导航像常规网站一样横在最上面，
 * 所以侧栏 → components/shell/TopNav（那块暗色从一竖条变成一横条，灰阶没变）。
 *
 * 版心宽度这一轮反复了一次，**现在这版是定稿**：先做成了完全铺满整幅，
 * 站主看过之后说「内容区域看着有些分散太靠左边了」，于是收成
 * **1240px 居中版心**（`--spacing-page`）。列表不再拉成一长条，
 * 摄影网格在大屏上仍能铺三到四列。
 *
 * 版心之内还有一层：**文章正文**自己收成 700px 阅读列
 * （`.prose-bw` 在 globals.css 里带 `max-width: var(--spacing-column)`）。
 *
 * 背景三层里的「纹」层挂在这一处，全站内容区通用一份。
 * 注意：这里只加 `relative`，不加 `overflow-hidden`——博客详情页的 sticky 目录
 * 探出正文列，main 一旦裁剪就会把它切没。
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-shell">
      <TopNav />
      {/* pt 要让开 fixed 顶栏的高度，再加页面自己的上留白。
          桌面档从 --spacing-topnav 算出来，改顶栏高度这里会跟着走；
          移动端顶栏是 h-14(56px)，56+36=92 */}
      <main className="bg-content relative min-h-dvh px-5 pt-[92px] pb-20 sm:px-10 lg:pt-[calc(var(--spacing-topnav)+64px)] lg:pb-[88px]">
        <Grain id="site-paper-grain" opacity={0.035} baseFrequency={0.8} numOctaves={4} blend="multiply" />
        {/* min-w-0：文章里一行很长的代码块会按最大内容宽度把容器撑开，
            反而让 <pre> 自己的 overflow-x:auto 失效，窄屏整页横向溢出 */}
        <div className="relative mx-auto w-full max-w-page min-w-0">{children}</div>
      </main>
    </div>
  );
}
