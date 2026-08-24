import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { excerpt, readingMinutes } from "./format";
import type {
  LibraryItem,
  Post,
  PostType,
  Project,
  Tool,
  Video,
} from "./types";

/**
 * content/ 的读取层 —— 全部在构建时跑（Node API），组件里不写死内容。
 * 字段约定见 content/README.md。类型在 ./types，日期/双语格式化在 ./format
 * （客户端组件从那两个文件拿，因为这里有 node:fs）。
 */

export type * from "./types";
export * from "./format";

const CONTENT_DIR = path.join(process.cwd(), "content");

const read = (...p: string[]) => fs.readFileSync(path.join(CONTENT_DIR, ...p), "utf8");
const exists = (...p: string[]) => fs.existsSync(path.join(CONTENT_DIR, ...p));
const readJson = <T>(file: string, fallback: T): T =>
  exists(file) ? (JSON.parse(read(file)) as T) : fallback;

/* ------------------------------------------------------------------ 纯 markdown 页 */

/** about / home-intro 这类「一整篇正文」的页面 */
function readDoc(dir: string, base: string, locale: string) {
  const file = `${base}.${locale}.md`;
  const fallback = `${base}.zh.md`;
  const target = exists(dir, file) ? file : fallback;
  if (!exists(dir, target)) return { body: "", data: {} as Record<string, unknown> };
  const parsed = matter(read(dir, target));
  return { body: parsed.content.trim(), data: parsed.data as Record<string, unknown> };
}

export const getAbout = (locale: string) => readDoc("about", "about", locale);
export const getHomeIntro = (locale: string) => readDoc("home", "intro", locale);

export function getNow(locale: string) {
  const { body, data } = readDoc("now", "now", locale);
  return { body, updated: toISODate(data.updated) };
}

/** front-matter 里的日期：gray-matter 会把 2026-08-24 解析成 Date，统一转回 YYYY-MM-DD */
function toISODate(value: unknown) {
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  return value ? String(value) : "";
}

/* ------------------------------------------------------------------ 项目 */


export function getProjects(): Project[] {
  const list = readJson<Project[]>("projects/projects.json", []);
  return [...list].sort((a, b) => (b.year ?? "").localeCompare(a.year ?? ""));
}

/* ------------------------------------------------------------------ 视频 */


export function getVideos(): Video[] {
  return readJson<Video[]>("videos.json", []).sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ 工具 */


export const getTools = () => readJson<Tool[]>("tools.json", []);

/* ------------------------------------------------------------------ 文章 */



export function getPosts(): Post[] {
  if (!exists("posts")) return [];
  return fs
    .readdirSync(path.join(CONTENT_DIR, "posts"))
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const parsed = matter(read("posts", file));
      const d = parsed.data as Record<string, unknown>;
      const body = parsed.content.trim();
      const date = toISODate(d.date);

      return {
        slug: file.replace(/\.md$/, ""),
        title: String(d.title ?? file),
        title_en: d.title_en ? String(d.title_en) : undefined,
        date,
        type: (["blog", "essay", "thought"] as const).includes(d.type as PostType)
          ? (d.type as PostType)
          : "blog",
        tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
        lang: d.lang === "en" ? "en" : "zh",
        summary: String(d.summary ?? excerpt(body)),
        summary_en: d.summary_en ? String(d.summary_en) : undefined,
        body,
        minutes: readingMinutes(body),
      } satisfies Post;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const getPost = (slug: string) => getPosts().find((p) => p.slug === slug);

/* ------------------------------------------------------------------ 书影音 */



export function getLibrary(): LibraryItem[] {
  return readJson<LibraryItem[]>("library/library.json", []).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}
