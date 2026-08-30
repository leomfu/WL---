import type { NavKey } from "@/lib/nav";

/**
 * 侧边栏导航图标 —— 路径直接取自 docs/design/Main.dc.html（线性、1.5 描边、20×20）。
 */
const PATHS: Record<NavKey, React.ReactNode> = {
  home: <path d="M3.4 8.5 10 3.1l6.6 5.4V16a1 1 0 0 1-1 1h-3.3v-4.6H7.7V17H4.4a1 1 0 0 1-1-1z" />,
  projects: (
    <>
      <path d="M17.3 2.7 2.9 8.3l6 1.8 1.8 6z" />
      <path d="M17.3 2.7 8.9 10.1" />
    </>
  ),
  videos: (
    <>
      <rect x="2.4" y="4.4" width="15.2" height="11.2" rx="2.2" />
      <path d="M8.6 8.1 13 10l-4.4 1.9z" />
    </>
  ),
  /* 以下四个不在画板里（画板画的是 2026-08 之前那八项），照同一套笔法补的：线性、1.5 描边、20×20 */
  photos: (
    <>
      <path d="M2.6 7.4a1.6 1.6 0 0 1 1.6-1.6h1.9l1.1-1.7h4.6l1.1 1.7h1.9a1.6 1.6 0 0 1 1.6 1.6v6.8a1.6 1.6 0 0 1-1.6 1.6H4.2a1.6 1.6 0 0 1-1.6-1.6z" />
      <circle cx="10" cy="10.7" r="3" />
    </>
  ),
  records: (
    <>
      <circle cx="10" cy="10" r="7.3" />
      <circle cx="10" cy="10" r="3.1" />
      <circle cx="10" cy="10" r="0.6" fill="currentColor" />
    </>
  ),
  library: (
    <>
      <path d="M10 5.6C8.6 4.4 6.8 4 4.4 4.2a.9.9 0 0 0-.8.9v8.4a.9.9 0 0 0 .9.9c2.2-.1 4 .2 5.5 1.4" />
      <path d="M10 5.6c1.4-1.2 3.2-1.6 5.6-1.4a.9.9 0 0 1 .8.9v8.4a.9.9 0 0 1-.9.9c-2.2-.1-4 .2-5.5 1.4" />
      <path d="M10 5.6v10.2" />
    </>
  ),
  guestbook: (
    <>
      <path d="M3.2 6.1a1.7 1.7 0 0 1 1.7-1.7h10.2a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H8.4L4.6 16.7v-2.9a1.7 1.7 0 0 1-1.4-1.7z" />
      <path d="M6.8 8.3h6.4M6.8 11h4.1" />
    </>
  ),
  blog: (
    <>
      <path d="M12.9 3.3 16.7 7.1 8 15.8l-4.6.8.8-4.6z" />
      <path d="M11.4 4.8 15.2 8.6" />
    </>
  ),
  news: (
    <>
      <path d="M3 5.4a1 1 0 0 1 1-1h9.4a1 1 0 0 1 1 1v9.2a1.8 1.8 0 0 0 1.8 1.8H5.3A2.3 2.3 0 0 1 3 14.1z" />
      <path d="M14.4 7.6h1.5a1 1 0 0 1 1 1v5.8a1.8 1.8 0 0 1-1.8 1.8" />
      <path d="M5.6 7.5h5.2M5.6 10.2h5.2M5.6 12.9h3.1" />
    </>
  ),
  about: (
    <>
      <circle cx="10" cy="10" r="7.3" />
      <circle cx="10" cy="8.1" r="2.4" />
      <path d="M5.4 15.8a5.3 5.3 0 0 1 9.2 0" />
    </>
  ),
  tools: (
    <path d="M13.3 2.6a4.3 4.3 0 0 0-3.9 6l-6.2 6.2a1.7 1.7 0 0 0 2.4 2.4l6.2-6.2a4.3 4.3 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z" />
  ),
  focus: (
    <>
      <path d="M2.5 6.6c1.3-1.6 2.5-1.6 3.8 0s2.5 1.6 3.8 0 2.5-1.6 3.8 0 2.5 1.6 3.6 0" />
      <path d="M2.5 10.5c1.3-1.6 2.5-1.6 3.8 0s2.5 1.6 3.8 0 2.5-1.6 3.8 0 2.5 1.6 3.6 0" />
      <path d="M2.5 14.4c1.3-1.6 2.5-1.6 3.8 0s2.5 1.6 3.8 0 2.5-1.6 3.8 0 2.5 1.6 3.6 0" />
    </>
  ),
  contact: (
    <>
      <rect x="2.4" y="4.6" width="15.2" height="10.8" rx="1.8" />
      <path d="M3 6.2 10 11l7-4.8" />
    </>
  ),
};

export function NavIcon({ name, size = 18 }: { name: NavKey; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
