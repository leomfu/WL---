# 待安装的部署文件

## news-workflow.yml —— 每天自动抓世界新闻

**这个文件现在放在这里，是因为推不上去**：本机 GitHub token 缺 `workflow` 权限，
GitHub 拒绝任何往 `.github/workflows/` 写文件的推送。

装它有两条路，二选一：

**A. 网页版建文件（不用改 token）**
1. 打开 https://github.com/weiliang99520-a11y/WL---
2. Add file → Create new file
3. 文件名填 `.github/workflows/news.yml`
4. 把 `docs/deploy/news-workflow.yml` 的内容整个粘进去 → Commit

**B. 给 token 补权限（一劳永逸）**
1. https://github.com/settings/tokens → 点 `contract-reviewer`
2. Select scopes 里勾上 `workflow`（在 `repo` 那组下面）→ 页面底部 Update token
   （改 scope 不会改 token 的值，钥匙串里存的那串照样有效）
3. 回来跟当班窗口说一声，把这个文件移回 `.github/workflows/news.yml` 再推

装好之后：每天北京时间早上 6 点（UTC 22:00）自动抓一次世界新闻和 AI 官方更新，
有变化才提交，Vercel 收到 push 自动重新构建。
⚠️ GitHub 的定时任务在高峰期会延迟几分钟到几十分钟，不是精准闹钟。

**AI 更新解读那一半不在这个 workflow 里** —— 解读要读原文、要判断值不值得写，
现在由 Claude 在会话里做（流程写在 CLAUDE.md「更新新闻页」一节）。
以后想让它也全自动，就在这个 workflow 里加一步调 Anthropic API，
key 存 GitHub Secrets。
