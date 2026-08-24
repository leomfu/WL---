/**
 * 工具页图标 —— 路径取自 docs/design/Tools.dc.html。
 * 平时 currentColor 走黑白，hover 时由卡片把 color 换成品牌色
 * （全站唯一允许出现彩色的地方，见 PLAN.md §5）。
 */

/** Claude 的十六道放射线：长短交替，跟视觉稿一致 */
const claudeRays = Array.from({ length: 16 }, (_, i) => {
  const angle = i * 22.5;
  const long = i % 2 === 0;
  return (
    <line
      key={i}
      x1="12"
      y1="12"
      x2="12"
      y2={long ? "2.4" : "5.2"}
      transform={`rotate(${angle} 12 12)`}
    />
  );
});

type IconDef = {
  viewBox: string;
  mode: "stroke" | "fill";
  strokeWidth?: number;
  node: React.ReactNode;
};

const ICONS: Record<string, IconDef> = {
  claude: { viewBox: "0 0 24 24", mode: "stroke", strokeWidth: 2, node: <>{claudeRays}</> },
  chatgpt: {
    viewBox: "0 0 24 24",
    mode: "stroke",
    strokeWidth: 1.5,
    node: (
      <>
        <path d="M12 2.4 20.4 7.2v9.6L12 21.6 3.6 16.8V7.2z" />
        <path d="M12 2.4v9.6l8.4 4.8M12 12 3.6 16.8" />
      </>
    ),
  },
  vscode: {
    viewBox: "0 0 24 24",
    mode: "stroke",
    strokeWidth: 1.5,
    node: (
      <>
        <path d="M17.4 2.6 21.6 4.6v14.8l-4.2 2-9.1-8.6-4.2 3.2-1.7-1.1V8.1l1.7-1.1 4.2 3.2z" />
        <path d="M17.4 7.3 11.3 12l6.1 4.7z" />
      </>
    ),
  },
  github: {
    viewBox: "0 0 16 16",
    mode: "fill",
    node: (
      <path d="M8 .5a7.5 7.5 0 0 0-2.4 14.6c.4.1.5-.2.5-.4v-1.3c-2.1.5-2.5-1-2.5-1-.4-.9-.9-1.1-.9-1.1-.7-.5 0-.5 0-.5.8.1 1.2.8 1.2.8.7 1.2 1.8.8 2.2.6.1-.5.3-.8.5-1-1.7-.2-3.4-.8-3.4-3.7 0-.8.3-1.5.8-2-.1-.2-.4-1 .1-2 0 0 .6-.2 2.1.8a7.2 7.2 0 0 1 3.8 0c1.4-1 2-.8 2-.8.5 1 .2 1.8.1 2 .5.5.8 1.2.8 2 0 2.9-1.8 3.5-3.4 3.7.3.2.5.7.5 1.4v2c0 .2.1.4.5.4A7.5 7.5 0 0 0 8 .5z" />
    ),
  },
  figma: {
    viewBox: "0 0 24 24",
    mode: "stroke",
    strokeWidth: 1.4,
    node: (
      <>
        <path d="M9 2.4h3.4v4.7H9a2.35 2.35 0 1 1 0-4.7z" />
        <path d="M12.4 2.4h3.4a2.35 2.35 0 1 1 0 4.7h-3.4z" />
        <path d="M9 7.1h3.4v4.7H9a2.35 2.35 0 1 1 0-4.7z" />
        <circle cx="14.15" cy="14.15" r="2.35" />
        <path d="M12.4 11.8v4.7a2.35 2.35 0 1 1-3.4-2.1z" />
      </>
    ),
  },
  notion: {
    viewBox: "0 0 24 24",
    mode: "stroke",
    strokeWidth: 1.5,
    node: (
      <>
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="3.2" />
        <path d="M8.5 16.8V7.2l7 9.6V7.2" />
      </>
    ),
  },
  vercel: {
    viewBox: "0 0 24 24",
    mode: "stroke",
    strokeWidth: 1.6,
    node: <path d="M12 3.6 21.6 20.4H2.4z" />,
  },
  spotify: {
    viewBox: "0 0 24 24",
    mode: "stroke",
    strokeWidth: 1.5,
    node: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.3 9.7c3.2-.9 6.6-.6 9.4 1" />
        <path d="M7.9 12.9c2.6-.7 5.3-.5 7.7.9" />
        <path d="M8.5 15.9c2-.5 4.1-.4 6 .7" />
      </>
    ),
  },
};

/** 没配到图标时的兜底：一个方框 */
const FALLBACK: IconDef = {
  viewBox: "0 0 24 24",
  mode: "stroke",
  strokeWidth: 1.5,
  node: <rect x="4" y="4" width="16" height="16" rx="3" />,
};

export function ToolIcon({ name, size = 23 }: { name: string; size?: number }) {
  const icon = ICONS[name] ?? FALLBACK;

  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill={icon.mode === "fill" ? "currentColor" : "none"}
      stroke={icon.mode === "stroke" ? "currentColor" : "none"}
      strokeWidth={icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icon.node}
    </svg>
  );
}
