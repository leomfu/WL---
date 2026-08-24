# 个人网页 · 总体规划（PLAN.md）

> 本文件是整个项目的"唯一事实来源"。任何终端开始工作前必须先完整阅读本文件和根目录 CLAUDE.md。
> 参考网站：https://amankumar.ai （排版、导航、留白、极简风格的参照）

## 1. 项目定位

一个黑白极简风格的个人网站，包含：个人介绍、项目展示、博客/文章/想法、邮箱联系、社交平台跳转，以及一个沉浸式"放松区"（听音乐 + 听播客）。中英双语切换。

## 2. 已确认的需求决定

| 决定项 | 结论 |
|---|---|
| 视觉风格 | 黑白为主，极简，大量留白，参考 amankumar.ai 的排版 |
| 开场页 | 进入网站先看到 Hello 开场（个人 Logo + 黑白背景 + 动画），按回车或点击入口图标进入主站 |
| 内容管理 | Markdown 文件放在仓库 `content/` 目录，git 提交即发布 |
| 版本管理 | 使用 git + GitHub 远程仓库 |
| 语言 | 中英双语切换（默认中文），顶部有 EN/中 切换按钮 |
| 放松区 | 三层方案：氛围音自托管（CC0 免费素材，随场景自动淡入）；音乐用**网易云歌单外链播放器**嵌入；播客用小宇宙/YouTube 播放列表嵌入 |
| 扩展功能（已确认要做） | 视频作品区、书影音收藏页、工具页、文章评论 + 访客留言板（giscus）、⌘K 搜索面板、访问统计（部署阶段接入 Umami/Vercel Analytics） |
| 视觉稿（阶段 0 已完成并确认） | `docs/design/` 下 5 个画板：Intro / Main / BlogContact / Lounge / Tools（.dc.html），**是唯一视觉依据**，开发时在浏览器打开对照还原 |
| 布局（按视觉稿定稿） | 桌面端为**左侧暗色侧边栏导航**（264px，可折叠）+ 右侧浅色内容区（700px 内容列），不再用顶部导航 |
| Now | 不单独成页，作为首页"现在是"板块（内容仍由 content/now/ 驱动） |
| 部署 | 暂不决定。开发阶段保证纯静态可导出（`next build` 静态输出），Vercel / Cloudflare Pages / GitHub Pages 都能上 |
| 联系方式 | 展示邮箱 + 一键复制 + mailto 按钮；正式表单等部署平台定了以后再接（Formspree 或 Resend） |
| 社交平台 | X、GitHub、哔哩哔哩、YouTube、小红书、抖音 |

## 3. 技术栈（所有终端必须遵守，不得擅自更换）

- **框架**：Next.js 15（App Router）+ TypeScript
- **样式**：Tailwind CSS v4
- **动画**：Framer Motion（`motion` 包）
- **内容**：Markdown + gray-matter 解析 front-matter，`content/` 目录，构建时读取（不引数据库、不做后端）
- **双语**：`next-intl`（或等价的轻量字典方案），路由形如 `/zh/...` 和 `/en/...`，默认 `/zh`
- **音频**：原生 `<audio>` + 自定义 UI（放松区），音频文件放 `public/audio/`
- **无后端**：整站可静态导出（`output: 'export'` 兼容），任何功能不得依赖服务器运行时

## 4. 网站结构（页面地图）

```
/                → Hello 开场页（对照 design/Intro.dc.html）
  · 深空暗色背景：径向辉光 + 星点闪烁 + 颗粒噪点 + 暗角
  · Logo 居中（反色显示，浮动 + 光泽扫过动画），上下细分割线，NAME / SINCE 两侧标注，一句话定位（中英）
  · "向下滚动进入"按钮（角标框 + 上下浮动）或按 Enter，滚动/回车/点击均可进入
  · 进入后本次会话不再重复显示（sessionStorage）
/home            → 首页（对照 design/Main.dc.html）：衬线大字名字 + 自我介绍两段 +
                    "现在是"（Now 板块，content/now/ 驱动）+ "我在做的"（项目精选）+
                    "我写的"（最新文章列表）+ 页脚邮件一句话
/projects        → 项目列表（名称/一句话/链接/可选截图）
/videos          → 视频作品区：嵌入展示自己在 B站/YouTube 的视频（content/videos.json）
/blog            → "写字的地方"（对照 design/BlogContact.dc.html 上半）：全部/博客/长文/想法
                    标签筛选，日期左列 + 标题 + 摘要 + 标签 + 阅读时长，年份变化插分隔行
/blog/[slug]     → 文章详情页（markdown 渲染，目录，阅读时间，giscus 评论）
/about           → 个人介绍（经历、技能）
/tools           → 工具页（对照 design/Tools.dc.html）：日常工具卡片双列网格，
                    黑白图标 hover 亮各自品牌色 + 卡片上浮
/library         → 书影音收藏页：在看的书/电影/专辑 + 短评（content/library/ 驱动）
/guestbook       → 访客留言板（giscus；Contact 页脚有入口）
/lounge          → 放松区（对照 design/Lounge.dc.html，详见 §6）
/contact         → "说点什么"（对照 design/BlogContact.dc.html 下半）：衬线大字邮箱 +
                    "写邮件/复制地址"按钮（复制后显示"已复制 ✓"）+ "在别处"双列社交清单（@handle ↗）
```

**导航 = 左侧暗色侧边栏**（对照 design/Main.dc.html 左栏，桌面端 264px，可折叠）：
顶部 Logo 圆徽 + 名字 + 一句话定位 → 导航（首页/项目/视频/博客/关于/工具/放松区/联系，当前项浅底反色）→
"连接 / CONNECT" 社交列表（X/GitHub/哔哩哔哩/YouTube/小红书/抖音/RSS）→ 底部 中/EN 切换 + ⌘K 标识。
书影音、留言板不进侧边栏：从内容区页脚和 ⌘K 面板进入。
**移动端**（视觉稿未画，实现时自行推导并保持同一气质）：侧边栏收起为顶部条（Logo + 汉堡），展开为全屏抽屉复用侧栏内容。

**全站交互**：⌘K（移动端为搜索图标）呼出命令面板——搜文章、跳任意页面、切换语言/暗色模式。纯前端实现（构建时生成搜索索引）。

**评论/留言（giscus）前提**：GitHub 仓库必须为 **public** 且开启 **Discussions**，评论数据存在仓库 Discussions 里。文章详情页底部挂评论组件，/guestbook 挂独立留言串。giscus 主题需定制成黑白风格并跟随暗色模式。

## 5. 设计规范（以 docs/design/ 视觉稿为准）

**总原则：视觉稿 5 个画板是唯一视觉依据。实现时在浏览器打开对应 .dc.html 对照还原布局、间距、灰阶层级和动效气质，吃不准就以画板为准。** 以下 tokens 从画板中提取：

- **配色（暗侧）**：侧边栏/开场页/放松区底色 `#0A0A0A`（开场页 `#060606`），主文字 `#EDEDED`，次要 `#A3A3A3`/`#8A8A8A`，弱化 `#5A5A5A`，分割线 `#1F1F1F`/`#262626`，当前导航项反色（`#EDEDED` 底 + `#0A0A0A` 字）。
- **配色（亮侧）**：内容区背景为浅灰渐变 `linear-gradient(158deg, #F1F1F1, #FAFAFA 34%, #F7F7F7 66%, #ECECEC)`，主文字 `#111111`，正文 `#333333`，次要 `#666666`，弱化 `#999999`，分割线 `#E5E5E5`，链接样式 = 文字下细灰底线（`#C9C9C9`），hover 变深。
- **彩色的唯一例外**：工具页图标 hover 时亮各自品牌色（如 Claude 橙 `#C15F3C`）；其余全站黑白灰。
- **字体**：正文 Inter + PingFang SC；大标题用 `Noto Serif SC` 细衬线（font-weight 300，46px 级）制造对比；小标签用大字距全大写（letter-spacing 0.2em 上下）。
- **质感层**（暗色页面标配，见 Intro/Lounge 画板）：径向辉光渐变 + SVG feTurbulence 颗粒噪点（opacity ≈0.06，mix-blend-mode: screen）+ 四周暗角渐晕；开场页另有星点闪烁（dcTwinkle）。
- **动效词汇表**（画板中已定义，代码里用 Framer Motion 等价实现）：
  - `dcRise`：入场淡入上移（各区块 stagger 延迟 ~120ms 递进）
  - `dcWiden`：分割线从中心/一侧划开
  - `dcFloat`/`dcSheen`：Logo 缓慢浮动 + 光泽扫过
  - `dcBob`：进入按钮上下轻浮动
  - `dcBreathe`：放松区同心圆环呼吸（错相 260ms）
  - `dcTwinkle`/`dcGlow`/`dcDrift`：星点闪烁 / 辉光呼吸 / 斜纹漂移
  - 通用：页面切换淡入、hover 下划线、滚动进入视口 stagger 淡入；全部尊重 prefers-reduced-motion
- **暗色模式**：整站本身就是"暗侧栏 + 亮内容"的定稿设计，不做全局明暗切换（如后期想要，阶段 5 再议，不提前实现）。
- **响应式**：视觉稿为 1440px 桌面版；移动端自行推导（§4 末尾的原则），保持同一气质，手机优先保证可读性。

## 6. 放松区（Lounge）详细方案 —— 三层混合

进入 `/lounge` 后是一个**沉浸模式**，分三层：氛围场景 / 音乐 / 播客。

1. **进入动画与沉浸布局**（对照 design/Lounge.dc.html）：整页淡入暗色，左侧边栏收窄为 64px 图标条（仅 Logo + 图标导航，底部竖排"ESC 退出沉浸"提示；鼠标移到左侧或按 ESC 展开恢复）。顶部居中一行弱提示"导航已收起"。画面中心为同心呼吸圆环 + 衬线场景名（如"雨夜 / RAINY NIGHT"），圆环随氛围音音量呼吸。底部依次是：氛围/音乐/播客三个标签 → 场景切换 chips → 暂停按钮 + 音量滑杆 + "循环 · 交叉淡入"标注。
2. **氛围场景**（自托管音频）：3–4 个可切换场景（如：雨夜、海浪、篝火、深空），每个场景 = 全屏黑白/低饱和动态背景（CSS 渐变/噪点/生成式 canvas 实现，不依赖大图）+ 对应循环氛围音（CC0 免费素材，`public/audio/ambient/`）。切换场景时音频交叉淡入淡出，与背景动画同步——这是自托管的意义，iframe 做不到。氛围音支持音量单独调节、呼吸圆环动画随之律动。
3. **音乐**（网易云嵌入）：嵌入用户的网易云歌单外链播放器 iframe（`music.163.com/outchain/player`）。iframe 样式不可定制（网易云红色播放器），设计上把它收进一张黑白卡片/相框式容器中，控制尺寸并弱化违和感。⚠️ 有版权限制的歌曲（客户端里灰色的）外链播放器放不出来，用户建歌单时需自行测试外链效果。可放多个歌单（如"专注"“夜晚”两个歌单切换）。
4. **播客**（第三方嵌入）：单独"播客"分区，嵌入小宇宙节目/单集或 YouTube 播放列表 iframe（具体链接由用户提供）。
5. **细节**：场景选择和音量用 localStorage 记住；氛围音懒加载；移动端适配（iOS 需用户手势后才能播放音频，进入页面给一个"开始"轻点交互）。

## 7. 内容目录约定

```
content/
  posts/          → 博客/文章/想法（.md，front-matter: title, title_en, date, type, tags, lang, summary）
  projects/       → 项目（.md 或 projects.json：name, desc, desc_en, link, repo, cover）
  about/          → about.zh.md / about.en.md
  now/            → now.zh.md / now.en.md（首页"现在是"板块的内容，含 updated 日期）
  library/        → 书影音条目（.md 或 library.json：type: book|movie|album, title, creator, rating, note, date）
  videos.json     → 视频作品清单（platform: bilibili|youtube, id/BV号, title, date, desc）
  tools.json      → 工具页条目（name, desc, url, icon, brandColor —— hover 时亮的品牌色）
site.config.ts    → 站点信息：姓名、邮箱、社交链接、网易云歌单 id、小宇宙/YouTube 播客链接、giscus 配置、导航文案
public/
  logo/           → 用户提供的 Logo（黑底白字与白底黑字两版）
  audio/ambient/  → 氛围音（CC0 素材）
  images/         → 文章配图、项目截图
```

## 8. 阶段划分（每个阶段 = 一个新终端会话）

| 阶段 | 内容 | 产出 |
|---|---|---|
| 阶段 0 ✅ 已完成 | 视觉稿：docs/design/ 下 5 个画板（Intro/Main/BlogContact/Lounge/Tools），用户已确认 | 唯一视觉依据 |
| 阶段 1 | 脚手架：Next.js 项目初始化、Tailwind、设计系统 tokens（按视觉稿提取）、双语框架、git init + GitHub 仓库、Hello 开场页（还原 Intro 画板） | 可运行的项目 + 开场页 |
| 阶段 2 | 主站骨架：左侧边栏导航、首页（含"现在是"板块）、About、Projects、视频作品区、工具页、Contact | 主要静态页面完成 |
| 阶段 3 | 内容管线：markdown 读取/渲染、博客列表与详情页、标签分类、书影音页、RSS、⌘K 搜索面板、giscus 评论 + 留言板 | 博客系统与互动功能完成 |
| 阶段 4 | 放松区：沉浸模式、氛围场景（自托管氛围音）、网易云歌单嵌入、播客嵌入 | 放松区完成 |
| 阶段 5 | 收尾：SEO/OG 图、性能、移动端打磨、暗色模式、访问统计接入、选定平台并部署 | 上线 |

**规则**：每个终端只做自己阶段的事；开工前读 CLAUDE.md + 本文件 + docs/进度.md；完工后更新 docs/进度.md 并 git commit。阶段之间串行进行（避免代码冲突），不要并行开两个终端改同一个项目。

## 9. 用户需要准备的素材

见 docs/素材清单.md。素材没到位不阻塞开发——先用占位内容，素材到了再替换。
