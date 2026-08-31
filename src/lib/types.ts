/**
 * content/ 里各类条目的类型 —— 单独放一个文件，
 * 因为客户端组件也要用它们，而 content.ts 里有 node:fs，不能进浏览器包。
 */

export type Lang = "zh" | "en";

export type Project = {
  slug: string;
  name: string;
  name_en?: string;
  desc: string;
  desc_en?: string;
  stack?: string[];
  link?: string;
  repo?: string;
  featured?: boolean;
  year?: string;
};

export type Video = {
  platform: "bilibili" | "youtube";
  id: string;
  title: string;
  title_en?: string;
  date: string;
  desc: string;
  desc_en?: string;
  /** 封面图（public 下路径），未加载播放器时显示 */
  cover?: string;
};

export type Tool = {
  name: string;
  desc: string;
  desc_en?: string;
  url: string;
  icon: string;
  brandColor?: string;
};

export type PostType = "blog" | "essay" | "thought";

export type Post = {
  slug: string;
  title: string;
  title_en?: string;
  date: string;
  type: PostType;
  tags: string[];
  lang: Lang;
  summary: string;
  summary_en?: string;
  body: string;
  minutes: number;
};

export type LibraryType = "book" | "movie" | "album";

export type LibraryItem = {
  type: LibraryType;
  title: string;
  title_en?: string;
  creator: string;
  creator_en?: string;
  rating?: number;
  note?: string;
  note_en?: string;
  date: string;
  link?: string;
};

/**
 * 一首歌。两个来源：
 * - kind "local"：自己托管在 public/audio/music/ 的公共领域录音，完整播放（「常驻」）
 * - kind "apple"：Apple 官方 30 秒预览（content/music/chart.json，见 docs/如何加歌.md）
 *
 * ⚠️ 2026-08-30：网易云那组（content/music/netease.json）已经从界面上退休，
 * 歌基本被 Apple 榜单覆盖了，两组并存只会让访客困惑。数据文件和 `npm run music`
 * 脚本还留着（万一要回退），但 lib/content.ts 不再读它。
 */
export type TrackKind = "local" | "apple";

export type Track = {
  id: string;
  kind: TrackKind;
  /** 音频地址：本地是站内路径，Apple 那组是官方预览直链 */
  src: string;
  title: string;
  titleEn: string;
  artist: string;
  artistEn: string;
  /**
   * **整首歌**的长度（秒）—— 榜单里显示的是这个。
   * 注意 Apple 那组的音频文件只有 30 秒，播放器的总时长要读 <audio> 的真实 duration，
   * 不能拿这个字段当分母。
   */
  duration: number;
  /**
   * true = src 指向的是一段 30 秒的官方预览，不是完整的歌。
   * Apple 的预览**本身就是独立的 30 秒文件**，所以不需要「seek 到中间 + 到点淡出」
   * 那套窗口逻辑（那是给网易云整首直链设计的，已经退休）。
   */
  clip?: boolean;
  /** 专辑封面（站内路径，由 scripts/fetch-music-chart.mjs 下载） */
  cover?: string;
  album?: string;
  /**
   * 一句歌曲描述（唱机右侧信息栏用）。只有 chart.json 的场景榜单里手填了才有，
   * 常驻那组没有这两个字段，界面要按「没有就不显示」处理，别开天窗。
   * ⚠️ 现在 chart.json 里这些描述是 AI 代拟的初稿（该条 JSON 会带 `descDraft: true`，
   * 这个标记不进 Track 类型，是给站主看的元数据），站主应该换成自己的话——
   * 见 docs/如何加歌.md。
   */
  desc?: string;
  descEn?: string;
  /** 去平台听完整版（Apple Music 单曲页）。本地曲目没有 */
  platformUrl?: string;
};

/** 榜单里的一组 —— 一个心情场景，组名双语存在 content/music/chart.json 里 */
export type MusicScene = {
  key: string;
  label: string;
  labelEn: string;
  tracks: Track[];
};

export type MusicLibrary = {
  /** 自托管的公共领域录音，完整播放 */
  resident: Track[];
  /** 按心情场景分组的 Apple 榜单 */
  scenes: MusicScene[];
  /** 常驻曲库的出处声明 */
  residentCredit: string;
};

/** 新闻页（content/news/）—— 两个板块：世界新闻、AI 更新 */
export type NewsItem = {
  title: string;
  url: string;
  source: string;
  sourceEn: string;
  at: string | null;
  /** 北京时间 YYYY-MM-DD，页面按它分组 */
  date: string;
};

export type Outlet = { name: string; url: string; note: string };

export type NewsBoard = {
  key: "world" | "ai";
  outlets: Outlet[];
  items: NewsItem[];
};

/** 一条 AI 更新的中文解读（content/news/digests.json） */
export type Digest = {
  date: string;
  title: string;
  titleEn: string;
  source: string;
  url: string;
  /** 段落之间用空行分隔 */
  body: string;
  bodyEn: string;
};

export type NewsData = {
  generatedAt: string;
  world: NewsBoard;
  ai: NewsBoard;
  digests: Digest[];
};

/**
 * 唱片页「我听的」那面墙的一条（content/music/records.json）。
 *
 * ⚠️ 2026-08-30：这面墙已经从唱片页撤掉了 —— 新的场景榜单覆盖了它的作用且更好
 * （有封面、能试听、也能跳平台），同一页两块高度重复的内容没有意义。
 * 数据文件和 `npm run records` 脚本保留不删，类型和 getRecords() 也留着，方便回退。
 *
 * kind 只影响副标题的措辞：album 显示艺人，artist 显示「歌手」。
 * cover 是**站内**路径（封面由 scripts/fetch-record-covers.mjs 下载到 public/images/records/，
 * 不热链别人的图床）；没有 cover 的条目退化成纯文字卡片，页面不会开天窗。
 */
export type RecordItem = {
  id: string;
  kind: "album" | "artist";
  title: string;
  titleEn?: string;
  artist?: string;
  artistEn?: string;
  year?: string;
  cover?: string;
  /** 封面原始地址，只给取图脚本用，页面不碰 */
  coverSource?: string;
  url?: string;
  note?: string;
  noteEn?: string;
};
