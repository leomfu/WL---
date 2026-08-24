/**
 * 侧边栏导航（对照 docs/design/Main.dc.html 左栏的顺序）。
 * 书影音、留言板不进侧边栏 —— 从内容区页脚和 ⌘K 面板进入（PLAN.md §4）。
 */
export const NAV_ITEMS = [
  { key: "home", path: "/home" },
  { key: "projects", path: "/projects" },
  { key: "videos", path: "/videos" },
  { key: "blog", path: "/blog" },
  { key: "about", path: "/about" },
  { key: "tools", path: "/tools" },
  { key: "lounge", path: "/lounge" },
  { key: "contact", path: "/contact" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

/** 不在侧边栏、但要能被 ⌘K 搜到的页面 */
export const EXTRA_PAGES = [
  { key: "library", path: "/library" },
  { key: "guestbook", path: "/guestbook" },
] as const;

/** 带语言前缀 + 尾斜杠（next.config 开了 trailingSlash） */
export function localePath(locale: string, path: string) {
  return `/${locale}${path === "/" ? "" : path}/`;
}
