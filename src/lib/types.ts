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
 * 放松区「音乐」层的一首歌。两个来源：
 * - kind "local"：自己托管在 public/audio/music/ 的公共领域录音，永远能放（「常驻」）
 * - kind "netease"：网易云外链，只收录构建前验证过能真放出声的（「我在听」，见 scripts/fetch-netease.mjs）
 */
export type TrackKind = "local" | "netease";

export type Track = {
  id: string;
  kind: TrackKind;
  /** 音频地址：本地是站内路径，网易云是外链 */
  src: string;
  title: string;
  titleEn: string;
  artist: string;
  artistEn: string;
  /** 秒。本地曲目是准的；网易云那边给的是元数据时长 */
  duration: number;
};

export type MusicLibrary = {
  resident: Track[];
  netease: Track[];
  /** 网易云歌单主页，放在页脚做「听完整歌单」的外链 */
  playlistUrl: string;
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
