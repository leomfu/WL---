# 这个 skill 是从哪来的

上游：https://github.com/yanliudesign/mono-color-skill
作者：Yan Liu，许可 **MIT**（见同目录 LICENSE），可以自由使用、修改、再分发。

## 这里放了什么、没放什么

**放了**（MIT 覆盖的部分，一字未改）：
- `SKILL.md` —— 规则本体
- `design-system/*.json` —— 六个目录：颜色、构图、字体、节奏、瑕疵、载体。
  SKILL.md 里写明「**目录是唯一事实来源，和散文冲突时以目录为准**」。

**没放**（故意的）：
- 上游 `examples/` 目录里的示例图。那些图**不在 MIT 范围内** ——
  上游的 ASSET-LICENSE.md 写明「未经书面许可不得复制、再分发或用于商业用途」。
  要看示例请直接去上游仓库，别往这里拷。

## 本项目哪里用到了它

首页顶上那张海报：
- `scripts/build-hero.mjs` —— `npm run hero`，把 `hero-src/road.png` 印成双色调
- `src/components/home/PosterHero.tsx` —— 版式（照片出血、标题穿进照片并反白）

两处文件的顶部注释里都记着当时解出来的 manifest（substrate / palette / plate roles /
layout / focal event），要改设计先读那两段，别从头猜。

## 更新

上游更新了就重新拉一遍这几个文件；**不要手改 SKILL.md 和 design-system/**，
本地的改动会在下次同步时丢掉。项目自己的取舍写在上面「本项目哪里用到了它」那节。
