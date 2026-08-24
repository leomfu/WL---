# -*- coding: utf-8 -*-
import _parts as P
from build_pages import RISE, block, section   # 复用

# ============================ 博客 + 联系 ============================
POSTS = [
 ("08 · 20", "为什么我把网站做成黑白的", "去掉颜色之后，剩下的东西反而更清楚了。关于克制、留白，和一次推倒重做。", ["博客", "设计"], "6 分钟"),
 ("08 · 11", "一个人做完一个产品需要多久", "从想法到上线的一份流水账，包括所有半途而废的部分。", ["长文"], "14 分钟"),
 ("07 · 29", "深夜的下雨声，和写不完的 TODO", "一段没什么结论的记录。", ["想法"], "2 分钟"),
 ("07 · 15", "把博客搬到 Markdown 之后", "写作和发布之间，少了一个后台。", ["博客"], "8 分钟"),
 ("2025", "更早的文章", "年份变化时插一条分隔，长列表才不会失去时间感。", [], ""),
]

rows = []
for i, (date, t, s, tags, mins) in enumerate(POSTS):
    last = i == len(POSTS) - 1
    chips = "".join('<span style="border: 1px solid %s; padding: 2px 6px;">%s</span>' % (P.LINE, g) for g in tags)
    if mins:
        chips += '<span style="padding: 2px 0;">%s</span>' % mins
    rows.append(
      '<div style="display: flex; gap: 30px; padding: 25px 0;%s">'
        '<span style="width: 86px; flex-shrink: 0; font-size: 12.5px; color: %s; padding-top: 4px; white-space: nowrap;">%s</span>'
        '<div style="display: flex; flex-direction: column; gap: 9px;">'
          '<span style="font-size: 17px; color: %s;%s">[示例] %s</span>'
          '<span style="font-size: 14px; line-height: 1.75; color: %s;">%s</span>'
          '<div style="display: flex; gap: 10px; font-size: 10.5px; letter-spacing: 0.1em; color: %s;">%s</div>'
        '</div>'
      '</div>'
      % ("" if last else " border-bottom: 1px solid %s;" % P.LINE, P.FAINT, date, P.INK,
         " border-bottom: 1px solid %s; padding-bottom: 2px; align-self: flex-start;" % P.INK if i == 0 else "",
         t, P.MUTED, s, P.FAINT, chips))

blog = (
  block(P.title("写字的地方", "长文、博客和一些没头没尾的想法，都放在这里。共 <span style=\"color:%s\">[N]</span> 篇。" % P.INK), 0)
+ block('<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid %s; padding-bottom: 15px;">'
        '<div style="display: flex; gap: 22px; font-size: 13px;">'
        '<span style="color: %s; border-bottom: 1px solid %s; padding-bottom: 4px;">全部</span>'
        '<span style="color: %s;">博客</span><span style="color: %s;">长文</span><span style="color: %s;">想法</span></div>'
        '<span style="font-size: 12px; letter-spacing: 0.06em; color: %s;">按时间倒序</span></div>'
        % (P.LINE, P.INK, P.INK, P.MUTED, P.MUTED, P.MUTED, P.FAINT), 120, 40)
+ block('<div style="display: flex; flex-direction: column;">%s</div>' % "".join(rows), 220, 8))

socs = []
for i, (key, label, handle) in enumerate(P.SOCIALS[:6]):
    last = i >= 4
    socs.append(
      '<div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 0;%s">'
        '<span style="display: flex; align-items: center; gap: 11px; font-size: 15px; color: %s;">%s%s</span>'
        '<span style="font-size: 13px; color: %s;">%s ↗</span>'
      '</div>' % ("" if last else " border-bottom: 1px solid %s;" % P.LINE, P.INK, P.BRAND[key], label, P.FAINT, handle))

contact = (
  block(P.title("说点什么", "合作、提问，或者只是想聊两句，都可以发邮件给我。我一般两三天内回。"), 0)
+ block('<div style="font-size: 11px; letter-spacing: 0.18em; color: %s;">邮箱 / EMAIL</div>'
        '<div style="font-family: %s; font-weight: 300; font-size: 31px; letter-spacing: 0.01em; color: %s; margin-top: 20px;">[your@email.com]</div>'
        '<div style="display: flex; gap: 11px; margin-top: 22px;">'
          '<span style="border: 1px solid %s; background: %s; color: #FAFAFA; padding: 14px 26px; font-size: 13.5px; letter-spacing: 0.04em;">写邮件</span>'
          '<span style="border: 1px solid %s; background: %s; color: %s; padding: 14px 26px; font-size: 13.5px; letter-spacing: 0.04em;">复制地址</span>'
          '<span style="align-self: center; font-size: 12px; color: %s; margin-left: 4px;">已复制 ✓</span>'
        '</div>' % (P.FAINT, P.SERIF, P.INK, P.INK, P.INK, P.LINE, P.CARD, P.INK, P.FAINT), 120, 48)
+ block('<div style="font-size: 11px; letter-spacing: 0.18em; color: %s;">在别处 / ELSEWHERE</div>'
        '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 40px; margin-top: 14px;">%s</div>'
        % (P.FAINT, "".join(socs)), 260, 60)
+ block('<div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid %s; '
        'padding-top: 26px; font-size: 13px; color: %s;"><span>不想发邮件？去 %s 写一句也行。</span>'
        '<span style="font-size: 12px; color: %s;">© 2026 [你的名字]</span></div>'
        % (P.LINE, P.MUTED, P.link("留言板"), P.FAINT), 420, 56))

divider = ('<div style="display: flex; align-items: center; gap: 20px; margin: 92px 0;">'
           '<div style="flex-grow: 1; border-top: 1px dashed #D8D8D8;"></div>'
           '<span style="font-size: 10.5px; letter-spacing: 0.2em; color: %s;">以下为 /CONTACT 独立页面</span>'
           '<div style="flex-grow: 1; border-top: 1px dashed #D8D8D8;"></div></div>' % P.FAINT)

open("BlogContact.dc.html", "w", encoding="utf-8").write(
    P.doc(P.page("blog", blog + divider + contact, 1900), 1440, 1900, RISE))

# ============================ 放松区 ============================
rail_icons = "".join(
    '<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: %s;">%s</div>'
    % ("#EDEDED" if k == "lounge" else "#2E2E2E", P.NAV_ICONS[k]) for k, _, _ in P.NAV)

LSTYLE = """
    @keyframes dcBreathe { 0%, 100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.075); opacity: 1; } }
    @keyframes dcDrift { from { background-position: 0 0; } to { background-position: 240px 720px; } }
    @keyframes dcGlow { 0%, 100% { opacity: .6; } 50% { opacity: 1; } }
"""

def scene(name, on):
    return ('<span style="padding: 12px 20px; border: 1px solid %s; color: %s; letter-spacing: 0.06em; font-size: 13px;">%s</span>'
            % ("rgba(237,237,237,0.3)" if on else "transparent", "#EDEDED" if on else P.D_MUTED, name))

lounge = """
<div style="width: 1440px; height: 900px; display: flex; background: #0A0A0A; color: #EDEDED; font-family: %(SANS)s; overflow: hidden;">

  <div style="width: 64px; flex-shrink: 0; background: #0A0A0A; border-right: 1px solid #171717; display: flex; flex-direction: column; align-items: center; padding: 24px 0; gap: 26px; position: relative; z-index: 2;">
    <img src="wl-logo.png" style="width: 26px; height: 26px; object-fit: contain; filter: invert(1); opacity: .85;">
    <div style="display: flex; flex-direction: column; gap: 4px;">%(RAIL)s</div>
    <div style="margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <span style="border: 1px solid #262626; border-radius: 4px; padding: 4px 6px; font-size: 9.5px; letter-spacing: 0.08em; color: #5A5A5A;">ESC</span>
      <span style="font-size: 9px; letter-spacing: 0.12em; color: #3A3A3A; writing-mode: vertical-rl;">退出沉浸</span>
    </div>
  </div>

  <div style="flex-grow: 1; position: relative; overflow: hidden;">
    <div style="position: absolute; inset: 0; background: radial-gradient(122%% 92%% at 50%% 16%%, #202020 0%%, #131313 38%%, #0A0A0A 74%%); animation: dcGlow 11000ms ease-in-out infinite;"></div>
    <div style="position: absolute; inset: 0; background: repeating-linear-gradient(14deg, rgba(237,237,237,0) 0px, rgba(237,237,237,0) 22px, rgba(237,237,237,0.045) 23px, rgba(237,237,237,0) 25px); animation: dcDrift 9s linear infinite;"></div>
    <div style="position: absolute; inset: 0; background: radial-gradient(100%% 72%% at 50%% 50%%, rgba(0,0,0,0) 38%%, rgba(0,0,0,0.78) 100%%);"></div>
    <svg style="position: absolute; inset: 0; width: 100%%; height: 100%%; opacity: 0.055; mix-blend-mode: screen;" xmlns="http://www.w3.org/2000/svg"><filter id="dcGrainLounge"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"></feTurbulence></filter><rect width="100%%" height="100%%" filter="url(#dcGrainLounge)"></rect></svg>

    <div style="position: absolute; top: 46px; left: 0; right: 0; text-align: center; font-size: 10.5px; letter-spacing: 0.2em; color: #4A4A4A;">导航已收起 · 鼠标移到左侧或按 ESC 退出</div>

    <div style="position: absolute; left: 50%%; top: 372px; transform: translate(-50%%, -50%%); display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 372px; height: 372px; border-radius: 50%%; border: 1px solid rgba(237,237,237,0.07); animation: dcBreathe 7000ms ease-in-out infinite;"></div>
      <div style="position: absolute; width: 272px; height: 272px; border-radius: 50%%; border: 1px solid rgba(237,237,237,0.13); animation: dcBreathe 7000ms ease-in-out 260ms infinite;"></div>
      <div style="position: absolute; width: 180px; height: 180px; border-radius: 50%%; border: 1px solid rgba(237,237,237,0.22); background: radial-gradient(circle at 50%% 50%%, rgba(237,237,237,0.055), rgba(237,237,237,0) 70%%); animation: dcBreathe 7000ms ease-in-out 520ms infinite;"></div>
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <div style="font-family: %(SERIF)s; font-weight: 300; font-size: 32px; letter-spacing: 0.07em;">雨夜</div>
        <div style="font-size: 10px; letter-spacing: 0.26em; color: #8A8A8A;">RAINY NIGHT</div>
      </div>
    </div>

    <div style="position: absolute; left: 50%%; top: 600px; transform: translateX(-50%%); font-size: 10.5px; letter-spacing: 0.16em; color: #4A4A4A;">圆环随氛围音音量呼吸</div>

    <div style="position: absolute; left: 50%%; bottom: 70px; transform: translateX(-50%%); display: flex; flex-direction: column; align-items: center; gap: 28px;">
      <div style="display: flex; align-items: center; gap: 34px; font-size: 13px; letter-spacing: 0.1em;">
        <span style="color: #EDEDED; padding-bottom: 6px; border-bottom: 1px solid #EDEDED;">氛围</span>
        <span style="color: #5A5A5A; padding-bottom: 6px;">音乐</span>
        <span style="color: #5A5A5A; padding-bottom: 6px;">播客</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">%(SCENES)s</div>
      <div style="display: flex; align-items: center; gap: 28px;">
        <div style="width: 52px; height: 52px; border-radius: 50%%; border: 1px solid rgba(237,237,237,0.28); display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="#EDEDED" stroke-width="1.4"><line x1="4" y1="1" x2="4" y2="15"></line><line x1="10" y1="1" x2="10" y2="15"></line></svg>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#8A8A8A" stroke-width="1.2" stroke-linejoin="round"><path d="M8 3.5 4.5 6.5H2v5h2.5L8 14.5z"></path><path d="M11.2 6.4a3.6 3.6 0 0 1 0 5.2"></path><path d="M13.4 4.2a6.6 6.6 0 0 1 0 9.6"></path></svg>
          <div style="position: relative; width: 200px; height: 1px; background: rgba(237,237,237,0.18);">
            <div style="position: absolute; left: 0; top: 0; width: 128px; height: 1px; background: #EDEDED;"></div>
            <div style="position: absolute; left: 128px; top: -3.5px; width: 8px; height: 8px; border-radius: 50%%; background: #EDEDED;"></div>
          </div>
          <span style="font-size: 11px; letter-spacing: 0.1em; color: #5A5A5A; width: 34px;">64%%</span>
        </div>
        <span style="font-size: 11px; letter-spacing: 0.14em; color: #5A5A5A; border-left: 1px solid #262626; padding-left: 28px;">循环 · 交叉淡入</span>
      </div>
    </div>
  </div>
</div>
""" % dict(SANS=P.SANS, SERIF=P.SERIF, RAIL=rail_icons,
           SCENES="".join(scene(n, n == "雨夜") for n in ["雨夜", "海浪", "篝火", "深空"]))

open("Lounge.dc.html", "w", encoding="utf-8").write(P.doc(lounge, 1440, 900, LSTYLE))
print("BlogContact.dc.html / Lounge.dc.html ok")
