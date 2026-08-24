import { Marked } from "marked";
import { bundledLanguages, codeToHtml, type ThemeRegistrationRaw } from "shiki";

/**
 * markdown → HTML。渲染结果套在 .prose-bw 里（样式见 globals.css）。
 *
 * 两处定制：
 * 1. 内部链接（以 / 开头）自动补语言前缀和尾斜杠，外链自动 target=_blank；
 * 2. 代码块用 shiki 高亮，主题是下面这份手写的灰阶主题 —— 全站只用黑白灰，
 *    彩色代码块会破功，所以用字重和深浅来区分 token。
 */

/** 灰阶代码主题：靠 深浅 + 粗细 + 斜体 区分，不用颜色 */
const MONO_THEME: ThemeRegistrationRaw = {
  name: "bw",
  type: "light",
  colors: {
    "editor.background": "#FBFBFB",
    "editor.foreground": "#333333",
  },
  settings: [
    { settings: { foreground: "#333333", background: "#FBFBFB" } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#A3A3A3", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "storage", "storage.type", "keyword.control"],
      settings: { foreground: "#111111", fontStyle: "bold" },
    },
    {
      scope: ["string", "string.quoted", "constant.other.symbol"],
      settings: { foreground: "#5C5C5C" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "#111111" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#111111" },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.type",
        "support.class",
      ],
      settings: { foreground: "#1A1A1A", fontStyle: "bold" },
    },
    {
      scope: ["entity.name.tag"],
      settings: { foreground: "#111111", fontStyle: "bold" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#5C5C5C", fontStyle: "italic" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#8A8A8A" },
    },
  ],
};

const KNOWN_LANGS = new Set(Object.keys(bundledLanguages));

function normalizeHref(href: string, locale: string) {
  // 站内绝对路径：补语言前缀 + 尾斜杠
  if (href.startsWith("/") && !href.startsWith("//")) {
    const clean = href.replace(/\/$/, "");
    return `/${locale}${clean}/`;
  }
  return href;
}

export async function renderMarkdown(source: string, locale: string) {
  const marked = new Marked({ async: true, gfm: true, breaks: false });

  marked.use({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        const attrs = [
          `href="${normalizeHref(href, locale)}"`,
          'class="link-underline"',
          title ? `title="${title}"` : "",
          external ? 'target="_blank" rel="noreferrer noopener"' : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<a ${attrs}>${text}</a>`;
      },
    },
    // 代码块交给 shiki（异步），所以整个 parse 走 async
    async walkTokens(token) {
      if (token.type !== "code") return;
      const lang = (token.lang || "").trim().split(/\s+/)[0];
      const highlighted = await codeToHtml(token.text, {
        lang: KNOWN_LANGS.has(lang) ? lang : "text",
        theme: MONO_THEME,
      });
      // 用 html token 替换掉，跳过 marked 自己的 <pre><code>
      const t = token as unknown as { type: string; text: string; block?: boolean };
      t.type = "html";
      t.text = highlighted;
      t.block = true;
    },
  });

  return (await marked.parse(source)) as string;
}
