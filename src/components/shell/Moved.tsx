import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localePath } from "@/lib/nav";

/**
 * 「这个地址搬走了」的跳转页。
 *
 * 站 2026-08-25 就上线了，2026-09-08 那一轮改版删掉了四条**已经被收录、也可能被
 * 外部链接引用**的地址。静态导出发不了 301（没有 middleware、没有服务器），
 * 所以只能放这种最朴素的跳转页：
 *
 *   `<meta http-equiv="refresh">`  立刻跳走（React 19 会把它提到 <head> 里）
 *   `robots: noindex, follow`       别让搜索引擎把这张空页面当成一个页面收走，
 *                                   但要让它顺着链接爬到新地址去
 *   一句人话 + 一个手动链接           万一自动跳转被拦了，人还能自己点
 *
 * 这个写法是从 2026-08-30 那张 /lounge 跳转页搬回来的（当时板块改名也用了同一招），
 * 改版时连它一起删了，2026-09-09 审出来才补上。
 * **以后再删/改任何已上线的地址，先来这儿加一条。**
 */
export async function Moved({
  locale,
  reasonKey,
  to,
}: {
  locale: string;
  /** messages 的 `moved.<reasonKey>`，一句话说清搬去哪儿了 */
  reasonKey: string;
  /** 新地址，形如 `/blog#world` */
  to: string;
}) {
  const t = await getTranslations({ locale, namespace: "moved" });
  const href = localePath(locale, to);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-shell px-6 text-center text-shell-ink">
      <meta httpEquiv="refresh" content={`0; url=${href}`} />
      <p className="text-[10px] tracking-(--tracking-label) text-shell-faint uppercase">
        {t("label")}
      </p>
      <h1 className="max-w-note font-serif text-[22px] leading-[1.5] font-light sm:text-[26px]">
        {t(reasonKey)}
      </h1>
      <Link
        href={href}
        className="text-[13.5px] text-shell-dim underline decoration-shell-line-3 underline-offset-4 transition-colors hover:text-shell-ink"
      >
        {t("go", { to: href })}
      </Link>
    </main>
  );
}
