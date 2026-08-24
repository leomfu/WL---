import type { ReactNode } from "react";

/**
 * 这一层不渲染 <html>/<body>：文档骨架在 app/[locale]/layout.tsx 里，
 * 因为 lang 属性要跟着语言走。根路径 / 的跳转页自己渲染一份最小骨架。
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
