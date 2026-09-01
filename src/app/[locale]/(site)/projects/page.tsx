import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListRow, ListRowGroup } from "@/components/ui/ListRow";
import { ContentFooter, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getProjects, getUsedRepos, localized } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { localePath } from "@/lib/nav";
import { routing } from "@/i18n/routing";
import { siteConfig } from "~/site.config";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "projects", "/projects");
}

/**
 * 项目页 —— 视觉稿没有单独画这一页，沿用 BlogContact 画板列表页的骨架：
 * 左列窄标签 + 右列标题/一句话，条目之间细线分隔。
 *
 * 顶部**两个筛选**（和新闻页同一个 ui/SegmentedTabs）：
 *   我做的      content/projects/projects.json —— 站主自己的作品，左列是年份
 *   用到的开源  content/projects/repos.json    —— 别人的仓库，左列是它在这个站里干什么
 *
 * ⚠️ **两块必须分开。** 混在一张清单里会让人以为这些开源项目都是他写的。
 * 类型也是分开的（Project / UsedRepo），别为了省事合并。
 *
 * 两块内容都在服务端渲染好，作为 props 交给筛选组件；没选中的那块只是挂了 hidden，
 * 仍在 DOM 里 —— ⌘K 搜索、页内查找和爬虫都拿得到。
 */
export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const tHome = await getTranslations("home");

  const projects = getProjects();
  const repos = getUsedRepos();
  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;

  const mineBlock = (
    <div className="mt-7">
      <p className="mb-6 text-[13.5px] leading-[1.9] text-muted">{t("mineNote")}</p>
      <ListRowGroup>
        {projects.map((project, i) => {
          const label = localized(locale, project.name, project.name_en);
          return (
            <ListRow
              key={project.slug}
              last={i === projects.length - 1}
              left={project.year}
              title={
                project.link ? (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border-b border-ink pb-0.5 text-[15.5px] text-ink"
                  >
                    {label} ↗
                  </a>
                ) : (
                  label
                )
              }
              desc={localized(locale, project.desc, project.desc_en)}
              footer={
                <div className="flex flex-wrap items-center gap-2.5 text-[10.5px] tracking-[0.1em] text-faint">
                  {project.stack?.map((tech) => (
                    <span key={tech} className="tag-framed">
                      {tech}
                    </span>
                  ))}
                  {project.repo && (
                    <a
                      href={project.repo}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="border-b border-line-strong pb-px text-faint transition-colors hover:border-ink hover:text-ink"
                    >
                      {t("repo")} ↗
                    </a>
                  )}
                  {!project.link && !project.repo && <span>{t("noLink")}</span>}
                </div>
              }
            />
          );
        })}
      </ListRowGroup>
    </div>
  );

  const usesBlock = (
    <div className="mt-7">
      <p className="mb-6 text-[13.5px] leading-[1.9] text-muted">
        {t("usesNote", { n: repos.length })}
      </p>
      <ListRowGroup>
        {repos.map((item, i) => (
          <ListRow
            key={item.repo}
            last={i === repos.length - 1}
            left={localized(locale, item.role, item.role_en)}
            title={
              <span className="inline-flex flex-wrap items-baseline gap-2.5">
                <a
                  href={item.repo}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="border-b border-ink pb-0.5 font-mono text-[14.5px] text-ink"
                >
                  {item.name} ↗
                </a>
                {/* 站主自己找来的，和「构建依赖」区分开 */}
                {item.mine && (
                  <span className="tag-framed text-[10.5px] tracking-[0.1em] text-faint">
                    {t("foundByMe")}
                  </span>
                )}
              </span>
            }
            desc={localized(locale, item.desc, item.desc_en)}
          />
        ))}
      </ListRowGroup>
    </div>
  );

  return (
    <>
      <PageHeader title={t("title")} />

      {/* 两个筛选就摆在原来那句导语的位置 */}
      <Reveal delay={120} className="mt-8">
        <SegmentedTabs
          storageKey="projects-tab"
          tabs={[
            { key: "mine", label: t("tabMine"), content: mineBlock },
            { key: "uses", label: t("tabUses"), content: usesBlock },
          ]}
        />
      </Reveal>

      <Reveal delay={240}>
        <ContentFooter
          note={t.rich("footerNote", {
            link: (chunks) => (
              <Link href={localePath(locale, "/contact")} className="link-underline">
                {chunks}
              </Link>
            ),
          })}
          copyright={tHome("copyright", { year: siteConfig.since, name })}
        />
      </Reveal>
    </>
  );
}
