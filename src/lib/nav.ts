/**
 * 顶部导航。
 *
 * 2026-09-08 起从左侧边栏改成**顶栏**（站主要求：导航像常规网站一样横在最上面，
 * 下面的页面用整幅宽度）。同一轮里两处合并、一处删除：
 *
 *   博客 /blog     ← 原「文章」+「新闻」，页内用筛选切（文章 / 世界新闻 / AI 更新）
 *   爱好 /hobbies  ← 原「摄影」+「唱片」+「书影音」，页内用筛选切
 *   留言板         整个下线（文章底下的 giscus 评论保留）
 *
 * 所以侧栏时代的四组分组（作品 / 写作 / 嗜好 / 关于）不再需要，顶栏是平铺的一行。
 * 同一轮里「专注」（/focus）那个整屏页面也下线了：番茄钟和手记搬进了项目页的
 * 「小工具」筛选，时刻表整个撤掉（见 components/gadgets/Gadgets）。
 */
/** 首页就是语言根路径 —— 2026-09-01 起开场页下线，/zh/ 直接是首页，不再有 /zh/home/ */
export const NAV_HOME = { key: "home", path: "" } as const;

/** 顶栏平铺的八项（含首页），顺序即左到右的顺序 */
export const NAV_TOP = [
  NAV_HOME,
  { key: "projects", path: "/projects" },
  { key: "videos", path: "/videos" },
  { key: "blog", path: "/blog" },
  { key: "hobbies", path: "/hobbies" },
  { key: "tools", path: "/tools" },
  { key: "about", path: "/about" },
  { key: "contact", path: "/contact" },
] as const;

export type NavKey =
  | (typeof NAV_TOP)[number]["key"]
  /** 下面这些已经不是独立页面了，只作为 ⌘K 的搜索别名存在（见 NAV_ALIASES） */
  | "photos"
  | "records"
  | "library"
  | "news"
  | "gadgets";

export type NavItem = { key: NavKey; path: string };

/**
 * ⌘K 里的搜索别名 —— 合并掉的四个旧板块仍然要能被搜到，
 * 搜「摄影」跳 /hobbies 并直接停在摄影那一栏（hash 由 SegmentedTabs 认）。
 */
export const NAV_ALIASES: readonly NavItem[] = [
  { key: "photos", path: "/hobbies#photos" },
  { key: "records", path: "/hobbies#records" },
  { key: "library", path: "/hobbies#library" },
  { key: "news", path: "/blog#world" },
  { key: "gadgets", path: "/projects#gadgets" },
];

/** 摊平的全部页面（⌘K 面板、sitemap 用；别名不进 sitemap，只进 ⌘K） */
export const NAV_ITEMS: readonly NavItem[] = [...NAV_TOP];

/**
 * 带语言前缀 + 尾斜杠（next.config 开了 trailingSlash）。
 * path 里可以带 `#hash`，斜杠要补在 hash 前面：/zh/hobbies/#photos
 */
export function localePath(locale: string, path: string) {
  const [route, hash] = path.split("#");
  const base = `/${locale}${route === "/" ? "" : route}/`;
  return hash ? `${base}#${hash}` : base;
}
