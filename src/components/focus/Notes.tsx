"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  countWords,
  githubBlankUrl,
  githubNewFileUrl,
  readingMinutes,
  toBackup,
  toMarkdown,
} from "./noteExport";
import { useNotes } from "./useNotes";
import type { Note } from "./useNotes";
import type { Pomodoro } from "./usePomodoro";

/**
 * 放松区「手记」层 —— 备忘和博客草稿共用一个写字面。
 *
 * 放松区本来就是沉浸模式（全屏、导航收起、纯黑），这恰好是最好的写作环境，
 * 不用另造一个页面。
 *
 * 时间主题落在三处，都是真数据，没有硬贴：
 *   - 每条便签带时间戳，那一叠就是一条时间线，左边那列点/竖线是**把表盘的
 *     60 道刻度竖过来**当标尺，和音乐层、番茄钟同一套刻度语言；
 *   - 底部「约 N 分钟读完」，用时间衡量文字；
 *   - 番茄钟在跑时右上角挂剩余时间 —— 你在专注时段里写东西，两层是一件事的两面。
 *
 * ⚠️ 存的地方只有 localStorage（静态站，没有后端）。界面上必须一直摆着「导出全部」，
 * 并且如实写明「只在这台电脑上」。别做成看起来像有云端的样子。
 */

export function Notes({
  pomodoro,
  reduced,
}: {
  pomodoro: Pomodoro;
  reduced: boolean;
}) {
  const t = useTranslations("focus.notes");
  const { notes, current, select, create, update, remove } = useNotes();
  const [listOpen, setListOpen] = useState(false);
  const [copied, setCopied] = useState<"md" | "all" | null>(null);

  const copy = useCallback(async (text: string, which: "md" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // 剪贴板被拒（非 https / 没授权）就算了，下面还有下载那条路
    }
  }, []);

  const download = useCallback((text: string, name: string) => {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* 顶栏：便签叠的开关 + 新建 + 番茄钟剩余 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setListOpen((open) => !open)}
            aria-expanded={listOpen}
            className="text-[12.5px] tracking-[0.08em] text-desk-dim transition-colors hover:text-desk-ink"
          >
            {t("stack", { n: notes.length })}
          </button>
          <button
            type="button"
            onClick={() => {
              create("memo");
              setListOpen(false);
            }}
            className="text-[12.5px] tracking-[0.08em] text-desk-mute transition-colors hover:text-desk-ink"
          >
            {t("new")}
          </button>
        </div>

        <PomodoroTicker pomodoro={pomodoro} label={t("focusLeft")} />
      </div>

      {/* 一叠便签。左边那列刻度是表盘的 60 道刻度竖过来 */}
      <AnimatePresence initial={false}>
        {listOpen && notes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.3 }}
            className="overflow-hidden"
          >
            <ul className="max-h-[168px] overflow-y-auto border-y border-desk-line-2">
              {notes.map((note, i) => (
                <li key={note.id} className="group flex items-center">
                  <span
                    className="w-6 shrink-0 text-center text-[10px] text-desk-mute select-none"
                    aria-hidden
                  >
                    {i % 5 === 0 ? "|" : "·"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      select(note.id);
                      setListOpen(false);
                    }}
                    className="flex grow items-baseline gap-4 py-2.5 text-left"
                  >
                    <span className="w-[4.6rem] shrink-0 text-[11px] text-desk-mute tabular-nums">
                      {stampOf(note)}
                    </span>
                    <span
                      className={[
                        "grow truncate text-[13px] transition-colors",
                        note.id === current?.id
                          ? "text-desk-ink"
                          : "text-desk-dim group-hover:text-desk-ink",
                      ].join(" ")}
                    >
                      {preview(note) || t("blank")}
                    </span>
                    {note.kind === "draft" && (
                      <span className="shrink-0 text-[10px] tracking-[0.16em] text-desk-mute">
                        {t("kindDraft")}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    aria-label={t("remove")}
                    className="shrink-0 px-3 text-[13px] text-transparent transition-colors group-hover:text-desk-mute hover:!text-desk-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {current ? (
        /* key = 便签 id：换一张便签就重新挂载编辑器，编辑缓冲跟着重置，
           不用在 effect 里同步 props → state */
        <Editor
          key={current.id}
          note={current}
          onPatch={(patch) => update(current.id, patch)}
          onCopy={copy}
          onDownload={download}
          copied={copied}
        />
      ) : (
        <div className="flex flex-col items-center gap-5 py-16">
          <p className="text-[13px] leading-[1.9] text-desk-dim">
            {t("emptyLead")}
          </p>
          <button
            type="button"
            onClick={() => create("memo")}
            className="border border-black/12 px-5 py-2.5 text-[12.5px] tracking-[0.08em] text-desk-dim transition-colors hover:border-black/25 hover:text-desk-ink"
          >
            {t("newFirst")}
          </button>
        </div>
      )}

      {/* 存在哪儿说清楚 + 导出全部。这两样是这个方案的必需品，不是装饰 */}
      <div className="flex flex-col items-center gap-2.5 border-t border-desk-line-2 pt-5 sm:flex-row sm:justify-between">
        <p className="max-w-[400px] text-[10.5px] leading-[1.8] text-desk-mute">
          {t("localOnly")}
        </p>
        {notes.length > 0 && (
          <div className="flex shrink-0 items-center gap-5">
            <button
              type="button"
              onClick={() => copy(toBackup(notes), "all")}
              className="text-[11.5px] tracking-[0.08em] text-desk-mute transition-colors hover:text-desk-ink"
            >
              {copied === "all" ? t("copied") : t("copyAll")}
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  toBackup(notes),
                  `手记备份-${new Date().toLocaleDateString("sv-SE")}.md`,
                )
              }
              className="text-[11.5px] tracking-[0.08em] text-desk-mute transition-colors hover:text-desk-ink"
            >
              {t("exportAll")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 番茄钟剩余时间。每秒用 ref 写 DOM，不带着整层重渲染 */
function PomodoroTicker({
  pomodoro,
  label,
}: {
  pomodoro: Pomodoro;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const { running, remaining } = pomodoro;

  useEffect(() => {
    if (!running) return;
    const write = () => {
      const secs = Math.ceil(remaining() / 1000);
      if (ref.current) {
        ref.current.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(
          secs % 60,
        ).padStart(2, "0")}`;
      }
    };
    write();
    const timer = setInterval(write, 1000);
    return () => clearInterval(timer);
  }, [running, remaining]);

  if (!running) return null;

  return (
    <span className="flex shrink-0 items-baseline gap-2 text-[10.5px] tracking-[0.16em] text-desk-mute">
      {label}
      <span ref={ref} className="font-mono tabular-nums text-desk-dim">
        --:--
      </span>
    </span>
  );
}

/**
 * 写字面。正文和标题先落在局部 state 里，停手 400ms 才写进 localStorage ——
 * 每敲一个字就把整叠便签 JSON 化写一遍太浪费，而且会连累整个放松区重渲染。
 * 切走／关掉时立刻 flush，不会丢。
 */
function Editor({
  note,
  onPatch,
  onCopy,
  onDownload,
  copied,
}: {
  note: Note;
  onPatch: (patch: Partial<Note>) => void;
  onCopy: (text: string, which: "md") => void;
  onDownload: (text: string, name: string) => void;
  copied: "md" | "all" | null;
}) {
  const t = useTranslations("focus.notes");
  const [title, setTitle] = useState(note.title);
  const [slug, setSlug] = useState(note.slug);
  const [body, setBody] = useState(note.body);

  /* 最新的值和回调 —— 在 effect 里同步，不能在渲染期间写 ref（React 19 的 hooks 规则） */
  const latest = useRef({ title, slug, body, onPatch });
  useEffect(() => {
    latest.current = { title, slug, body, onPatch };
  });

  const flush = useCallback(() => {
    const now = latest.current;
    now.onPatch({ title: now.title, slug: now.slug, body: now.body });
  }, []);

  /** 停手 400ms 落一次盘 */
  useEffect(() => {
    const timer = setTimeout(flush, 400);
    return () => clearTimeout(timer);
  }, [title, slug, body, flush]);

  /** 切层、换便签时立刻落盘，不等那 400ms */
  useEffect(() => flush, [flush]);

  const isDraft = note.kind === "draft";
  const words = countWords(body);
  /** 拿编辑中的值（还没落盘的那份）去生成导出内容 */
  const edited = { ...note, title, slug, body };
  const link = githubNewFileUrl(edited);

  return (
    <div className="flex flex-col gap-4">
      {isDraft && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          aria-label={t("titleLabel")}
          className="w-full border-b border-desk-line-2 bg-transparent pb-3 font-serif text-[21px] font-light tracking-[0.02em] text-desk-ink outline-none placeholder:text-desk-placeholder focus:border-black/25 sm:text-[24px]"
        />
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("bodyPlaceholder")}
        aria-label={t("bodyLabel")}
        spellCheck={false}
        className="min-h-[34vh] w-full resize-none bg-transparent font-serif text-[15px] leading-[1.95] text-desk-ink outline-none placeholder:text-desk-placeholder"
      />

      <div className="flex flex-col gap-4 border-t border-desk-line-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 字数 · 读完要多久 —— 用时间衡量文字 */}
        <div className="flex items-center gap-5">
          <span className="text-[11px] tracking-[0.08em] text-desk-mute tabular-nums">
            {words > 0
              ? t("stats", { n: words, min: readingMinutes(body) })
              : t("statsEmpty")}
          </span>

          {/* 备忘 / 草稿 */}
          <div className="flex items-stretch border border-black/10">
            {(["memo", "draft"] as const).map((kind, i) => (
              <button
                key={kind}
                type="button"
                onClick={() => onPatch({ kind })}
                aria-pressed={note.kind === kind}
                className={[
                  "px-3 py-1.5 text-[11.5px] tracking-[0.06em] transition-colors",
                  i > 0 ? "border-l border-black/10" : "",
                  note.kind === kind
                    ? "bg-black/[0.055] text-desk-ink"
                    : "text-desk-dim hover:bg-black/[0.03] hover:text-desk-ink",
                ].join(" ")}
              >
                {t(kind === "memo" ? "kindMemo" : "kindDraft")}
              </button>
            ))}
          </div>
        </div>

        {/* 出口 —— 只有草稿才有。备忘就是备忘，不该有「发布」这种东西 */}
        {isDraft && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-[10.5px] tracking-[0.1em] text-desk-mute">
              {t("fileLabel")}
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                aria-label={t("fileLabel")}
                className="w-[8.5rem] border-b border-black/10 bg-transparent pb-0.5 text-center font-mono text-[11.5px] text-desk-dim outline-none focus:border-black/30 focus:text-desk-ink"
              />
              <span className="text-desk-mute">.md</span>
            </label>

            <button
              type="button"
              onClick={() => onCopy(toMarkdown(edited), "md")}
              className="text-[12px] tracking-[0.08em] text-desk-dim transition-colors hover:text-desk-ink"
            >
              {copied === "md" ? t("copied") : t("copyMd")}
            </button>

            <button
              type="button"
              onClick={() =>
                onDownload(toMarkdown(edited), `${slug || "post"}.md`)
              }
              className="text-[12px] tracking-[0.08em] text-desk-mute transition-colors hover:text-desk-ink"
            >
              {t("downloadMd")}
            </button>

            {/* 短文直接把正文塞进 GitHub 新建文件页的 URL；超过 8191 字节就先复制再开空白页 */}
            {link.tooLong ? (
              <button
                type="button"
                onClick={() => {
                  onCopy(toMarkdown(edited), "md");
                  window.open(githubBlankUrl(), "_blank", "noreferrer");
                }}
                title={t("tooLongHint")}
                className="border border-black/12 px-4 py-2 text-[12px] tracking-[0.06em] text-desk-dim transition-colors hover:border-black/25 hover:text-desk-ink"
              >
                {t("copyThenGithub")}
              </button>
            ) : (
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="border border-black/12 px-4 py-2 text-[12px] tracking-[0.06em] text-desk-dim transition-colors hover:border-black/25 hover:text-desk-ink"
              >
                {t("toGithub")}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 今天只显示时刻，往前显示日期 —— 一叠便签里最有用的信息是「多久以前」 */
function stampOf(note: Note) {
  const date = new Date(note.updated);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("sv-SE").slice(5);
}

const preview = (note: Note) =>
  (note.title.trim() || note.body.trim().split("\n")[0] || "").slice(0, 46);
