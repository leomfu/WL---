"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * 开场页背景：上海外滩夜景 + 深度图视差。
 *
 * 一张全屏 canvas，手写 WebGL（不引 three.js）。fragment shader 同时采样
 * 原图和深度图（`shanghai-depth.jpg`，**越亮越近**），按深度做 UV 位移：
 * 近处跟着指针动得多、远处动得少，于是这张平面照片有了纵深。
 *
 * 三个可动的量：
 *   uParallax —— 指针偏移（-1~1），缓动跟随，不瞬移
 *   uDolly    —— 进站时的推进量 0→1，近处向两侧滑开、远处向中心聚
 *   uColor    —— 上色进度 0→1。默认 0 = 纯黑白（全站黑白系统），
 *                只有「穿梭时间」那两秒才上色，而且颜色**从画面深处先亮起、
 *                向近处涌来**——时间倒流回有颜色的那一刻。
 *
 * ── 降级链 ──
 * SSR / 首帧一律只渲染静态 `<img>`（CSS grayscale），canvas 挂载成功后
 * 无缝盖上去（学 TimeDial 首帧固定角度的思路，避免 hydration 闪烁）。
 * prefers-reduced-motion 或拿不到 WebGL 上下文时，canvas 根本不挂，
 * 留下的就是那张静态黑白图。
 */

const PHOTO = "/images/intro/shanghai.webp";
const DEPTH = "/images/intro/shanghai-depth.jpg";
/** 原图 1672×941 */
const IMG_ASPECT = 1672 / 941;

/** 采样区域略微放大，给视差位移留边，免得推到边缘露底 */
const OVERSCAN = 1.06;

/**
 * 顶上让出的一段夜空（占屏高的比例）。
 *
 * 为什么要有它：照片自己的天空在东方明珠塔尖之上只剩 3%，
 * 满屏 cover 之后塔尖就顶在屏幕最上沿（实测 1440×900 下在 y≈4px），
 * 时间之钟想「悬在城市上空」根本没地方站。
 * 于是把整张照片压进屏幕下面那块（照片底边不动，人还坐在原地），
 * 顶上空出的这条带子用**接缝处那一行天空竖着抹上去**补齐：
 * 做法是把画面沿接缝镜像回去、同时压扁到 SKY_SQUEEZE ——
 * 接缝一阶连续（不会有横线），左右的云和明暗也对得上（不像纯色块那样换个窗口宽度就露馅），
 * 压扁又保证塔尖不会被整根镜像出来吊在屏幕顶上。
 * shader 和静态图两条路走的是同一组数，几何完全一致。
 */
const SKY_STRIP = 0.09;
/**
 * 镜像回去时的压扁比例：1/50，等于把接缝那一行天空抹开。
 * 别调大 —— 接缝下面 3px 就是东方明珠的塔尖，压扁比例一大，
 * 塔尖会被镜像成一小截倒挂在屏幕顶上的针。
 */
const SKY_SQUEEZE = 0.02;

/**
 * 进站时序（ms）。总长与 IntroScreen 的 EXIT.navigate 对齐。
 * 上色走 1.2 秒（不是早先的 0.76 秒）—— 要的是「慢慢亮起来」，不是闪一下。
 */
const TL = {
  colorMs: 1200,
  dollyDelay: 420,
  dollyMs: 1750,
} as const;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uDepth;
uniform vec2 uCover;
uniform vec2 uParallax;
uniform float uDolly;
uniform float uColor;
uniform float uStrip;

/** 视差的支点深度：比它远的往一边、比它近的往另一边，这一层保持不动 */
const float PIVOT = 0.30;
/** 最大位移（uv 单位），必须小于 OVERSCAN 留出的边距 */
const float AMP = 0.030;

vec2 warp(vec2 uv, float d) {
  vec2 shifted = uv + uParallax * AMP * (d - PIVOT);
  // 推进：近处放大得多（向两侧滑开），远处放大得少（向中心聚）
  float z = 1.0 - uDolly * (0.10 + 0.42 * d);
  return (shifted - 0.5) * z + 0.5;
}

void main() {
  // 照片只铺屏幕下面 (1 - uStrip) 那块；上面那条带子里 v < 0，
  // 把它镜像回画面里并压扁 —— 接缝那一行天空于是竖着抹满整条带子
  float v = (vUv.y - uStrip) / (1.0 - uStrip);
  v = v < 0.0 ? -v * ${SKY_SQUEEZE} : v;
  vec2 base = (vec2(vUv.x, v) - 0.5) * uCover + 0.5;

  // 采两次：先按原位深度位移，再用位移后的深度修一次，边界过渡更服帖
  float d = texture2D(uDepth, base).r;
  vec2 uv = warp(base, d);
  d = texture2D(uDepth, clamp(uv, 0.002, 0.998)).r;
  uv = clamp(warp(base, d), 0.002, 0.998);

  // 夜空带里，采样点不许越过接缝那一行往下走：
  // 接缝下面 3px 就是塔尖，视差一晃就会把它抹成一道从屏幕顶垂到钟上的竖痕。
  // 天空在这一带上下几乎同色，钉住这一行看不出任何代价。
  float cap = mix(1.0, 0.5 - 0.5 * uCover.y, step(vUv.y, uStrip));
  uv.y = min(uv.y, cap);

  vec3 c = texture2D(uTex, uv).rgb;

  // 夜空带里越往上越交给「照片最顶那一行」——那一行永远是纯天空。
  // 不这么做的话，宽扁窗口（比如 16:9）会 cover 掉照片上下，接缝那行正好落在
  // 东方明珠的天线上，一抹就把天线顺着拉到屏幕顶上，又变成一根竖线。
  // 这里是同一列的颜色，所以左右的明暗仍然对得上。
  float above = (uStrip - vUv.y) / max(uStrip, 0.0001);
  if (above > 0.0) {
    vec3 sky = texture2D(uTex, vec2(uv.x, 0.006)).rgb;
    c = mix(c, sky, smoothstep(0.0, 0.35, above));
  }

  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 gray = vec3(clamp((luma - 0.5) * 1.12 + 0.5, 0.0, 1.0));

  // 上色锋面：uColor 从 0 走到 1 时，edge 从最远端扫到最近端
  float edge = mix(1.05, -0.5, uColor);
  float amount = smoothstep(edge, edge + 0.45, 1.0 - d);

  vec3 col = mix(gray, c, amount) * (1.0 + 0.10 * amount * uColor);
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function loadTexture(gl: WebGLRenderingContext, src: string) {
  return new Promise<WebGLTexture | null>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      // 两张图都不是 2 的幂，WebGL1 下必须 CLAMP_TO_EDGE + 不生成 mipmap
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const easeInOut = (p: number) =>
  p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

export function CityDepth({
  warping = false,
  reduced = false,
  alt,
}: {
  warping?: boolean;
  reduced?: boolean;
  alt: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** 进站过场的起点（performance.now），null = 还没开始 */
  const warpStart = useRef<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (warping && warpStart.current === null) warpStart.current = performance.now();
  }, [warping]);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const gl =
      (canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: "low-power",
      }) as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // 一个覆盖全屏的大三角形，比两个三角形的四边形少一次插值接缝
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uCover = gl.getUniformLocation(program, "uCover");
    const uParallax = gl.getUniformLocation(program, "uParallax");
    const uDolly = gl.getUniformLocation(program, "uDolly");
    const uColor = gl.getUniformLocation(program, "uColor");
    gl.uniform1f(gl.getUniformLocation(program, "uStrip"), SKY_STRIP);
    gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "uDepth"), 1);

    let disposed = false;
    let raf = 0;
    let ready = false;

    // 指针目标值与缓动后的当前值
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    /** 移动端不弹陀螺仪权限框，改用一条极慢的自主漂移让画面保持活着 */
    const coarse =
      typeof window.matchMedia === "function" &&
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const driftAmp = coarse ? 0.85 : 0.18;

    const onPointerMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = ((e.clientY / window.innerHeight) * 2 - 1) * 0.62;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(host.clientWidth * dpr));
      const h = Math.max(1, Math.round(host.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const onLost = (e: Event) => {
      e.preventDefault();
      disposed = true;
      cancelAnimationFrame(raf);
      setLive(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (disposed || !ready || document.hidden) return;

      // cover 适配：照片铺的是「屏幕下面 (1-SKY_STRIP) 那块」，所以按那块的宽高比算，
      // 比图宽就按宽度铺、反之按高度铺，再整体缩一点留过扫边距
      const aspect = canvas.width / (canvas.height * (1 - SKY_STRIP));
      const cx = aspect > IMG_ASPECT ? 1 : aspect / IMG_ASPECT;
      const cy = aspect > IMG_ASPECT ? IMG_ASPECT / aspect : 1;
      gl.uniform2f(uCover, cx / OVERSCAN, cy / OVERSCAN);

      cur.x += (target.x - cur.x) * 0.055;
      cur.y += (target.y - cur.y) * 0.055;
      const t = now / 1000;
      const dx = (Math.sin(t * 0.11) + Math.sin(t * 0.037) * 0.5) * driftAmp;
      const dy = Math.sin(t * 0.083 + 1.3) * driftAmp * 0.7;
      gl.uniform2f(
        uParallax,
        Math.max(-1.15, Math.min(1.15, cur.x + dx)),
        Math.max(-1.15, Math.min(1.15, cur.y + dy)),
      );

      const start = warpStart.current;
      if (start === null) {
        gl.uniform1f(uDolly, 0);
        gl.uniform1f(uColor, 0);
      } else {
        const e = performance.now() - start;
        // 上色用 easeInOut：起手慢、中段推、收尾稳，比 easeOut 那种前重后轻更像「亮起来」
        gl.uniform1f(uColor, easeInOut(Math.min(1, e / TL.colorMs)));
        gl.uniform1f(
          uDolly,
          easeInOut(Math.min(1, Math.max(0, (e - TL.dollyDelay) / TL.dollyMs))),
        );
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    void Promise.all([loadTexture(gl, PHOTO), loadTexture(gl, DEPTH)]).then(
      ([tex, depth]) => {
        if (disposed || !tex || !depth) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, depth);
        ready = true;
        setLive(true);
      },
    );

    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("pointermove", onPointerMove);
      /**
       * ⚠️ 这里**不能**调 `WEBGL_lose_context.loseContext()`。
       * `canvas.getContext("webgl")` 对同一张 canvas 永远返回同一个上下文，
       * 所以一旦在清理里把它弄丢，下一次挂载拿到的就是个已经废掉的上下文，
       * 编译/链接全部静默失败，canvas 再也不会亮起来 ——
       * 开发模式下 React StrictMode 正好会「挂载→清理→再挂载」，
       * 于是 `npm run dev` 里永远只看得到那张静态降级图（生产构建没这问题，
       * 所以这个坑很容易被当成"WebGL 不支持"错判）。
       * 上下文跟着 canvas 一起被回收，不主动丢也不会泄漏。
       */
    };
  }, [reduced]);

  return (
    /* 这一层不 aria-hidden：照片是开场页的主体画面，那句 alt 对读屏用户是有意义的 */
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      {/* 顶上那条夜空带：把下面那张照片沿接缝镜像+压扁翻上来（同一个 src，不多下一次）。
          scaleY 的倍率必须是 shader 里 SKY_SQUEEZE 的倒数，两条路才对得上 */}
      <div
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: `${SKY_STRIP * 100}%` }}
        aria-hidden
      >
        <div
          className="absolute inset-x-0"
          style={{
            top: "100%",
            height: `${((1 - SKY_STRIP) / SKY_STRIP) * 100}%`,
            transformOrigin: "top",
            transform: `scaleY(${-1 / SKY_SQUEEZE})`,
          }}
        >
          <Image
            src={PHOTO}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ filter: "grayscale(1) contrast(1.06)", transform: `scale(${OVERSCAN})` }}
          />
        </div>
        {/* 和 shader 里那段 mix 对应：越往上越盖成照片顶行的那个灰，
            宽扁窗口下才不会把天线顺着抹到屏幕顶上。静态图这条路做不了逐列取色，
            用顶行的平均灰即可 —— 那几行本来就几乎是纯色 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(50,50,50,0) 0%, rgb(50,50,50) 35%)",
          }}
        />
      </div>
      {/* 首帧 / 降级态：静态黑白图。canvas 就绪后被它盖住，但不卸载，避免任何闪烁。
          这个盒子的位置/尺寸必须和 shader 里 uStrip + uCover 算出来的那块严丝合缝 */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ top: `${SKY_STRIP * 100}%` }}
      >
        <Image
          src={PHOTO}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          /* scale 要和 shader 里的 OVERSCAN 一致，否则 canvas 淡入时画面会"跳"一下 */
          style={{ filter: "grayscale(1) contrast(1.06)", transform: `scale(${OVERSCAN})` }}
        />
      </div>
      {!reduced && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full transition-opacity duration-500 ease-out"
          style={{ opacity: live ? 1 : 0 }}
        />
      )}
    </div>
  );
}
