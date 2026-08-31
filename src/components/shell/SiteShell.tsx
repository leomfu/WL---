import type { ReactNode } from "react";
import { Grain } from "@/components/ui/Grain";
import { Sidebar } from "./Sidebar";

/**
 * 主站骨架：左侧暗色侧边栏 + 右侧浅色内容区（264px / 700px 内容列，
 * 对照 docs/design/Main.dc.html）。放松区不用这个骨架，它有自己的沉浸布局。
 *
 * 背景三层（design-v2/Home.dc.html + ContentTemplate.dc.html §①）里的「纹」层
 * 挂在这一处，全站内容区通用一份，不必每个页面各写一份 <Grain>。
 * 「面」层（白卡容器）是每个内容组件自己的事，见 globals.css 的 `card-face` 工具类。
 * 注意：这里只加 `relative`，不加 `overflow-hidden`——博客详情页的 sticky 目录用
 * `left-[calc(100%+56px)]` 探出内容列，main 一旦裁剪就会把它切没。
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-shell">
      <Sidebar />
      {/* min-w-0：main 自己也是外层 flex 行（侧栏 + main）里的一个 flex 子项，
          默认 min-width:auto 会按内容的最大内容宽度撑开——文章里一行很长的代码块
          就能把它连带撑宽，反而让 <pre> 自己的 overflow-x:auto 失效，390px 手机档
          整页横向溢出。截图自查时揪出来的，两层 flex 子项（main 自己 + 下面内容列）
          都要加，少一层都不够。 */}
      <main className="bg-content relative flex min-h-dvh min-w-0 flex-1 justify-center px-6 pt-[88px] pb-20 sm:px-10 lg:pt-[104px] lg:pb-[88px]">
        <Grain id="site-paper-grain" opacity={0.035} baseFrequency={0.8} numOctaves={4} blend="multiply" />
        <div className="relative w-full min-w-0 max-w-column">{children}</div>
      </main>
    </div>
  );
}
