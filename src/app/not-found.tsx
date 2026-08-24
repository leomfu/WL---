import Link from "next/link";
import { routing } from "@/i18n/routing";

/**
 * 404 —— 静态导出会把它写成 out/404.html。
 * 根 layout 不渲染 html/body（骨架在 [locale]/layout.tsx 里），所以这里自带一份，
 * 底色跟开场页一致。中英双语并排，因为这时候还不知道访客要哪种语言。
 */
export default function NotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          background: "#060606",
          color: "#EDEDED",
          fontFamily: "Inter, 'PingFang SC', system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.3em", color: "#5A5A5A" }}>
          404
        </span>
        <span style={{ fontSize: 15, color: "#A3A3A3" }}>
          这里什么都没有 · Nothing here
        </span>
        <span style={{ display: "flex", gap: 18, fontSize: 13 }}>
          <Link href="/zh/home/" style={{ color: "#EDEDED", textDecoration: "none", borderBottom: "1px solid #333" }}>
            回首页
          </Link>
          <Link href="/en/home/" style={{ color: "#EDEDED", textDecoration: "none", borderBottom: "1px solid #333" }}>
            Home
          </Link>
        </span>
      </body>
    </html>
  );
}
