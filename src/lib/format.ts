/** 双语取值和日期格式化 —— 纯函数，服务端和客户端组件都能用。 */

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** 目标语言字段没填就退回中文（占位阶段常见） */
export function localized(locale: string, zh: string, en?: string) {
  return locale === "en" && en ? en : zh;
}

/** 列表里的短日期：中文 08 · 20，英文 Aug 20 */
export function shortDate(date: string, locale: string) {
  const [, m, d] = date.split("-");
  if (!m || !d) return date;
  return locale === "en" ? `${MONTHS_SHORT[Number(m) - 1]} ${d}` : `${m} · ${d}`;
}

/** 正文里的长日期：2026 年 8 月 24 日 / August 24, 2026 */
export function longDate(date: string, locale: string) {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return locale === "en"
    ? `${MONTHS_LONG[Number(m) - 1]} ${Number(d)}, ${y}`
    : `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

/** 「现在是」旁边那行月份：2026 年 8 月 / August 2026 */
export function monthLabel(date: string, locale: string) {
  const [y, m] = date.split("-");
  if (!y || !m) return date;
  return locale === "en" ? `${MONTHS_LONG[Number(m) - 1]} ${y}` : `${y} 年 ${Number(m)} 月`;
}

/** 列表里的年份分隔行用 */
export const yearOf = (date: string) => date.slice(0, 4);

/** 阅读时长：中文按 350 字/分钟，英文按 200 词/分钟，两者相加后向上取整 */
export function readingMinutes(source: string) {
  const cjk = (source.match(/[一-鿿㐀-䶿]/g) ?? []).length;
  const words = source
    .replace(/[一-鿿㐀-䶿]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 350 + words / 200));
}

/** 摘要兜底：正文前 N 字（去掉 markdown 标记） */
export function excerpt(source: string, limit = 90) {
  const plain = source
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > limit ? `${plain.slice(0, limit)}…` : plain;
}
