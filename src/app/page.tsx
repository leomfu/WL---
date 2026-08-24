import { routing } from "@/i18n/routing";

/**
 * 根路径 /：跳到默认语言。
 * 静态导出不能用 middleware / redirect()，所以这里输出一张最小的跳转页
 * （meta refresh + location.replace 双保险，禁用 JS 也能走）。
 * 底色跟开场页一致，跳转过程中不会闪白。
 */
export default function RootRedirectPage() {
  const target = `/${routing.defaultLocale}/`;

  return (
    <html lang={routing.defaultLocale}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="refresh" content={`0; url=${target}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, background: "#060606" }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `location.replace(${JSON.stringify(target)})`,
          }}
        />
        <noscript>
          <a href={target} style={{ color: "#EDEDED", fontFamily: "system-ui" }}>
            进入 / Enter
          </a>
        </noscript>
      </body>
    </html>
  );
}
