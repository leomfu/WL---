import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  // 静态导出不能用 middleware，所以两种语言都带前缀：/zh、/en
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
