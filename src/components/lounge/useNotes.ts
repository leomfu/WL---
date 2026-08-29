"use client";

import { useCallback, useMemo } from "react";
import { useStoredState } from "@/lib/useStoredState";

/**
 * 手记的存储层 —— 一叠便签，全部存在 localStorage 里。
 *
 * ⚠️ 这个站是纯静态导出，**没有后端**。所以这里写的东西：
 *   - 只在这台电脑的这个浏览器里，手机上看不到；
 *   - 清浏览器数据就全没了（所以界面上必须一直摆着「导出全部」）；
 *   - 不加密，同一台电脑上别人打开这页就能看到。
 * 这三条不是待办事项，是这个架构的边界，界面上要如实说出来，别让人以为有云端。
 *
 * 正文不在这里做防抖 —— 编辑中的缓冲在 Notes 组件的局部 state 里，
 * 停手一会儿才 flush 进来，否则每敲一个字都要把整叠便签 JSON 化写一遍。
 */

export type NoteKind = "memo" | "draft";

export type Note = {
  id: string;
  kind: NoteKind;
  /** 只有 draft 用得上 */
  title: string;
  /** 导出时的文件名（不含目录），只有 draft 用得上 */
  slug: string;
  body: string;
  created: number;
  updated: number;
};

const KEY = "lounge-notes";

const today = () => new Date().toISOString().slice(0, 10);

const makeNote = (kind: NoteKind = "memo"): Note => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  kind,
  title: "",
  slug: today(),
  body: "",
  created: Date.now(),
  updated: Date.now(),
});

function parse(raw: string): Note[] {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((n): n is Note => Boolean(n) && typeof n.id === "string")
      .map((n) => ({
        ...n,
        kind: n.kind === "draft" ? "draft" : "memo",
        title: typeof n.title === "string" ? n.title : "",
        slug: typeof n.slug === "string" && n.slug ? n.slug : today(),
        body: typeof n.body === "string" ? n.body : "",
        created: typeof n.created === "number" ? n.created : Date.now(),
        updated: typeof n.updated === "number" ? n.updated : Date.now(),
      }));
  } catch {
    return [];
  }
}

export function useNotes() {
  const [raw, setRaw] = useStoredState(KEY, "[]");
  const [selectedId, setSelectedId] = useStoredState("lounge-note-open", "");

  const notes = useMemo(() => {
    const list = parse(raw);
    // 最近改过的排前面 —— 一叠便签，最上面那张是你刚放下的
    return list.sort((a, b) => b.updated - a.updated);
  }, [raw]);

  const save = useCallback(
    (next: Note[]) => setRaw(JSON.stringify(next)),
    [setRaw],
  );

  const current = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  const create = useCallback(
    (kind: NoteKind = "memo") => {
      const note = makeNote(kind);
      save([note, ...notes]);
      setSelectedId(note.id);
      return note;
    },
    [notes, save, setSelectedId],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Note, "id" | "created">>) => {
      const found = notes.find((n) => n.id === id);
      if (!found) return;
      // 内容没变就别写 —— 免得 flush 一次就把这张便签顶到最上面
      const changed = (Object.keys(patch) as (keyof typeof patch)[]).some(
        (k) => found[k] !== patch[k],
      );
      if (!changed) return;
      save(
        notes.map((n) =>
          n.id === id ? { ...n, ...patch, updated: Date.now() } : n,
        ),
      );
    },
    [notes, save],
  );

  const remove = useCallback(
    (id: string) => {
      const next = notes.filter((n) => n.id !== id);
      save(next);
      if (selectedId === id) setSelectedId(next[0]?.id ?? "");
    },
    [notes, save, selectedId, setSelectedId],
  );

  return { notes, current, select: setSelectedId, create, update, remove };
}
