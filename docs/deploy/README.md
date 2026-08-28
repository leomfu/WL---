# 部署相关

## 每日新闻定时任务 —— ✅ 已装好（2026-08-28）

文件在 `.github/workflows/news.yml`，由用户在 GitHub 网页版创建（提交 `b26cdd3`）。
首次手动触发就跑通了：抓取 → 提交 `每日新闻：2026-08-28`（`b0e89f3`）→ Vercel 自动构建 → 线上生效。

之后每天北京时间早上 6 点（cron `0 22 * * *`，UTC）自动跑一次，抓到新内容才提交。
⚠️ GitHub 的定时任务在高峰期会延迟几分钟到几十分钟，不是精准闹钟。

### ⚠️ 改这个文件只能走网页版

本机的 GitHub token 没有 `workflow` 权限，**任何包含 `.github/workflows/` 改动的推送都会被拒**
（报 `refusing to allow a Personal Access Token to create or update workflow ... without workflow scope`）。
所以：

- 要改这个 workflow → 到 GitHub 网页版编辑，改完本地 `git pull`
- 本地**不要碰**这个文件，否则下一次 push 整个被拒
- 想解除这个限制：https://github.com/settings/tokens → `contract-reviewer` → 勾上 `workflow` → Update token
  （改 scope 不改 token 值，钥匙串里那串照样有效）

### 一个可以不管的警告

运行日志里有一条：`Node.js 20 is deprecated ... actions/checkout@v4, actions/setup-node@v4`。
意思是这两个 action 声明用 Node 20，GitHub 现在强制拿 Node 24 跑它们 —— 不影响结果。
想消掉就在网页版把那两行的 `@v4` 改成 `@v5`。

## 手动触发一次

仓库 → Actions → 左边选「每日新闻」→ 右边 `Run workflow` → 绿色 `Run workflow`。

## AI 更新解读不在这个 workflow 里

解读要读官方原文、要判断值不值得写，由 Claude 在会话里做，流程见 CLAUDE.md「更新新闻页」一节。
用户已明确：**不接 Anthropic API、不为这个功能付费**。
