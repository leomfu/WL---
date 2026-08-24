# -*- coding: utf-8 -*-
import _parts as P

# 固定的星点位置（生成时算好，画板本身是静态的）
seed = 20260824
def rnd():
    global seed
    seed = (seed * 1103515245 + 12345) % (2**31)
    return seed / (2**31)

specks = []
for i in range(46):
    x, y = rnd() * 100, rnd() * 78
    s = 1 if rnd() < 0.72 else 1.6
    o = 0.18 + rnd() * 0.42
    d = int(rnd() * 4200)
    specks.append('<div style="position:absolute; left:%.2f%%; top:%.2f%%; width:%.1fpx; height:%.1fpx; '
                  'border-radius:50%%; background:#FFFFFF; opacity:%.2f; animation: dcTwinkle 4200ms ease-in-out %dms infinite;"></div>'
                  % (x, y, s, s, o, d))
specks = "".join(specks)

STYLE = """
    @keyframes dcRise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes dcWiden { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes dcTwinkle { 0%, 100% { opacity: .15; } 50% { opacity: .7; } }
    @keyframes dcGlow { 0%, 100% { opacity: .55; } 50% { opacity: .9; } }
    @keyframes dcSheen { 0%, 100% { background-position: 0% 8%; } 50% { background-position: 0% 92%; } }
    @keyframes dcBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
    @keyframes dcFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-9px) scale(1.012); } }
    .r { animation: dcRise 1100ms cubic-bezier(.22,.61,.36,1) both; }
    .w { animation: dcWiden 1400ms cubic-bezier(.22,.61,.36,1) both; }
"""

def rule(delay, origin="left"):
    return ('<div class="w" style="flex-grow: 1; height: 1px; background: linear-gradient(90deg, rgba(237,237,237,0) 0%%, '
            'rgba(237,237,237,.55) 30%%, rgba(237,237,237,.55) 70%%, rgba(237,237,237,0) 100%%); '
            'transform-origin: %s; animation-delay: %dms;"></div>') % (origin, delay)

def ctl(svg, delay):
    return ('<div class="r" style="width: 34px; height: 34px; border-radius: 50%%; border: 1px solid #2A2A2A; '
            'background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; '
            'color: #8A8A8A; animation-delay: %dms;">%s</div>') % (delay, svg)

ICON_SOUND = ('<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" '
              'stroke-linecap="round"><path d="M4 7v6M7.3 4.5v11M10.7 6.5v7M14 3.5v13M17.3 8v4"/></svg>')
ICON_LANG  = ('<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" '
              'stroke-linecap="round"><circle cx="10" cy="10" r="7.2"/><path d="M2.8 10h14.4M10 2.8c1.9 2 2.9 4.5 2.9 7.2s-1 5.2-2.9 7.2c-1.9-2-2.9-4.5-2.9-7.2s1-5.2 2.9-7.2z"/></svg>')

meta = lambda k, v, align: (
    '<div style="display: flex; flex-direction: column; gap: 7px; align-items: %s; width: 190px;">'
    '<span style="font-size: 9.5px; letter-spacing: 0.26em; color: #5A5A5A;">%s</span>'
    '<span style="font-size: 14px; letter-spacing: 0.04em; color: #C4C4C4;">%s</span></div>' % (align, k, v))

body = """
<div style="width: 1440px; height: 900px; background: #060606; color: #EDEDED; font-family: %(SANS)s; position: relative; overflow: hidden;">

  <div style="position: absolute; inset: 0; background: radial-gradient(78%% 52%% at 50%% 104%%, #3A3A3A 0%%, #1A1A1A 34%%, #0A0A0A 62%%, #060606 100%%); animation: dcGlow 9000ms ease-in-out infinite;"></div>
  <div style="position: absolute; inset: 0;">%(SPECKS)s</div>
  <svg style="position: absolute; inset: 0; width: 100%%; height: 100%%; opacity: 0.07; mix-blend-mode: screen;" xmlns="http://www.w3.org/2000/svg"><filter id="dcGrainIntro"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"></feTurbulence></filter><rect width="100%%" height="100%%" filter="url(#dcGrainIntro)"></rect></svg>
  <div style="position: absolute; inset: 0; background: radial-gradient(96%% 74%% at 50%% 46%%, rgba(0,0,0,0) 42%%, rgba(0,0,0,0.72) 100%%);"></div>

  <div style="position: absolute; top: 30px; left: 34px; display: flex; gap: 10px;">%(CTLS)s</div>

  <div style="position: relative; height: 900px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 160px;">

    <div class="r" style="display: flex; align-items: center; gap: 26px; width: 100%%; animation-delay: 260ms;">
      %(RULE1)s
      <span style="font-size: 11px; letter-spacing: 0.36em; color: #C4C4C4; white-space: nowrap;">个人网站 · PERSONAL SITE</span>
      %(RULE2)s
    </div>

    <div class="r" style="margin: 34px 0 30px 0; animation-delay: 460ms;">
      <div style="position: relative; width: 356px; height: 352px; animation: dcFloat 11000ms ease-in-out infinite;">
        <img src="wl-logo.png" style="width: 100%%; height: 100%%; object-fit: contain; filter: invert(1);">
        <div style="position: absolute; inset: 0; mix-blend-mode: multiply; pointer-events: none;
                    background: linear-gradient(177deg, #FFFFFF 0%%, #FAFAFA 24%%, #CFCFCF 48%%, #7E7E7E 72%%, #F2F2F2 100%%);
                    background-size: 100%% 220%%; background-repeat: no-repeat;
                    animation: dcSheen 8000ms ease-in-out infinite;"></div>
      </div>
    </div>

    <div class="r" style="display: flex; align-items: flex-end; justify-content: space-between; width: 100%%; animation-delay: 780ms;">
      %(METAL)s
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; max-width: 560px; text-align: center;">
        <span style="font-size: 16px; line-height: 1.7; letter-spacing: 0.03em; color: #EDEDED;">[一句话定位 —— 这句我们一起磨]</span>
        <span style="font-size: 11.5px; letter-spacing: 0.16em; color: #6E6E6E;">[ONE LINE IN ENGLISH]</span>
      </div>
      %(METAR)s
    </div>

    <div class="w" style="width: 100%%; height: 1px; margin-top: 26px; background: linear-gradient(90deg, rgba(237,237,237,0) 0%%, rgba(237,237,237,.5) 18%%, rgba(237,237,237,.5) 82%%, rgba(237,237,237,0) 100%%); animation-delay: 900ms;"></div>

    <div class="r" style="margin-top: 46px; display: flex; flex-direction: column; align-items: center; gap: 16px; animation-delay: 1080ms;">
      <div style="position: relative; animation: dcBob 3400ms ease-in-out infinite;">
        <div style="border: 1px solid #333333; padding: 17px 40px; font-size: 12.5px; letter-spacing: 0.24em; color: #EDEDED;
                    background: repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 6px) rgba(255,255,255,0.03);">向下滚动进入</div>
        <div style="position: absolute; left: -5px; top: -5px; width: 11px; height: 11px; border-left: 1px solid #7A7A7A; border-top: 1px solid #7A7A7A;"></div>
        <div style="position: absolute; right: -5px; top: -5px; width: 11px; height: 11px; border-right: 1px solid #7A7A7A; border-top: 1px solid #7A7A7A;"></div>
        <div style="position: absolute; left: -5px; bottom: -5px; width: 11px; height: 11px; border-left: 1px solid #7A7A7A; border-bottom: 1px solid #7A7A7A;"></div>
        <div style="position: absolute; right: -5px; bottom: -5px; width: 11px; height: 11px; border-right: 1px solid #7A7A7A; border-bottom: 1px solid #7A7A7A;"></div>
      </div>
      <div style="display: flex; align-items: center; gap: 9px; font-size: 11.5px; color: #5A5A5A;">
        <span>或按</span>
        <span style="border: 1px solid #2E2E2E; border-bottom-width: 2px; border-radius: 4px; padding: 3px 8px; color: #8A8A8A;">Enter ↵</span>
      </div>
    </div>

  </div>

  <div class="r" style="position: absolute; left: 0; right: 0; bottom: 34px; text-align: center; font-size: 10px; letter-spacing: 0.3em; color: #4A4A4A; animation-delay: 1400ms;">黑白呈现 · MONOCHROME BY DESIGN</div>

</div>
""" % dict(SANS=P.SANS, SPECKS=specks, CTLS=ctl(ICON_SOUND, 1600) + ctl(ICON_LANG, 1700),
           RULE1=rule(300, "right"), RULE2=rule(300, "left"),
           METAL=meta("NAME", "[你的名字]", "flex-start"), METAR=meta("SINCE", "2026", "flex-end"))

open("Intro.dc.html", "w", encoding="utf-8").write(P.doc(body, 1440, 900, STYLE))
print("Intro.dc.html ok")
