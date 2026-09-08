import type { ReactNode } from "react";
import { Grain } from "@/components/ui/Grain";
import { TopNav } from "./TopNav";

/**
 * 主站骨架：顶部暗色导航条 + 下面整幅宽度的浅色内容区。
 *
 * 2026-09-08 改版：原来是「左侧 264px 暗色侧栏 + 右侧 700px 窄内容列」
 * （对照 docs/design/Main.dc.html）。站主要求导航像常规网站一样横在最上面，
 * 下面的页面用**完整整幅**的宽度，所以：
 *   - 侧栏 → components/shell/TopNav（那块暗色从一竖条变成一横条，灰阶没变）
 *   - 内容列不再有 max-width，只留左右 20/40px 的边距
 *
 * 唯一还保留窄列的是**文章正文**——`.prose-bw` 在 globals.css 里自己带
 * `max-width: var(--spacing-column)`，一行拉到两千像素没人读得下去。
 *
 * 背景三层里的「纹」层挂在这一处，全站内容区通用一份。
 * 注意：这里只加 `relative`，不加 `overflow-hidden`——博客详情页的 sticky 目录
 * 探出正文列，main 一旦裁剪就会把它切没。
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-shell">
      <TopNav />
      {/* pt 要让开 fixed 顶栏的高度（移动端 56px / 桌面 64px），再加页面自己的上留白 */}
      <main className="bg-content relative min-h-dvh px-5 pt-[92px] pb-20 sm:px-10 lg:pt-[128px] lg:pb-[88px]">
        <Grain id="site-paper-grain" opacity={0.035} baseFrequency={0.8} numOctaves={4} blend="multiply" />
        {/* min-w-0：文章里一行很长的代码块会按最大内容宽度把容器撑开，
            反而让 <pre> 自己的 overflow-x:auto 失效，窄屏整页横向溢出 */}
        <div className="relative w-full min-w-0">{children}</div>
      </main>
    </div>
  );
}
