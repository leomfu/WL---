import fs from "node:fs";
import path from "node:path";
import {
  photoSrc,
  photoThumb,
  type Album,
  type AlbumData,
  type AlbumKind,
} from "./photoTypes";

/**
 * content/photos/ 的读取层 —— 构建时跑（有 node:fs，不能进浏览器包）。
 * 一辑一个 json，由 `npm run photos` 生成/合并（见 scripts/build-photos.mjs）。
 * 类型和纯函数在 ./photoTypes，客户端组件从那里引。
 */

export type * from "./photoTypes";

const DIR = path.join(process.cwd(), "content", "photos");

/** 全部辑，按日期倒序（新的在前）。上一辑/下一辑也按这个顺序。 */
export function getAlbums(): Album[] {
  if (!fs.existsSync(DIR)) return [];

  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as AlbumData;
      const slug = data.slug || file.replace(/\.json$/, "");

      return {
        ...data,
        slug,
        kind: (data.kind === "feature" ? "feature" : "archive") as AlbumKind,
        photos: (data.photos ?? []).map((photo) => ({
          ...photo,
          src: photoSrc(slug, photo.file),
          thumb: photoThumb(slug, photo.file),
        })),
      } satisfies Album;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const getAlbum = (slug: string) => getAlbums().find((a) => a.slug === slug);

/** 列表页上半部：专题 */
export const featureAlbums = (albums: Album[]) => albums.filter((a) => a.kind === "feature");

/** 列表页下半部：档案，按年份分组（年份倒序） */
export function archiveByYear(albums: Album[]): Array<{ year: string; albums: Album[] }> {
  const groups = new Map<string, Album[]>();
  for (const album of albums.filter((a) => a.kind === "archive")) {
    const year = album.date.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), album]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => ({ year, albums: list }));
}
