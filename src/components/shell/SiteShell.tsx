import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

/**
 * 主站骨架：左侧暗色侧边栏 + 右侧浅色内容区（264px / 700px 内容列，
 * 对照 docs/design/Main.dc.html）。放松区不用这个骨架，它有自己的沉浸布局。
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-shell">
      <Sidebar />
      <main className="bg-content flex min-h-dvh flex-1 justify-center px-6 pt-[88px] pb-20 sm:px-10 lg:pt-[104px] lg:pb-[88px]">
        <div className="w-full max-w-column">{children}</div>
      </main>
    </div>
  );
}
