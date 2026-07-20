"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquarePlus, Check, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { docParagraphsToHtml, type TiptapDoc } from "@/lib/tiptap/doc-utils";

interface EditorialComment {
  id: string;
  paragraphId: string;
  authorAdminId: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
}

interface Props {
  storyId: string;
  doc: TiptapDoc;
  /** Bubbles the current open-comment count up so the parent can badge the
   * "these notes go to the writer" summary. */
  onCountChange?: (openCount: number) => void;
}

/**
 * The read-mode body with an inline editorial-comment layer: each paragraph
 * gets a hover affordance to leave a private "look at this" note for the
 * writer, anchored to that paragraph. Comments are the admin↔writer editorial
 * channel (EditorialComment), separate from the reader-facing margin notes.
 */
export function ReviewEditorialComments({ storyId, doc, onCountChange }: Props) {
  const [comments, setComments] = useState<EditorialComment[]>([]);
  const [openParaId, setOpenParaId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const paragraphs = useMemo(() => docParagraphsToHtml(doc), [doc]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/kekere/stories/${storyId}/editorial-comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch {
      // Non-fatal — the panel just shows no comments.
    }
  }, [storyId]);

  useEffect(() => { void load(); }, [load]);

  const byParagraph = useMemo(() => {
    const map: Record<string, EditorialComment[]> = {};
    for (const c of comments) (map[c.paragraphId] ??= []).push(c);
    return map;
  }, [comments]);

  useEffect(() => {
    onCountChange?.(comments.filter((c) => c.status === "OPEN").length);
  }, [comments, onCountChange]);

  function toggle(paraId: string) {
    setDraft("");
    setOpenParaId((cur) => {
      const next = cur === paraId ? null : paraId;
      if (next) setTimeout(() => composerRef.current?.focus(), 0);
      return next;
    });
  }

  async function addComment(paraId: string) {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/kekere/stories/${storyId}/editorial-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphId: paraId, body }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setDraft("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(comment: EditorialComment, status: "OPEN" | "RESOLVED") {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, status } : c)));
    await fetch(`/api/admin/kekere/stories/${storyId}/editorial-comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => void load());
  }

  async function remove(comment: EditorialComment) {
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    await fetch(`/api/admin/kekere/stories/${storyId}/editorial-comments/${comment.id}`, {
      method: "DELETE",
    }).catch(() => void load());
  }

  return (
    <div className="story-reader-prose text-[15px] leading-[1.75] text-[#1A1C20] [&_em]:italic [&_strong]:font-bold [&_u]:underline">
      {paragraphs.map((p, i) => {
        const group = p.id ? byParagraph[p.id] ?? [] : [];
        const openCount = group.filter((c) => c.status === "OPEN").length;
        const isOpen = openParaId === p.id;
        return (
          <div key={p.id || i} className="group relative">
            <div className="flex items-start gap-1.5">
              <p
                className="mb-[1.25em] min-w-0 flex-1"
                style={{ textAlign: p.textAlign ?? "left" }}
                dangerouslySetInnerHTML={{ __html: p.html || "<br/>" }}
              />
              {p.id && (
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  title={openCount > 0 ? `${openCount} note${openCount === 1 ? "" : "s"} for the writer` : "Leave a note for the writer"}
                  className={cn(
                    "mt-0.5 flex h-6 flex-none items-center gap-1 rounded-full px-1.5 text-[11px] font-semibold transition-opacity",
                    group.length > 0
                      ? "bg-[rgba(199,93,44,0.12)] text-[#C75D2C] opacity-100"
                      : "text-[#B0B6BE] opacity-0 hover:bg-[rgba(20,22,26,0.06)] hover:text-[#646B73] group-hover:opacity-100",
                    isOpen && "opacity-100",
                  )}
                >
                  <MessageSquarePlus size={13} />
                  {group.length > 0 && <span>{group.length}</span>}
                </button>
              )}
            </div>

            {isOpen && p.id && (
              <div className="mb-4 ml-0 rounded-[10px] border border-[rgba(199,93,44,0.25)] bg-[#FFFBF7] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#C75D2C]">
                    Notes for the writer
                  </span>
                  <button type="button" onClick={() => setOpenParaId(null)} className="text-[#B0B6BE] hover:text-[#646B73]">
                    <X size={13} />
                  </button>
                </div>

                {group.length > 0 && (
                  <ul className="mb-2.5 flex flex-col gap-2">
                    {group.map((c) => (
                      <li
                        key={c.id}
                        className={cn(
                          "rounded-[8px] border px-2.5 py-2 text-[13px]",
                          c.status === "RESOLVED"
                            ? "border-[rgba(20,22,26,0.08)] bg-[rgba(20,22,26,0.02)] text-[#9AA0A8] line-through"
                            : "border-[rgba(20,22,26,0.1)] bg-white text-[#1A1C20]",
                        )}
                      >
                        <p className="whitespace-pre-wrap no-underline">{c.body}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {c.status === "OPEN" ? (
                            <button
                              type="button"
                              onClick={() => setStatus(c, "RESOLVED")}
                              className="flex items-center gap-1 text-[10px] font-semibold text-[#1F8A5B] hover:underline"
                            >
                              <Check size={11} /> Resolve
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatus(c, "OPEN")}
                              className="flex items-center gap-1 text-[10px] font-semibold text-[#B7791F] hover:underline"
                            >
                              <RotateCcw size={11} /> Reopen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(c)}
                            className="flex items-center gap-1 text-[10px] font-semibold text-[#C0392B] hover:underline"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void addComment(p.id); }
                  }}
                  rows={2}
                  placeholder="Point the writer to something in this paragraph…"
                  className="w-full resize-none rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-white px-2.5 py-2 text-[13px] text-[#1A1C20] placeholder:text-[#B0B6BE] focus:outline-none focus:ring-1 focus:ring-[#C75D2C]/40"
                />
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    disabled={!draft.trim() || busy}
                    onClick={() => addComment(p.id)}
                    className="rounded-[7px] bg-[#C75D2C] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:bg-[#B0531E] disabled:opacity-40"
                  >
                    {busy ? "Adding…" : "Add note"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
