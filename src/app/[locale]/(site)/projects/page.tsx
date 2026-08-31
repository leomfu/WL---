import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListRow, ListRowGroup } from "@/components/ui/ListRow";
import { ContentFooter, PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getProjects, localized } from "@/lib/content";
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
 * 项目列表 —— 视觉稿没有单独画这一页，沿用 BlogContact 画板列表页的骨架：
 * 左列年份 + 右列标题/一句话/技术栈，条目之间细线分隔。
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
  const name = locale === "en" ? siteConfig.nameEn : siteConfig.name;

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />

      <Reveal delay={120} className="mt-10">
        <ListRowGroup>
          {projects.map((project, i) => {
            const label = localized(locale, project.name, project.name_en);
            const desc = localized(locale, project.desc, project.desc_en);

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
                desc={desc}
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
                        className="border-b border-line-strong pb-px text-faint transition-colors hover:text-ink hover:border-ink"
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
