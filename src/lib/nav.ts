/**
 * 顶部导航。
 *
 * 2026-09-08 起从左侧边栏改成**顶栏**（站主要求：导航像常规网站一样横在最上面）。
 * 导航组钉在视窗正中（三段式：左 Logo / 中 导航 / 右 语言 + 社交 + ⌘K）。
 *
 * 同一天的第二轮又调了一次板块划分，**现在这一份是最新的**：
 *   博客 /blog    ← 「文章」+「新闻」合并，页内筛选（文章 / 世界新闻 / AI 更新）
 *   关于 /about   ← 自我介绍 + 「我的爱好」那张同心轨道图（components/about/HobbyOrbit）
 *   留言板        下线（文章底下的 giscus 评论保留）
 *   专注 /focus   下线，番茄钟和手记进了项目页的「小工具」筛选
 *
 * ⚠️ 摄影 / 唱片 / 书影音**又变回三个独立页面**了（第一轮合并成过 /hobbies，
 * 站主第二轮要求撤销）。它们不进顶栏 —— 入口是关于页那张轨道图，
 * 点哪个节点就去哪一页；⌘K 和 sitemap 里也都有。
 */
/** 首页就是语言根路径 —— 2026-09-01 起开场页下线，/zh/ 直接是首页，不再有 /zh/home/ */
export const NAV_HOME = { key: "home", path: "" } as const;

/** 顶栏平铺的七项（含首页），顺序即左到右的顺序 */
export const NAV_TOP = [
  NAV_HOME,
  { key: "projects", path: "/projects" },
  { key: "videos", path: "/videos" },
  { key: "blog", path: "/blog" },
  { key: "tools", path: "/tools" },
  { key: "about", path: "/about" },
  { key: "contact", path: "/contact" },
] as const;

/**
 * 三个爱好页 —— 真实页面，只是不进顶栏。
 * 入口在关于页那张轨道图上；⌘K 和 sitemap 里也都有。
 */
export const NAV_EXTRA = [
  { key: "photos", path: "/photos" },
  { key: "records", path: "/records" },
  { key: "library", path: "/library" },
] as const;

export type NavKey =
  | (typeof NAV_TOP)[number]["key"]
  | (typeof NAV_EXTRA)[number]["key"]
  /** 下面这两个不是独立页面，只作为 ⌘K 的搜索别名存在（见 NAV_ALIASES） */
  | "news"
  | "gadgets";

export type NavItem = { key: NavKey; path: string };

/**
 * ⌘K 里的搜索别名 —— 合并掉的板块仍然要能被搜到。
 * 它们不是独立页面，而是某一页里的一个筛选，靠 `#hash` 直接落到那一栏
 * （hash 由 ui/SegmentedTabs 认）。
 */
export const NAV_ALIASES: readonly NavItem[] = [
  { key: "news", path: "/blog#world" },
  { key: "gadgets", path: "/projects#gadgets" },
];

/** 摊平的全部页面（⌘K 面板、sitemap 用；别名不进 sitemap，只进 ⌘K） */
export const NAV_ITEMS: readonly NavItem[] = [...NAV_TOP, ...NAV_EXTRA];

/**
 * 带语言前缀 + 尾斜杠（next.config 开了 trailingSlash）。
 * path 里可以带 `#hash`，斜杠要补在 hash 前面：/zh/blog/#world
 */
export function localePath(locale: string, path: string) {
  const [route, hash] = path.split("#");
  const base = `/${locale}${route === "/" ? "" : route}/`;
  return hash ? `${base}#${hash}` : base;
}
