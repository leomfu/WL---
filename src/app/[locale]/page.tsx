import { setRequestLocale } from "next-intl/server";
import { IntroScreen } from "@/components/intro/IntroScreen";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Hello 开场页 —— 对照 docs/design/Intro.dc.html */
export default async function IntroPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const homeHref = `/${locale}/home/`;

  return (
    <>
      {/*
        本次会话已经进过站的话，在 HTML 解析阶段就跳走——早于首次绘制，
        回访者不会先闪一下开场页。组件里的 useEffect 是客户端路由跳回来时的兜底。
        例外：URL 带 ?replay=1（侧栏 Logo 点回来主动重看开场页）时不拦。
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("intro-seen")==="1"&&!/[?&]replay=1(?:&|$)/.test(location.search))location.replace(${JSON.stringify(homeHref)})}catch(e){}`,
        }}
      />
      <IntroScreen />
    </>
  );
}
