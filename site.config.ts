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
  | "douyin"
  | "rss";

export type Social = {
  key: SocialKey;
  label: string;
  labelEn: string;
  href: string;
  handle: string;
};

export const siteConfig = {
  /* --- 身份 --- */
  name: "[你的名字]",
  nameEn: "[Your Name]",
  tagline: "[一句话定位 —— 这句我们一起磨]",
  taglineEn: "[ONE LINE IN ENGLISH]",
  since: "2026",

  /* --- 联系方式 --- */
  email: "[your@email.com]",

  /* --- 站点元信息（部署平台定了再填真实域名）--- */
  url: "https://example.com",
  locales: ["zh", "en"] as const,
  defaultLocale: "zh" as const,

  /* --- 资源 --- */
  logo: "/logo/wl-logo.png",

  /* --- 社交平台（链接留空 = 暂未提供，UI 上按占位处理）--- */
  socials: [
    { key: "x", label: "X", labelEn: "X", href: "", handle: "@[用户名]" },
    { key: "github", label: "GitHub", labelEn: "GitHub", href: "", handle: "@[用户名]" },
    { key: "bilibili", label: "哔哩哔哩", labelEn: "Bilibili", href: "", handle: "[主页]" },
    { key: "youtube", label: "YouTube", labelEn: "YouTube", href: "", handle: "[频道]" },
    { key: "xiaohongshu", label: "小红书", labelEn: "Xiaohongshu", href: "", handle: "[主页]" },
    { key: "douyin", label: "抖音", labelEn: "Douyin", href: "", handle: "[主页]" },
    { key: "rss", label: "RSS", labelEn: "RSS", href: "/rss.xml", handle: "" },
  ] satisfies Social[],

  /* --- 放松区（阶段 4 用）--- */
  lounge: {
    /** 网易云歌单外链 id，如 ["123456789"] */
    neteasePlaylists: [] as string[],
    /** 播客嵌入地址（小宇宙 / YouTube 播放列表） */
    podcastEmbeds: [] as string[],
    /**
     * 氛围场景。音频路径已按约定的文件名预填好 —— 把 CC0 素材下载成这些名字丢进
     * `public/audio/ambient/` 就自动生效，不用改这里（见该目录的 README）。
     * 文件还不在时页面照常运行，只是没声音，底部会提示一行。
     * 场景名走 messages 的 lounge.scenes（双语），这里只管 key 和音频。
     */
    scenes: [
      { key: "rain", audio: "/audio/ambient/rain.mp3" },
      { key: "waves", audio: "/audio/ambient/waves.mp3" },
      { key: "fire", audio: "/audio/ambient/fire.mp3" },
      { key: "space", audio: "/audio/ambient/space.mp3" },
    ],
  },

  /* --- 评论 / 留言板（阶段 3 用，需要 public 仓库 + 开 Discussions）--- */
  giscus: {
    repo: "",
    repoId: "",
    category: "Announcements",
    categoryId: "",
    /**
     * giscus 主题。默认 light（内容区本来就是浅灰底）。
     * 想用 public/giscus.css 那份黑白主题，填它的**绝对地址**，
     * 例如 "https://你的域名/giscus.css" —— giscus 的 iframe 在别的域，
     * 只认绝对 URL，而且托管方要允许跨域取这个文件。
     */
    theme: "light",
  },

  /* --- 访问统计（阶段 5 部署时接）--- */
  analytics: {
    umamiSrc: "",
    umamiWebsiteId: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
