import type { Note } from "./useNotes";
import { siteConfig } from "~/site.config";

/**
 * 手记 → 可提交的 markdown。这一层是整个手记功能的**重点**：
 * 编辑器长得好不好看无所谓，从「写完」到「站上有这篇文章」那条路有多短才要紧。
 */

/** GitHub 服务端的 URL 上限。超了会直接 414，所以要提前判断退回复制 */
export const GITHUB_URL_LIMIT = 8191;

/** 中日韩表意文字（按字算），其余按空白分词算 */
export function countWords(text: string) {
  const cjk = (text.match(/[一-鿿㐀-䶿぀-ヿ]/g) ?? [])
    .length;
  const latin = text
    .replace(/[一-鿿㐀-䶿぀-ヿ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latin;
}

/** 中文约 400 字/分钟，西文约 200 词/分钟；再快也至少记 1 分钟 */
export function readingMinutes(text: string) {
  const cjk = (text.match(/[一-鿿㐀-䶿぀-ヿ]/g) ?? [])
    .length;
  const latin = countWords(text) - cjk;
  return Math.max(1, Math.round(cjk / 400 + latin / 200));
}

/** front-matter 里带冒号、方括号、引号的值必须包起来，否则 YAML 解析会炸 */
const yamlValue = (value: string) =>
  /[:#[\]{}'"&*!|>%@`]|^\s|\s$/.test(value)
    ? `"${value.replace(/"/g, '\\"')}"`
    : value;

const dateOf = (note: Note) =>
  new Date(note.created).toLocaleDateString("sv-SE"); // sv-SE 正好是 YYYY-MM-DD

/**
 * 生成一篇完整的 .md。字段和 content/posts/ 里现有的对齐
 * （见 docs/如何更新内容.md 的模板），没填的就不写进去 ——
 * 空的 title_en 会让英文页显示一行空白，不如让它回退到中文原文。
 */
export function toMarkdown(note: Note) {
  const title = note.title.trim() || "未命名";
  const lines = [
    "---",
    `title: ${yamlValue(title)}`,
    `date: ${dateOf(note)}`,
    "type: blog",
    "lang: zh",
    "---",
    "",
    note.body.trim(),
    "",
  ];
  return lines.join("\n");
}

/** 全部便签打成一个文件 —— 清浏览器数据之前的救命稻草 */
export function toBackup(notes: Note[]) {
  const stamp = new Date().toLocaleString("sv-SE");
  const head = `# 手记备份 · ${stamp}\n\n共 ${notes.length} 条。这个文件是纯文本，随便用什么打开都行。\n`;
  const body = notes
    .map((note) => {
      const when = new Date(note.updated).toLocaleString("sv-SE");
      const name = note.title.trim() || when;
      return `\n---\n\n## ${name}\n\n> ${note.kind === "draft" ? "草稿" : "备忘"} · 最后修改 ${when}\n\n${note.body.trim()}\n`;
    })
    .join("");
  return head + body;
}

const fileName = (note: Note) => {
  const slug = note.slug.trim().replace(/\.md$/i, "") || dateOf(note);
  return `${slug}.md`;
};

/**
 * GitHub 新建文件页支持用 filename / value 预填 —— 也就是说点一下过去，
 * 编辑框里已经躺着写好的文章，只要按 Commit。不需要任何令牌。
 * 代价是整条 URL 有 8191 字节上限，编码后一个汉字占 9 字节，大约 880 字封顶。
 */
export function githubNewFileUrl(note: Note) {
  const path = `content/posts/${fileName(note)}`;
  const url =
    `https://github.com/${siteConfig.giscus.repo}/new/main` +
    `?filename=${encodeURIComponent(path)}` +
    `&value=${encodeURIComponent(toMarkdown(note))}`;
  return { url, path, tooLong: url.length > GITHUB_URL_LIMIT };
}

/** 塞不进 URL 时的退路：开一个空白的新建文件页，正文自己粘 */
export const githubBlankUrl = () =>
  `https://github.com/${siteConfig.giscus.repo}/new/main?filename=${encodeURIComponent("content/posts/")}`;
