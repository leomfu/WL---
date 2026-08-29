# 个人网站

黑白极简风格的个人网站：介绍、项目、博客/文章/想法、视频、工具、联系，
外加一个沉浸式「放松区」。中英双语，纯静态，无后端。

## 开工前必读

1. `CLAUDE.md` —— 工作约定
2. `docs/PLAN.md` —— 总体规划（唯一事实来源）
3. `docs/进度.md` —— 当前进度，确认自己该做哪个阶段
4. `docs/design/` —— 五个 UI 画板（`.dc.html`，浏览器直接打开），**唯一视觉依据**

## 技术栈

Next.js 16（App Router）· TypeScript · Tailwind CSS v4 · Motion · next-intl · gray-matter

全站 `output: "export"` 静态导出，不依赖服务器运行时，因此不使用 middleware。

## 命令

```bash
npm run dev     # 本地开发 http://localhost:3000
npm run build   # 生产构建 + 静态导出到 out/
npm run lint
```

## 目录

```
src/app/[locale]/     语言分段路由（/zh 默认、/en）
src/components/       组件
src/i18n/             next-intl 路由与请求配置
messages/             中英文案字典
content/              内容即文件（见 content/README.md）
site.config.ts        站点信息：姓名、邮箱、社交链接等
docs/design/          UI 视觉稿画板
```
