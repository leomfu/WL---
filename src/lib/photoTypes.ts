/**
 * 摄影板块的类型和纯函数 —— 客户端组件（放大看图的那个网格）也要用它们，
 * 所以这里**不能出现 node:fs**。读文件的那一半在 ./photos.ts（只在服务端跑）。
 * 这条边界踩过一次坑：客户端组件一引带 node:fs 的模块，Turbopack 直接 panic。
 */

/** 专题（列表页上半部的大图卡片）/ 档案（下半部按年份分组的清单） */
export type AlbumKind = "feature" | "archive";

/** content/photos/<slug>.json 里 photos 数组的一条（由 npm run photos 写入） */
export type PhotoEntry = {
  /** 展示图文件名，缩略图同名放在 thumb/ 下 */
  file: string;
  /** 展示图的像素尺寸（缩略图同比例） */
  width: number;
  height: number;
  caption?: string;
  captionEn?: string;
};

/** content/photos/<slug>.json 的整体结构 */
export type AlbumData = {
  slug: string;
  kind: AlbumKind;
  title: string;
  titleEn?: string;
  location?: string;
  locationEn?: string;
  /** YYYY-MM-DD；多天的辑再填 dateEnd */
  date: string;
  dateEnd?: string;
  summary?: string;
  summaryEn?: string;
  photos: PhotoEntry[];
};

/** 页面里用的照片：路径已经拼好 */
export type Photo = PhotoEntry & {
  /** 放大看的那张（长边 2000） */
  src: string;
  /** 网格里的那张（宽 600） */
  thumb: string;
};

export type Album = Omit<AlbumData, "photos"> & { photos: Photo[] };

export const photoSrc = (slug: string, file: string) => `/images/photos/${slug}/${file}`;
export const photoThumb = (slug: string, file: string) =>
  `/images/photos/${slug}/thumb/${file}`;

/**
 * 一辑的日期：单日 `2026.07.11`，多日 `2026.07.11 — 07.13`，跨年时两边都写全。
 * 数字写法两种语言通用，不做分支。
 */
export function albumDates(date: string, dateEnd?: string) {
  const dot = (d: string) => d.replaceAll("-", ".");
  if (!dateEnd || dateEnd === date) return dot(date);
  const sameYear = date.slice(0, 4) === dateEnd.slice(0, 4);
  return `${dot(date)} — ${sameYear ? dot(dateEnd).slice(5) : dot(dateEnd)}`;
}

export const albumYear = (album: Pick<AlbumData, "date">) => album.date.slice(0, 4);
