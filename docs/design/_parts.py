# -*- coding: utf-8 -*-
"""共用的图标 / 侧边栏 / 外壳。生成 .dc.html 画板用。"""

INK      = "#111111"
BODY     = "#333333"
MUTED    = "#666666"
FAINT    = "#999999"
LINE     = "#E5E5E5"
CARD     = "#FFFFFF"

D_BG     = "#0A0A0A"
D_INK    = "#EDEDED"
D_MUTED  = "#8A8A8A"
D_FAINT  = "#5A5A5A"
D_LINE   = "#1F1F1F"

SANS  = "Inter, 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif"
SERIF = "'Noto Serif SC', 'Songti SC', Georgia, serif"

FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Inter:wght@300;400;500;600&family=Noto+Serif+SC:wght@200;300;400;500&display=swap">')

# ---------- 导航图标（线性，20x20） ----------
def _s(path, sw="1.5"):
    return ('<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" '
            'stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">%s</svg>' % (sw, path))

NAV_ICONS = {
 "home":    _s('<path d="M3.4 8.5 10 3.1l6.6 5.4V16a1 1 0 0 1-1 1h-3.3v-4.6H7.7V17H4.4a1 1 0 0 1-1-1z"/>'),
 "project": _s('<path d="M17.3 2.7 2.9 8.3l6 1.8 1.8 6z"/><path d="M17.3 2.7 8.9 10.1"/>'),
 "video":   _s('<rect x="2.4" y="4.4" width="15.2" height="11.2" rx="2.2"/><path d="M8.6 8.1 13 10l-4.4 1.9z"/>'),
 "blog":    _s('<path d="M12.9 3.3 16.7 7.1 8 15.8l-4.6.8.8-4.6z"/><path d="M11.4 4.8 15.2 8.6"/>'),
 "about":   _s('<circle cx="10" cy="10" r="7.3"/><circle cx="10" cy="8.1" r="2.4"/><path d="M5.4 15.8a5.3 5.3 0 0 1 9.2 0"/>'),
 "tools":   _s('<path d="M13.3 2.6a4.3 4.3 0 0 0-3.9 6l-6.2 6.2a1.7 1.7 0 0 0 2.4 2.4l6.2-6.2a4.3 4.3 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z"/>'),
 "lounge":  _s('<path d="M2.5 6.6c1.3-1.6 2.5-1.6 3.8 0s2.5 1.6 3.8 0 2.5-1.6 3.8 0 2.5 1.6 3.6 0"/><path d="M2.5 10.5c1.3-1.6 2.5-1.6 3.8 0s2.5 1.6 3.8 0 2.5-1.6 3.8 0 2.5 1.6 3.6 0"/><path d="M2.5 14.4c1.3-1.6 2.5-1.6 3.8 0s2.5 1.6 3.8 0 2.5-1.6 3.8 0 2.5 1.6 3.6 0"/>'),
 "contact": _s('<rect x="2.4" y="4.6" width="15.2" height="10.8" rx="1.8"/><path d="M3 6.2 10 11l7-4.8"/>'),
}

# ---------- 社交/软件图标（实心，16x16） ----------
def _f(path, size=16, vb=16, extra=""):
    return ('<svg width="%d" height="%d" viewBox="0 0 %d %d" fill="currentColor" '
            'style="flex-shrink:0;"%s>%s</svg>' % (size, size, vb, vb, extra, path))

BRAND = {
 "x": _f('<path d="M12.6 1.3h2.3l-5 5.8L15.8 15h-4.6l-3.6-4.7L3.4 15H1.1l5.4-6.2L.9 1.3h4.7l3.2 4.3zM11.8 13.6h1.3L5.1 2.6H3.7z"/>'),
 "github": _f('<path d="M8 .5a7.5 7.5 0 0 0-2.4 14.6c.4.1.5-.2.5-.4v-1.3c-2.1.5-2.5-1-2.5-1-.4-.9-.9-1.1-.9-1.1-.7-.5 0-.5 0-.5.8.1 1.2.8 1.2.8.7 1.2 1.8.8 2.2.6.1-.5.3-.8.5-1-1.7-.2-3.4-.8-3.4-3.7 0-.8.3-1.5.8-2-.1-.2-.4-1 .1-2 0 0 .6-.2 2.1.8a7.2 7.2 0 0 1 3.8 0c1.4-1 2-.8 2-.8.5 1 .2 1.8.1 2 .5.5.8 1.2.8 2 0 2.9-1.8 3.5-3.4 3.7.3.2.5.7.5 1.4v2c0 .2.1.4.5.4A7.5 7.5 0 0 0 8 .5z"/>'),
 "bilibili": _f('<path fill-rule="evenodd" d="M4.5 1.1 6.9 3.5h2.2L11.5 1.1a.8.8 0 0 1 1.1 1.1l-1.3 1.3H13A2.5 2.5 0 0 1 15.5 6v6.4A2.5 2.5 0 0 1 13 14.9H3a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 3 3.5h1.7L3.4 2.2a.8.8 0 0 1 1.1-1.1zM5.1 6.9a.9.9 0 0 0-.9.9v1.5a.9.9 0 0 0 1.8 0V7.8a.9.9 0 0 0-.9-.9zm5.8 0a.9.9 0 0 0-.9.9v1.5a.9.9 0 0 0 1.8 0V7.8a.9.9 0 0 0-.9-.9z"/>'),
 "youtube": _f('<path fill-rule="evenodd" d="M15.4 4.6a2 2 0 0 0-1.4-1.4C12.8 2.9 8 2.9 8 2.9s-4.8 0-6 .3A2 2 0 0 0 .6 4.6C.3 5.8.3 8 .3 8s0 2.2.3 3.4a2 2 0 0 0 1.4 1.4c1.2.3 6 .3 6 .3s4.8 0 6-.3a2 2 0 0 0 1.4-1.4c.3-1.2.3-3.4.3-3.4s0-2.2-.3-3.4zM6.5 10.3V5.7L10.6 8z"/>'),
 "xhs": _f('<path fill-rule="evenodd" d="M2.9 1.4h10.2a1.5 1.5 0 0 1 1.5 1.5v10.2a1.5 1.5 0 0 1-1.5 1.5H2.9a1.5 1.5 0 0 1-1.5-1.5V2.9a1.5 1.5 0 0 1 1.5-1.5zm0 1.4a.1.1 0 0 0-.1.1v10.2a.1.1 0 0 0 .1.1h10.2a.1.1 0 0 0 .1-.1V2.9a.1.1 0 0 0-.1-.1zM5.3 4.4h5.4v1.3H5.3zm0 2.7h5.4v1.3H5.3zm0 2.7h3.2v1.3H5.3z"/>'),
 "douyin": _f('<path d="M13.4 3.5a3.9 3.9 0 0 1-2.4-.8A3.9 3.9 0 0 1 9.5.5H7v9.8a2.1 2.1 0 1 1-1.7-2.1V5.7A4.7 4.7 0 1 0 9.5 10.3V5.8a6.1 6.1 0 0 0 3.9 1.3z"/>'),
 "rss": _f('<path d="M3.2 11.1a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM1.4 6.2a8.7 8.7 0 0 1 8.7 8.7H7.7A6.3 6.3 0 0 0 1.4 8.6zm0-4.9A13.6 13.6 0 0 1 15 14.9h-2.4A11.2 11.2 0 0 0 1.4 3.7z"/>'),
}

SOCIALS = [("x", "X", "@[用户名]"), ("github", "GitHub", "@[用户名]"), ("bilibili", "哔哩哔哩", "[主页]"),
           ("youtube", "YouTube", "[频道]"), ("xhs", "小红书", "[主页]"), ("douyin", "抖音", "[主页]"), ("rss", "RSS", "")]

NAV = [("home", "首页", "/home"), ("project", "项目", "/projects"), ("video", "视频", "/videos"),
       ("blog", "博客", "/blog"), ("about", "关于", "/about"), ("tools", "工具", "/tools"),
       ("lounge", "放松区", "/lounge"), ("contact", "联系", "/contact")]


def sidebar(active, width=264):
    items = []
    for key, label, _ in NAV:
        on = key == active
        bg = "background: %s; color: %s;" % (D_INK, D_BG) if on else "color: #A3A3A3;"
        items.append(
            '<div style="display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 13px; '
            'border-radius: 8px; font-size: 14px; letter-spacing: 0.01em; %s">%s<span>%s</span></div>'
            % (bg, NAV_ICONS[key], label))
    nav_html = '<div style="display: flex; flex-direction: column; gap: 2px;">%s</div>' % "".join(items)

    socs = []
    for key, label, _ in SOCIALS:
        socs.append(
            '<div style="display: flex; align-items: center; gap: 12px; height: 32px; padding: 0 13px; '
            'font-size: 13.5px; color: %s;">%s<span>%s</span></div>' % (D_MUTED, BRAND[key], label))
    soc_html = '<div style="display: flex; flex-direction: column; gap: 1px;">%s</div>' % "".join(socs)

    return ('<div style="width: %dpx; flex-shrink: 0; background: %s; color: %s; '
            'border-right: 1px solid %s; display: flex; flex-direction: column;">'
              '<div style="padding: 26px 18px 30px 18px; display: flex; flex-direction: column; gap: 30px;">'
                '<div style="display: flex; justify-content: flex-end; color: %s; font-size: 15px; padding-right: 4px;">‹</div>'
                '<div style="display: flex; align-items: center; gap: 13px; padding: 0 5px;">'
                  '<div style="width: 46px; height: 46px; border-radius: 50%%; border: 1px solid #262626; background: #131313; '
                  'display: flex; align-items: center; justify-content: center; flex-shrink: 0;">'
                    '<img src="wl-logo.png" style="width: 30px; height: 30px; object-fit: contain; filter: invert(1);">'
                  '</div>'
                  '<div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">'
                    '<span style="font-size: 16px; font-weight: 500; color: %s; letter-spacing: 0.01em;">[你的名字]</span>'
                    '<span style="font-size: 12px; color: %s; letter-spacing: 0.02em;">[一句话定位]</span>'
                  '</div>'
                '</div>'
                '%s'
                '<div style="display: flex; flex-direction: column; gap: 12px;">'
                  '<div style="font-size: 10.5px; letter-spacing: 0.2em; color: %s; padding: 0 13px;">连接 / CONNECT</div>'
                  '%s'
                '</div>'
                '<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 13px 0 13px; '
                'border-top: 1px solid %s; font-size: 11.5px; letter-spacing: 0.06em;">'
                  '<span style="display: flex; gap: 7px;"><span style="color: %s;">中</span>'
                  '<span style="color: #2E2E2E;">/</span><span style="color: %s;">EN</span></span>'
                  '<span style="border: 1px solid #262626; border-radius: 4px; padding: 3px 7px; font-size: 10.5px; color: %s;">⌘K</span>'
                '</div>'
              '</div>'
            '</div>') % (width, D_BG, D_INK, D_LINE, D_FAINT, D_INK, D_MUTED, nav_html, D_FAINT, soc_html, D_LINE, D_INK, D_FAINT, D_FAINT)


CONTENT_BG = ("background: linear-gradient(158deg, #F1F1F1 0%, #FAFAFA 34%, #F7F7F7 66%, #ECECEC 100%), "
              "radial-gradient(70% 55% at 76% 6%, #FFFFFF 0%, rgba(255,255,255,0) 62%); "
              "background-blend-mode: normal;")


def page(active, inner, height, gap_top=104):
    """浅色内容页外壳：深色侧栏 + 浅色正文区，正文栏 700px 居中。"""
    return ('<div style="width: 1440px; min-height: %dpx; display: flex; font-family: %s; font-size: 16px; '
            'color: %s; background: %s;">'
              '%s'
              '<div style="flex-grow: 1; %s display: flex; justify-content: center; padding: %dpx 0 88px 0;">'
                '<div style="width: 700px; display: flex; flex-direction: column;">%s</div>'
              '</div>'
            '</div>') % (height, SANS, INK, D_BG, sidebar(active), CONTENT_BG, gap_top, inner)


def doc(body, w, h, style_extra=""):
    return ('<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n'
            '  <script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n  %s\n  <style>\n'
            '    body { margin: 0; }\n'
            '    a { color: %s; text-decoration: none; }\n'
            '    a:hover { color: %s; }\n%s  </style>\n</helmet>\n%s\n</x-dc>\n'
            '<script data-dc-script data-props=\'{"$preview":{"width":%d,"height":%d}}\'>\n'
            'class Component extends DCLogic {}\n</script>\n</body>\n</html>\n'
            ) % (FONTS, INK, MUTED, style_extra, body, w, h)


def title(text, sub=None):
    out = ('<h1 style="margin: 0; font-family: %s; font-weight: 300; font-size: 46px; line-height: 1.3; '
           'letter-spacing: -0.01em; color: %s;">%s</h1>') % (SERIF, INK, text)
    if sub:
        out += ('<p style="margin: 14px 0 0 0; font-size: 15.5px; line-height: 1.8; color: %s;">%s</p>') % (MUTED, sub)
    return out


def h2(text, note=None):
    n = ('<span style="font-size: 13px; color: %s; font-weight: 400;">%s</span>' % (FAINT, note)) if note else ""
    return ('<div style="display: flex; align-items: baseline; gap: 14px;">'
            '<h2 style="margin: 0; font-size: 18px; font-weight: 500; letter-spacing: 0.01em; color: %s;">%s</h2>%s</div>'
            ) % (INK, text, n)


def link(text):
    return '<span style="color: %s; border-bottom: 1px solid #C9C9C9; padding-bottom: 1px;">%s</span>' % (INK, text)


def para(text):
    return '<p style="margin: 0; font-size: 16px; line-height: 1.9; color: %s; text-wrap: pretty;">%s</p>' % (BODY, text)
