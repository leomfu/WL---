# content/ —— 内容即文件

所有用户可见的内容都放这里，git 提交即发布。组件里不写死文案。
读取在构建时完成（gray-matter 解析 front-matter），不引数据库、不做后端。

## posts/ —— 博客 / 长文 / 想法

一篇一个 `.md`，文件名即 slug。front-matter：

```yaml
---
title: 中文标题
title_en: English title
date: 2026-08-24
type: blog          # blog | essay | thought  →  博客 | 长文 | 想法
tags: [设计, 前端]
lang: zh            # 这篇原文的语言
summary: 一句话摘要
summary_en: One-line summary
---
```

## projects/ —— 项目

`projects.json`，或一个项目一个 `.md`。字段：
`name, desc, desc_en, link, repo, cover, stack[]`

## about/ —— 关于页

`about.zh.md` / `about.en.md`，纯正文，无 front-matter 要求。

## now/ —— 首页「现在是」板块

`now.zh.md` / `now.en.md`，front-matter 里带 `updated: 2026-08-24`。

## library/ —— 书影音

`library.json`，或一条一个 `.md`。字段：
`type: book|movie|album, title, creator, rating, note, note_en, date`

## videos.json —— 视频作品

`[{ platform: "bilibili"|"youtube", id, title, title_en, date, desc, desc_en }]`

## tools.json —— 工具页

`[{ name, desc, desc_en, url, icon, brandColor }]`
`icon` 对应 `src/components/icons/` 里的图标名；`brandColor` 是 hover 时亮起的品牌色
（全站唯一允许出现彩色的地方）。
