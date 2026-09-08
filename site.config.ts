/**
 * 站点配置 —— 所有「关于你本人」的信息集中在这里，组件里不要硬编码。
 * 方括号 [] 包起来的都是占位，素材到位后直接替换（见 docs/素材清单.md）。
 */

export type SocialKey =
  | "x"
  | "github"
  | "bilibili"
  | "youtube"
  | "xiaohongshu"
  | "douyin";

export type Social = {
  key: SocialKey;
  label: string;
  labelEn: string;
  href: string;
  handle: string;
};

export const siteConfig = {
  /* --- 身份 --- */
  name: "伟良",
  nameEn: "Weiliang",
  /**
   * 站点描述（RSS 的 <description>、分享出去时的介绍）—— 说清「这个人是做什么的」。
   * ⚠️ 开场页正中那句**不是这个**，在 messages 的 intro.tagline 里，
   * 那句是给自己看的一句话，和这句职能不同，2026-08-29 起就不一样了，别再同步成一样的。
   */
  tagline: "一个喜欢把问题查到根上、再把答案写下来给下一个人的技术支持新人。",
  taglineEn:
    "A support newcomer who chases problems down to the root, then writes the answer down for the next person.",
  /**
   * 短版一句话 —— 侧边栏那一行和分享图（og.png）都只有一行的位置，
   * 整句放不下会被截断，所以那两处用这个短版。改了要重跑 `npm run og`。
   */
  taglineShort: "把问题查到根上，再写下来",
  taglineShortEn: "Root causes, written down",
  since: "2026",

  /* --- 联系方式 --- */
  email: "weiliang99520@gmail.com",

  /* --- 站点元信息 --- */
  // 部署在 Vercel（项目 weiliang，GitHub 推送自动构建）。正式域名 weiliang.dev —— 2026-08-28
  // 在 Vercel 买的，DNS 也用 Vercel 自家的，所以不用手配 A/CNAME 记录。裸域是主地址，
  // www.weiliang.dev 会 308 永久跳回裸域，所以这里只写裸域。改这个地址**不用**重跑
  // `npm run og` —— 分享图上不含站点地址（生成脚本只取 nameEn / taglineShortEn / since），
  // 真正跟着变的是 meta 里 og:image 那个绝对地址，构建时自动生成。
  url: "https://weiliang.dev",
  locales: ["zh", "en"] as const,
  defaultLocale: "zh" as const,

  /* --- 资源 --- */
  logo: "/logo/wl-logo.png",

  /* --- 社交平台（链接留空 = 暂未提供，UI 上按占位处理）--- */
  socials: [
    {
      key: "x",
      label: "X",
      labelEn: "X",
      href: "https://x.com/WeiliangF27854",
      handle: "@WeiliangF27854",
    },
    {
      key: "github",
      label: "GitHub",
      labelEn: "GitHub",
      href: "https://github.com/leomfu",
      handle: "@leomfu",
    },
    {
      key: "bilibili",
      label: "哔哩哔哩",
      labelEn: "Bilibili",
      href: "https://space.bilibili.com/3546677612907455",
      handle: "主页",
    },
    {
      key: "youtube",
      label: "YouTube",
      labelEn: "YouTube",
      href: "https://www.youtube.com/@WEILIANGFU-s7q",
      handle: "@WEILIANGFU-s7q",
    },
    {
      key: "xiaohongshu",
      label: "小红书",
      labelEn: "Xiaohongshu",
      href: "https://www.xiaohongshu.com/user/profile/63057ac300000000120001cf",
      handle: "主页",
    },
    // 抖音：用户给的 douyin.com/user/self 只对本人生效，不是可分享的主页地址，
    // 等正确链接（见 docs/素材清单.md）。留空时 UI 渲染成不可点的灰字。
    { key: "douyin", label: "抖音", labelEn: "Douyin", href: "", handle: "[主页]" },
  ] satisfies Social[],

  /* --- 小工具（项目页「小工具」那一栏）--- */
  gadgets: {
    /** 番茄钟。分钟数，cycle = 做满几个专注换一次长休 */
    pomodoro: { focus: 25, short: 5, long: 15, cycle: 4 },

    /* 这里原来还有一个 `departures` 时刻表（「去哪儿听完整版」的一串外链），
       和更早的 `scenes`（四套纯 CSS 背景）。2026-09-08 番茄钟和手记从整屏的
       /focus 页搬进项目页时，时刻表按站主要求整个下线了，别再加回来。 */
  },

  /* --- 文章评论（需要 public 仓库 + 开 Discussions；2026-09-08 留言板页下线后只用于文章底部）--- */
  giscus: {
    repo: "leomfu/WL---",
    /** 仓库的 GraphQL node id。取法：curl https://api.github.com/repos/<owner>/<repo> 里的 node_id */
    repoId: "R_kgDOUCPA3g",
    category: "Announcements",
    /**
     * 分类 id。要等仓库开了 Discussions **并且**装好 giscus app 之后才能拿到：
     *   curl "https://giscus.app/api/discussions/categories?repo=leomfu/WL---"
     * 没填之前评论区显示一行"还没开放"，不会向 GitHub 发任何请求。
     */
    categoryId: "DIC_kwDOUCPA3s4DEK0W",
    /**
     * giscus 主题。用的是本站那份黑白主题 public/giscus.css —— giscus 的 iframe 在
     * giscus.app 域下，只认**绝对地址**，所以换域名之后这里要跟着改。
     */
    theme: "https://weiliang.dev/giscus.css",
  },

  /* --- 访问统计（阶段 5 部署时接）--- */
  analytics: {
    umamiSrc: "",
    umamiWebsiteId: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
