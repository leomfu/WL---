/**
 * 侧边栏导航。
 *
 * 2026-08-30 起改成**分组**：加上摄影和唱片之后平铺就有十几项了，
 * 一列平铺的清单读起来没有落点，所以按「作品 / 写作 / 嗜好 / 关于」分四组，
 * 组标题用极淡的小字 + 大字距（对照画板里 label 的处理）。
 * 首页不属于任何一组，单独留在最上面。
 *
 * 书影音和留言板原先不进侧边栏（PLAN.md §4），分组之后位置够了，收进「嗜好 / 关于」两组。
 */
/** 首页就是语言根路径 —— 2026-09-01 起开场页下线，/zh/ 直接是首页，不再有 /zh/home/ */
export const NAV_HOME = { key: "home", path: "" } as const;

export const NAV_GROUPS = [
  {
    key: "works",
    items: [
      { key: "projects", path: "/projects" },
      { key: "photos", path: "/photos" },
      { key: "videos", path: "/videos" },
    ],
  },
  {
    key: "writing",
    items: [
      { key: "blog", path: "/blog" },
      { key: "news", path: "/news" },
    ],
  },
  {
    key: "hobbies",
    items: [
      // /records 由唱片板块提供
      { key: "records", path: "/records" },
      { key: "library", path: "/library" },
      { key: "focus", path: "/focus" },
    ],
  },
  {
    key: "about",
    items: [
      { key: "tools", path: "/tools" },
      { key: "about", path: "/about" },
      { key: "guestbook", path: "/guestbook" },
      { key: "contact", path: "/contact" },
    ],
  },
] as const;

export type NavGroupKey = (typeof NAV_GROUPS)[number]["key"];
export type NavKey =
  | typeof NAV_HOME.key
  | (typeof NAV_GROUPS)[number]["items"][number]["key"];

/** 摊平的全部页面（⌘K 面板、sitemap 用） */
export type NavItem = { key: NavKey; path: string };

export const NAV_ITEMS: readonly NavItem[] = [
  NAV_HOME,
  ...NAV_GROUPS.flatMap<NavItem>((group) => [...group.items]),
];

/** 带语言前缀 + 尾斜杠（next.config 开了 trailingSlash） */
export function localePath(locale: string, path: string) {
  return `/${locale}${path === "/" ? "" : path}/`;
}
