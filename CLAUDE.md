# 个人网页项目 · 工作约定（CLAUDE.md）

**任何会话开工之前，必须先读：**
1. `docs/PLAN.md` —— 总体规划（需求、技术栈、页面结构、设计规范、阶段划分）
2. `docs/进度.md` —— 当前进度，明确自己该做哪个阶段
3. `docs/素材清单.md` —— 哪些素材已到位、哪些用占位

## 硬性规则

- **技术栈锁定**：Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion + next-intl。不得更换框架或引入数据库/后端。整站必须兼容静态导出（部署平台未定，因此不用 middleware/proxy 等服务器运行时特性）。
- **只做当前阶段**：进度文件里标注了下一个待做阶段，只做它，不要提前做后面阶段的内容。
- **视觉稿是唯一视觉依据**：`docs/design/` 下五个画板（Intro/Main/BlogContact/Lounge/Tools 的 .dc.html，用浏览器打开查看）。实现涉及的页面必须先打开对应画板对照，还原其布局、间距、灰阶层级与动效气质；PLAN.md §5 是从画板提取的 tokens 摘要。除工具页图标 hover 亮品牌色外，全站只用黑白灰。
- **黑白设计系统**：严格遵守 PLAN.md §5。动效克制，尊重 prefers-reduced-motion。
- **双语**：所有用户可见文案必须同时提供中文和英文（走 next-intl 字典），不允许硬编码单语文案。
- **内容即文件**：文章/项目/介绍都在 `content/` 目录的 markdown 里，不写死在组件中。
- **素材占位**：Logo、音频、文章等素材未提供时用占位符，并在 docs/素材清单.md 里标注"待替换"。

## 完工流程（每个阶段结束时）

1. `npm run build` 确认构建通过，`npm run dev` 自查主要页面。
2. 更新 `docs/进度.md`：勾掉完成项，写清做了什么、遗留什么、下一阶段注意什么。
3. git commit（信息用中文，说明本阶段成果），如已配置远程则 push。

## 常用命令

- `npm run dev` — 本地开发（http://localhost:3000）
- `npm run build` — 生产构建（每次完工必须跑）

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
