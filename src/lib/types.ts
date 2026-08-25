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
