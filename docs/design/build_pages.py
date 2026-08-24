# -*- coding: utf-8 -*-
import _parts as P

RISE = """
    @keyframes dcRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .f { animation: dcRise 800ms cubic-bezier(.22,.61,.36,1) both; }
"""

def block(inner, delay, mt=0):
    return '<div class="f" style="animation-delay: %dms;%s">%s</div>' % (
        delay, (" margin-top: %dpx;" % mt) if mt else "", inner)

def section(heading, note, inner, delay, mt=88):
    return block(P.h2(heading, note) + '<div style="margin-top: 20px;">%s</div>' % inner, delay, mt)

# ============================ 首页 ============================
posts = [("08 · 20", "为什么我把网站做成黑白的", "博客"),
         ("08 · 11", "一个人做完一个产品需要多久", "长文"),
         ("07 · 29", "深夜的下雨声，和写不完的 TODO", "想法"),
         ("07 · 15", "把博客搬到 Markdown 之后", "博客")]

rows = []
for i, (d, t, k) in enumerate(posts):
    last = i == len(posts) - 1
    rows.append(
        '<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 24px; padding: 17px 0;%s">'
        '<div style="display: flex; align-items: baseline; gap: 12px;">'
        '<span style="font-size: 16px; color: %s;%s">[示例] %s</span>'
        '<span style="font-size: 10.5px; letter-spacing: 0.1em; color: %s; border: 1px solid %s; padding: 2px 6px;">%s</span>'
        '</div><span style="font-size: 13px; color: %s; white-space: nowrap;">%s</span></div>'
        % ("" if last else " border-bottom: 1px solid %s;" % P.LINE, P.INK,
           " border-bottom: 1px solid %s; padding-bottom: 2px;" % P.INK if i == 0 else "",
           t, P.FAINT, P.LINE, k, P.FAINT, d))

home = (
    block(P.title("[你的名字]"), 0)
  + block('<div style="display: flex; flex-direction: column; gap: 20px;">'
          + P.para("我是 [你的名字]，一个做 [方向] 的开发者与创作者。写代码，也写字、拍点东西。这个网站是我自己搭的，没有后台，"
                   "所有内容都是仓库里的一份 markdown。")
          + P.para("这里放着我做过的 " + P.link("项目") + "、写下的 " + P.link("文章") + "，以及一个用来发呆的 "
                   + P.link("放松区") + "——放点雨声和歌，什么都不干也行。")
          + '</div>', 120, 30)
  + section("现在是", "2026 年 8 月",
            '<div style="display: flex; flex-direction: column; gap: 16px;">'
            + P.para("在做 " + P.link("[项目占位 A]") + "，[一句话说明它解决什么]。")
            + P.para("在读 [书名占位]，在学 [占位]，顺便把过程写成文章。")
            + '</div>', 240)
  + section("我在做的", None,
            '<div style="display: flex; flex-direction: column; gap: 20px;">'
            + P.para(P.link("[项目名 A]") + " —— [一句话介绍这个项目解决了什么问题]。Next.js / TypeScript。")
            + P.para(P.link("[项目名 B]") + " —— [一句话介绍]。")
            + P.para('<span style="color: %s;">更早的东西都在 %s 里。</span>' % (P.MUTED, P.link("项目页")))
            + '</div>', 360)
  + section("我写的", None, '<div style="display: flex; flex-direction: column;">%s</div>' % "".join(rows), 480)
  + block('<div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid %s; '
          'padding-top: 26px; font-size: 13px; color: %s;">'
          '<span>想说点什么就 %s，我一般两三天内回。</span>'
          '<span style="font-size: 12px; color: %s;">© 2026 [你的名字]</span></div>'
          % (P.LINE, P.MUTED, P.link("写封邮件"), P.FAINT), 600, 88))

open("Main.dc.html", "w", encoding="utf-8").write(P.doc(P.page("home", home, 1560), 1440, 1560, RISE))

# ============================ 工具页 ============================
def ico(inner, sw="1.6", fill="none"):
    return ('<svg width="23" height="23" viewBox="0 0 24 24" fill="%s" stroke="currentColor" stroke-width="%s" '
            'stroke-linecap="round" stroke-linejoin="round">%s</svg>' % (fill, sw, inner))

rays = []
for i in range(8):
    ang = i * 22.5
    ln = 9.6 if i % 2 == 0 else 6.8
    rays.append('<line x1="12" y1="12" x2="12" y2="%.1f" transform="rotate(%.1f 12 12)"/>'
                '<line x1="12" y1="12" x2="12" y2="%.1f" transform="rotate(%.1f 12 12)"/>'
                % (12 - ln, ang, 12 - ln, ang + 180))
CLAUDE = ico("".join(rays), sw="2")
CHATGPT = ico('<path d="M12 2.4 20.4 7.2v9.6L12 21.6 3.6 16.8V7.2z"/><path d="M12 2.4v9.6l8.4 4.8M12 12 3.6 16.8"/>', sw="1.5")
VSCODE = ico('<path d="M17.4 2.6 21.6 4.6v14.8l-4.2 2-9.1-8.6-4.2 3.2-1.7-1.1V8.1l1.7-1.1 4.2 3.2z"/><path d="M17.4 7.3 11.3 12l6.1 4.7z"/>', sw="1.5")
GITHUB = ('<svg width="23" height="23" viewBox="0 0 16 16" fill="currentColor">'
          + P.BRAND["github"].split(">", 1)[1].rsplit("</svg>", 1)[0] + '</svg>')
FIGMA = ico('<path d="M9 2.4h3.4v4.7H9a2.35 2.35 0 1 1 0-4.7z"/><path d="M12.4 2.4h3.4a2.35 2.35 0 1 1 0 4.7h-3.4z"/>'
            '<path d="M9 7.1h3.4v4.7H9a2.35 2.35 0 1 1 0-4.7z"/><circle cx="14.15" cy="14.15" r="2.35"/>'
            '<path d="M12.4 11.8v4.7a2.35 2.35 0 1 1-3.4-2.1z"/>', sw="1.4")
NOTION = ico('<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="3.2"/><path d="M8.5 16.8V7.2l7 9.6V7.2"/>', sw="1.5")
VERCEL = ico('<path d="M12 3.6 21.6 20.4H2.4z"/>', sw="1.6")
SPOTIFY = ico('<circle cx="12" cy="12" r="9.5"/><path d="M7.3 9.7c3.2-.9 6.6-.6 9.4 1"/>'
              '<path d="M7.9 12.9c2.6-.7 5.3-.5 7.7.9"/><path d="M8.5 15.9c2-.5 4.1-.4 6 .7"/>', sw="1.5")

TOOLS = [(CLAUDE, "Claude Code", "编程代理", "#C15F3C"), (CHATGPT, "ChatGPT", "AI 助手", None),
         (VSCODE, "VS Code", "编辑器", None), (GITHUB, "GitHub", "代码托管", None),
         (FIGMA, "Figma", "设计稿", None), (NOTION, "Notion", "笔记与知识库", None),
         (VERCEL, "Vercel", "部署", None), (SPOTIFY, "Spotify", "写代码时听", None)]

cards = []
for i, (svg, name, desc, brand) in enumerate(TOOLS):
    hov = i == 0
    cards.append(
        '<div class="f" style="animation-delay: %dms; display: flex; align-items: center; gap: 15px; background: %s; '
        'border: 1px solid %s; border-radius: 11px; padding: 15px 17px; box-shadow: %s;%s">'
          '<div style="width: 44px; height: 44px; border-radius: 10px; border: 1px solid %s; background: #FBFBFB; '
          'display: flex; align-items: center; justify-content: center; color: %s; flex-shrink: 0;">%s</div>'
          '<div style="display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0;">'
            '<span style="font-size: 15.5px; color: %s; letter-spacing: 0.01em;">%s</span>'
            '<span style="font-size: 12.5px; color: %s;">%s</span>'
          '</div>'
          '<span style="font-size: 14px; color: %s;">↗</span>'
        '</div>'
        % (180 + i * 55, P.CARD, P.INK if hov else P.LINE,
           "0 8px 22px rgba(0,0,0,0.10)" if hov else "0 1px 2px rgba(0,0,0,0.03)",
           " transform: translateY(-2px);" if hov else "",
           "#EDEDED" if hov else "#F0F0F0", brand if (hov and brand) else P.INK, svg,
           P.INK, name, P.MUTED, desc, P.INK if hov else "#C4C4C4"))

tools_inner = (
    block(P.title("工具", "我每天在用的东西。点一下直接去它们的官网。"), 0)
  + block('<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">%s</div>'
          % "".join(cards), 120, 44)
  + block('<div style="display: flex; align-items: center; gap: 10px; border-top: 1px solid %s; padding-top: 24px; '
          'font-size: 12.5px; color: %s;"><span style="width: 22px; height: 1px; background: %s;"></span>'
          '图标平时是黑白的，鼠标移上去才亮起各自的品牌色（左上角那张是 hover 态）。</div>'
          % (P.LINE, P.FAINT, P.LINE), 700, 56))

open("Tools.dc.html", "w", encoding="utf-8").write(P.doc(P.page("tools", tools_inner, 1180), 1440, 1180, RISE))
print("Main.dc.html / Tools.dc.html ok")
