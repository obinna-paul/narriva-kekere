"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Check, PencilLine, CornerDownRight, AlertCircle, ArrowRight, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { docParagraphsToHtml, htmlToInlineNodes, type TiptapDoc, type TiptapInlineNode, type TiptapParagraphNode } from "@/lib/tiptap/doc-utils";
import { diffParagraphWords, type DiffSpan } from "@/lib/tiptap/paragraph-diff";

interface EditorialComment {
  id: string;
  paragraphId: string;
  authorRole: "EDITOR" | "WRITER";
  body: string;
  status: "OPEN" | "RESOLVED";
}

export interface WriterReviewProps {
  storyId: string;
  title: string;
  originalHookLine: string;
  editedHookLine: string;
  hookLineChanged: boolean;
  originalBody: TiptapDoc;
  editedBody: TiptapDoc;
  bodyChanged: boolean;
  comments: EditorialComment[];
  summaryNote: string | null;
  cowrieCost: number;
  writerSharePercent: number;
  isPostContract: boolean;
}

type ParaKind = "unchanged" | "changed" | "added" | "removed";
type Decision = "accept" | "reject";
interface CommentState { resolved: boolean; reply: string }

interface Unit {
  id: string;
  kind: ParaKind;
  newHtml?: string;
  oldHtml?: string;
  spans?: DiffSpan[] | null;
  textAlign?: "left" | "center" | "right";
  comments: EditorialComment[];
}

function renderSpansToHtml(spans: DiffSpan[]): string {
  return spans
    .map((s) => {
      if (s.kind === "equal") return s.html;
      if (s.kind === "removed") {
        return `<span style="text-decoration:line-through;text-decoration-color:#A13A3A;color:#A13A3A;background:rgba(193,58,58,0.12);border-radius:3px;">${s.html}</span>`;
      }
      return `<span style="text-decoration:underline;text-decoration-color:#1F8A5B;color:#1F8A5B;background:rgba(31,138,91,0.14);border-radius:3px;">${s.html}</span>`;
    })
    .join("");
}

export function WriterReviewView(props: WriterReviewProps) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [commentState, setCommentState] = useState<Record<string, CommentState>>({});
  const [writerNotes, setWriterNotes] = useState<Record<string, string[]>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [writerEdits, setWriterEdits] = useState<Record<string, { html: string; nodes: TiptapInlineNode[] }>>({});
  const [editingParaId, setEditingParaId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "contract" | "accepted_post_contract" | "returned">(null);

  const editedParas = useMemo(() => docParagraphsToHtml(props.editedBody), [props.editedBody]);
  const originalParas = useMemo(() => docParagraphsToHtml(props.originalBody), [props.originalBody]);
  const origHtmlById = useMemo(() => new Map(originalParas.map((p) => [p.id, p.html])), [originalParas]);
  const editedIds = useMemo(() => new Set(editedParas.map((p) => p.id)), [editedParas]);
  const origNodeById = useMemo(() => {
    const m = new Map<string, TiptapParagraphNode>();
    for (const n of props.originalBody.content ?? []) if (n.attrs?.id) m.set(n.attrs.id, n);
    return m;
  }, [props.originalBody]);
  const editedNodeById = useMemo(() => {
    const m = new Map<string, TiptapParagraphNode>();
    for (const n of props.editedBody.content ?? []) if (n.attrs?.id) m.set(n.attrs.id, n);
    return m;
  }, [props.editedBody]);
  const commentsByPara = useMemo(() => {
    const m: Record<string, EditorialComment[]> = {};
    for (const c of props.comments) (m[c.paragraphId] ??= []).push(c);
    return m;
  }, [props.comments]);

  const units = useMemo<Unit[]>(() => {
    const list: Unit[] = [];
    for (const p of editedParas) {
      const kind: ParaKind = !p.id || !origHtmlById.has(p.id) ? "added" : origHtmlById.get(p.id) !== p.html ? "changed" : "unchanged";
      const spans = kind === "changed" && p.id ? diffParagraphWords(origNodeById.get(p.id), editedNodeById.get(p.id)) : undefined;
      list.push({ id: p.id, kind, newHtml: p.html, oldHtml: p.id ? origHtmlById.get(p.id) : undefined, spans, textAlign: p.textAlign, comments: p.id ? commentsByPara[p.id] ?? [] : [] });
    }
    originalParas.forEach((p, i) => {
      if (!p.id || editedIds.has(p.id) || !p.html.trim()) return;
      let insertAt = list.length;
      for (let j = i - 1; j >= 0; j--) {
        const idx = list.findIndex((u) => u.id === originalParas[j].id);
        if (idx >= 0) { insertAt = idx + 1; break; }
      }
      list.splice(insertAt, 0, { id: p.id, kind: "removed", oldHtml: p.html, comments: commentsByPara[p.id] ?? [] });
    });
    return list;
  }, [editedParas, originalParas, origHtmlById, editedIds, origNodeById, editedNodeById, commentsByPara]);

  const changeUnits = units.filter((u) => u.kind !== "unchanged");

  const decisionFor = (id: string): Decision => decisions[id] ?? "accept";
  const setDecision = (id: string, d: Decision) => setDecisions((prev) => ({ ...prev, [id]: d }));
  const commentFor = (id: string): CommentState => commentState[id] ?? { resolved: false, reply: "" };
  const setComment = (id: string, patch: Partial<CommentState>) =>
    setCommentState((prev) => ({ ...prev, [id]: { ...commentFor(id), ...patch } }));

  const addWriterNote = (id: string) => {
    const body = (noteDraft[id] ?? "").trim();
    if (!body) return;
    setWriterNotes((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), body] }));
    setNoteDraft((prev) => ({ ...prev, [id]: "" }));
    setOpenNoteId(null);
  };
  const removeWriterNote = (id: string, index: number) =>
    setWriterNotes((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((_, i) => i !== index) }));

  /** `baselineHtml` is what the paragraph reads as with no writer edit — the
   * editor's proposed version, or the original for one they deleted. Compared
   * against so that opening the editor and saving without really changing
   * anything doesn't register as an edit: that would flip the whole review
   * into "send back to the editor" and cost a round-trip over nothing. */
  const saveWriterEdit = (id: string, html: string, baselineHtml: string) => {
    setEditingParaId(null);
    if (!id) return;
    const nodes = htmlToInlineNodes(html);
    const text = nodes.map((n) => (n.type === "text" ? n.text : "")).join("").trim();
    // Emptying a paragraph is almost certainly a mis-tap, not an intent to
    // delete — rejecting the change is how text gets removed.
    if (!text) return;
    // Compare parsed nodes, not raw markup: the browser normalises what it
    // hands back from a contentEditable, so identical text can come out as a
    // different HTML string.
    if (JSON.stringify(nodes) === JSON.stringify(htmlToInlineNodes(baselineHtml))) {
      // Typed all the way back to the editor's version — that's an undo.
      revertWriterEdit(id);
      return;
    }
    setWriterEdits((prev) => ({ ...prev, [id]: { html, nodes } }));
  };
  const revertWriterEdit = (id: string) =>
    setWriterEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const anyRejected = changeUnits.some((u) => decisionFor(u.id) === "reject");
  const rejectedHook = props.hookLineChanged && (decisions["__hook__"] ?? "accept") === "reject";
  const hasReply = Object.values(commentState).some((c) => c.reply.trim().length > 0);
  const hasNewNotes = Object.values(writerNotes).some((arr) => arr.length > 0);
  const hasWriterEdits = Object.keys(writerEdits).length > 0;
  const goesToEditor = anyRejected || rejectedHook || hasReply || hasNewNotes || hasWriterEdits;

  // ---- Selection-driven floating toolbar ----
  const bodyRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ paragraphId: string; top: number; left: number } | null>(null);
  const clearAnchor = useCallback(() => {
    setAnchor(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      const container = bodyRef.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !container) { setAnchor(null); return; }
      const range = sel.getRangeAt(0);
      const start = range.commonAncestorContainer;
      const el = start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement;
      const host = el?.closest("[data-para-id]") as HTMLElement | null;
      // No id means nothing to anchor a comment or an edit to — both would be
      // dropped server-side, so don't offer the toolbar at all.
      if (!host || !host.dataset.paraId || !container.contains(host) || host.isContentEditable) { setAnchor(null); return; }
      const rect = range.getBoundingClientRect();
      const box = container.getBoundingClientRect();
      setAnchor({
        paragraphId: host.dataset.paraId ?? "",
        top: rect.top - box.top,
        left: rect.left - box.left + rect.width / 2,
      });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const totalChanges = changeUnits.length + (props.hookLineChanged ? 1 : 0);
  const acceptedCount = changeUnits.filter((u) => decisionFor(u.id) === "accept").length + (props.hookLineChanged ? (rejectedHook ? 0 : 1) : 0);

  async function submit() {
    setBusy(true);
    setError(null);
    const paraDecisions: Record<string, Decision> = {};
    for (const u of changeUnits) paraDecisions[u.id] = decisionFor(u.id);
    const commentDecisions: Record<string, { resolved?: boolean; reply?: string }> = {};
    for (const [id, s] of Object.entries(commentState)) {
      if (s.resolved || s.reply.trim()) commentDecisions[id] = { resolved: s.resolved, reply: s.reply.trim() || undefined };
    }
    const newComments: { paragraphId: string; body: string }[] = [];
    for (const [id, notes] of Object.entries(writerNotes)) {
      for (const body of notes) newComments.push({ paragraphId: id, body });
    }
    const paragraphEdits: Record<string, TiptapInlineNode[]> = {};
    for (const [id, edit] of Object.entries(writerEdits)) paragraphEdits[id] = edit.nodes;
    const fullNote = rejectedHook
      ? `${note.trim() ? note.trim() + "\n\n" : ""}I'd like to keep my original hook line: "${props.originalHookLine}"`
      : note.trim();

    try {
      const res = await fetch(`/api/kekere/stories/${props.storyId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: paraDecisions, commentDecisions, newComments, paragraphEdits, note: fullNote || undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? "Something went wrong."); setBusy(false); return; }
      const data = await res.json();
      const outcome: "contract" | "accepted_post_contract" | "returned" =
        data.outcome === "contract" || data.outcome === "accepted_post_contract" ? data.outcome : "returned";
      setDone(outcome);
      setTimeout(() => router.push(outcome === "contract" ? "/kekere/contracts" : "/kekere/feed"), 1500);
    } catch { setError("Network error."); setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[560px] px-[22px] pb-24 pt-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]"><Check size={28} /></div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
          {done === "contract" ? "Edits accepted" : done === "accepted_post_contract" ? "Changes approved" : "Sent back to your editor"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
          {done === "contract" ? "Taking you to your publishing contract — sign it and your story enters the publishing queue."
            : done === "accepted_post_contract" ? "Your editor will publish your story shortly."
            : "Your editor will review your feedback. We'll notify you when there's an update."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-[22px] pb-[calc(120px+env(safe-area-inset-bottom))] pt-6">
      <Link href="/kekere/feed" className="mb-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors active:bg-[rgba(42,26,18,0.06)]" aria-label="Back"><ChevronLeft size={20} /></Link>

      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]">Editorial review</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight tracking-[-0.2px] text-[var(--color-ink)]">{props.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-ink-muted-2)]"><span>{totalChanges} change{totalChanges === 1 ? "" : "s"} to review</span><span className="text-[var(--color-ink-muted-3)]">·</span><span>{acceptedCount} accepted</span></div>
      </div>

      {props.summaryNote && (
        <div className="mb-6 rounded-2xl border border-[rgba(199,93,44,0.2)] bg-gradient-to-br from-[rgba(199,93,44,0.05)] to-[rgba(199,93,44,0.02)] p-5">
          <div className="mb-3 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(199,93,44,0.12)]"><PencilLine size={13} className="text-[var(--color-primary)]" /></span><p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-primary)]">A note from your editor</p></div>
          <p className="whitespace-pre-wrap text-[14px] leading-[1.65] text-[var(--color-ink)]">{props.summaryNote}</p>
        </div>
      )}

      {totalChanges > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-[12px]"><span className="font-semibold text-[var(--color-ink)]">{acceptedCount} of {totalChanges} accepted</span><span className="text-[var(--color-ink-muted-2)]">{Math.round((acceptedCount / totalChanges) * 100)}%</span></div>
          <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full bg-[rgba(42,26,18,0.08)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${(acceptedCount / totalChanges) * 100}%` }} /></div>
        </div>
      )}

      {props.hookLineChanged && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Hook line</h2>
          <div className="overflow-hidden rounded-2xl border border-[rgba(42,26,18,0.1)]">
            <div className={cn("px-5 py-4", rejectedHook ? "bg-[rgba(42,26,18,0.02)]" : "bg-[rgba(193,58,58,0.04)]")}><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Your original</p><p className={cn("font-[family-name:var(--font-display)] text-[16px] italic leading-relaxed", rejectedHook ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted-3)] line-through")}>{props.originalHookLine || "—"}</p></div>
            <div className="h-px bg-[rgba(42,26,18,0.08)]" />
            <div className={cn("px-5 py-4 border-l-[3px]", rejectedHook ? "border-[var(--color-primary)]" : "border-[#1F8A5B]")}><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Editor&apos;s proposed</p><p className={cn("font-[family-name:var(--font-display)] text-[16px] italic leading-relaxed", rejectedHook ? "line-through text-[var(--color-ink-muted-3)]" : "text-[var(--color-ink)]")}>{props.editedHookLine || "—"}</p></div>
          </div>
          <div className="mt-3"><DiffToggle accepted={!rejectedHook} onAccept={() => setDecisions((p) => ({ ...p, __hook__: "accept" }))} onReject={() => setDecisions((p) => ({ ...p, __hook__: "reject" }))} acceptLabel="Use editor's hook line" rejectLabel="Keep my original" /></div>
        </section>
      )}

      {props.bodyChanged && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Story text</h2>
          <p className="mb-3 mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted-2)]">Select any words to comment on them or rewrite them yourself.</p>
          <div ref={bodyRef} className="relative flex flex-col gap-4">
            {/* Floating selection toolbar */}
            {anchor && (
              <div
                className="absolute z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[#2A1A12] p-0.5 shadow-lg"
                style={{ top: Math.max(0, anchor.top - 40), left: anchor.left }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <button type="button" onClick={() => { setOpenNoteId(anchor.paragraphId); clearAnchor(); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white active:bg-white/10 transition-colors"><MessageSquare size={13} /> Comment</button>
                <button type="button" onClick={() => { setEditingParaId(anchor.paragraphId); clearAnchor(); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white active:bg-white/10 transition-colors"><PencilLine size={13} /> Edit</button>
              </div>
            )}

            {units.map((u, i) => {
              if (u.kind === "unchanged") {
                if (!u.newHtml?.trim()) return <div key={u.id || i} className="h-2" />;
                const edit = u.id ? writerEdits[u.id] : undefined;
                return (
                  <div key={u.id || i} className="px-1">
                    {editingParaId === u.id ? (
                      <ParagraphEditor html={edit?.html ?? u.newHtml ?? ""} textAlign={u.textAlign} onSave={(html) => saveWriterEdit(u.id, html, u.newHtml ?? "")} onCancel={() => setEditingParaId(null)} />
                    ) : (
                      <p data-para-id={u.id} className={cn("text-[15px] leading-[1.75] text-[var(--color-ink)]", edit && "rounded-md bg-[rgba(31,138,91,0.07)] px-2 py-1 ring-1 ring-[rgba(31,138,91,0.25)]")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: edit?.html ?? u.newHtml ?? "" }} />
                    )}
                    {edit && editingParaId !== u.id && <WriterEditBadge onRevert={() => revertWriterEdit(u.id)} />}
                    {u.id && (u.comments.length > 0 || (writerNotes[u.id] ?? []).length > 0 || openNoteId === u.id) && (
                      <div className="mt-1.5 flex flex-col gap-2">
                        {u.comments.map((c) => <InlineComment key={c.id} comment={c} state={commentFor(c.id)} onToggleResolved={() => setComment(c.id, { resolved: !commentFor(c.id).resolved })} onReplyChange={(v) => setComment(c.id, { reply: v })} />)}
                        <WriterNoteBlock isOpen={openNoteId === u.id} draft={noteDraft[u.id] ?? ""} notes={writerNotes[u.id] ?? []} onClose={() => setOpenNoteId(null)} onDraftChange={(v) => setNoteDraft((p) => ({ ...p, [u.id]: v }))} onAdd={() => addWriterNote(u.id)} onRemove={(idx) => removeWriterNote(u.id, idx)} />
                      </div>
                    )}
                  </div>
                );
              }

              const rejected = decisionFor(u.id) === "reject";
              const writerEdit = u.id ? writerEdits[u.id] : undefined;

              return (
                <div key={u.id || i} className="relative overflow-hidden rounded-xl border border-[rgba(42,26,18,0.1)]">
                  <div className="flex items-center justify-between border-b border-[rgba(42,26,18,0.06)] bg-[rgba(42,26,18,0.02)] px-4 py-2">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]", u.kind === "added" ? "bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]" : u.kind === "removed" ? "bg-[rgba(193,58,58,0.1)] text-[#A13A3A]" : "bg-[rgba(199,93,44,0.12)] text-[var(--color-primary)]")}><AlertCircle size={10} />{u.kind === "added" ? "New paragraph" : u.kind === "removed" ? "Removed" : "Edited"}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Change {i + 1} of {changeUnits.length}</span>
                  </div>

                  <div className="p-4">
                    {writerEdit && editingParaId !== u.id && (
                      <div className="mb-3 rounded-lg bg-[rgba(31,138,91,0.06)] px-4 py-3 ring-1 ring-[rgba(31,138,91,0.25)]">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#1F8A5B]">Your version</p>
                        <p data-para-id={u.id} className="text-[14.5px] leading-[1.7] text-[var(--color-ink)]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: writerEdit.html }} />
                      </div>
                    )}
                    {editingParaId === u.id && (
                      <div className="mb-3"><ParagraphEditor html={writerEdit?.html ?? (u.kind === "removed" ? u.oldHtml : u.newHtml) ?? ""} textAlign={u.textAlign} onSave={(html) => saveWriterEdit(u.id, html, ((u.kind === "removed" ? u.oldHtml : u.newHtml) ?? ""))} onCancel={() => setEditingParaId(null)} /></div>
                    )}

                    {!writerEdit && editingParaId !== u.id && u.kind === "changed" && u.spans && (
                      <div className={cn("rounded-lg px-4 py-3", rejected && "bg-[rgba(42,26,18,0.02)]")}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">{rejected ? "Your original (kept)" : "Tracked changes"}</p>
                        <p data-para-id={u.id} className="text-[14.5px] leading-[1.7] text-[var(--color-ink)]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: rejected ? u.oldHtml || "" : renderSpansToHtml(u.spans) }} />
                      </div>
                    )}
                    {!writerEdit && editingParaId !== u.id && u.kind === "changed" && !u.spans && (
                      <>
                        <div className={cn("rounded-lg px-4 py-3 mb-3", rejected ? "bg-[rgba(42,26,18,0.03)]" : "bg-[rgba(193,58,58,0.05)]")}><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Original</p><p className={cn("text-[14.5px] leading-[1.7]", rejected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted-3)] line-through")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} /></div>
                        <div className={cn("rounded-lg px-4 py-3", rejected ? "bg-[rgba(193,58,58,0.05)] line-through text-[var(--color-ink-muted-3)]" : "bg-[rgba(31,138,91,0.05)]")}><p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", rejected ? "text-[var(--color-ink-muted-3)]" : "text-[#1F8A5B]")}>{rejected ? "Keep mine instead" : "Editor's version"}</p><p className={cn("text-[14.5px] leading-[1.7]", rejected ? "text-[var(--color-ink-muted-3)]" : "text-[var(--color-ink)]")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "" }} /></div>
                      </>
                    )}
                    {!writerEdit && editingParaId !== u.id && u.kind === "added" && u.newHtml && (
                      <div className={cn("rounded-lg px-4 py-3", rejected ? "bg-[rgba(193,58,58,0.05)] line-through text-[var(--color-ink-muted-3)]" : "bg-[rgba(31,138,91,0.05)]")}><p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", rejected ? "text-[var(--color-ink-muted-3)]" : "text-[#1F8A5B]")}>{rejected ? "Dropping this" : "New paragraph"}</p><p className={cn("text-[14.5px] leading-[1.7]", rejected ? "text-[var(--color-ink-muted-3)]" : "text-[var(--color-ink)]")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml }} /></div>
                    )}
                    {!writerEdit && editingParaId !== u.id && u.kind === "removed" && (
                      <div className={cn("rounded-lg px-4 py-3", rejected ? "bg-[rgba(42,26,18,0.02)] text-[var(--color-ink)]" : "bg-[rgba(193,58,58,0.05)] text-[var(--color-ink-muted-3)] line-through")}><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">This will be removed</p><p data-para-id={u.id} className="text-[14.5px] leading-[1.7]" dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} /></div>
                    )}

                    {editingParaId !== u.id && (
                      <div className="mt-4">
                        {writerEdit ? <WriterEditBadge onRevert={() => revertWriterEdit(u.id)} /> : (
                          <DiffToggle accepted={!rejected} onAccept={() => setDecision(u.id, "accept")} onReject={() => setDecision(u.id, "reject")} acceptLabel={u.kind === "removed" ? "Remove" : u.kind === "added" ? "Keep" : "Accept"} rejectLabel={u.kind === "removed" ? "Keep" : u.kind === "added" ? "Drop" : "Keep mine"} />
                        )}
                      </div>
                    )}
                  </div>

                  {u.id && (u.comments.length > 0 || (writerNotes[u.id] ?? []).length > 0 || openNoteId === u.id) && (
                    <div className="flex flex-col gap-2 border-t border-[rgba(42,26,18,0.06)] bg-[rgba(199,93,44,0.02)] px-4 py-3">
                      {u.comments.map((c) => <InlineComment key={c.id} comment={c} state={commentFor(c.id)} onToggleResolved={() => setComment(c.id, { resolved: !commentFor(c.id).resolved })} onReplyChange={(v) => setComment(c.id, { reply: v })} />)}
                      <WriterNoteBlock isOpen={openNoteId === u.id} draft={noteDraft[u.id] ?? ""} notes={writerNotes[u.id] ?? []} onClose={() => setOpenNoteId(null)} onDraftChange={(v) => setNoteDraft((p) => ({ ...p, [u.id]: v }))} onAdd={() => addWriterNote(u.id)} onRemove={(idx) => removeWriterNote(u.id, idx)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!props.bodyChanged && props.comments.length > 0 && (
        <section className="mb-8"><h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Notes from your editor</h2><div className="rounded-2xl border border-[rgba(42,26,18,0.1)] bg-[rgba(199,93,44,0.02)] p-4">{props.comments.map((c) => <InlineComment key={c.id} comment={c} state={commentFor(c.id)} onToggleResolved={() => setComment(c.id, { resolved: !commentFor(c.id).resolved })} onReplyChange={(v) => setComment(c.id, { reply: v })} />)}</div></section>
      )}

      {error && <p className="mb-4 text-[13px] font-medium text-[#A13A3A]">{error}</p>}

      {goesToEditor && (
        <div className="mb-4"><label className="mb-1.5 block text-[13px] font-semibold text-[var(--color-ink)]">A note to your editor (optional)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Explain why you kept certain changes…" className="w-full resize-none rounded-xl border border-[rgba(42,26,18,0.14)] bg-white px-4 py-3 text-[14px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30" /></div>
      )}

      <div className="sticky bottom-0 -mx-[22px] border-t border-[rgba(42,26,18,0.08)] bg-[var(--color-bg)] px-[22px] py-4">
        <button type="button" disabled={busy} onClick={submit} className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-[14px] text-[15px] font-semibold text-white transition-all disabled:opacity-50", goesToEditor ? "bg-[#6C3BAA] active:bg-[#5a2f8f]" : "bg-[#1F8A5B] active:bg-[#1a7a50]")}>{busy ? "Submitting…" : goesToEditor ? <><ArrowRight size={16} /> Send my review to the editor</> : <><ArrowRight size={16} /> Accept all changes</>}</button>
        {goesToEditor ? (
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-[var(--color-ink-muted-2)]">{hasWriterEdits ? "You rewrote some of the text yourself — this goes back to your editor as tracked changes." : "You kept some of your own wording, replied, or left a note — this goes back to your editor for review."}</p>
        ) : (
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-[var(--color-ink-muted-2)]">{props.isPostContract ? "By accepting all changes, you agree that this version of your story is ready to publish." : "By accepting all changes, you agree that this version of your story will move forward to the publishing contract."}</p>
        )}
      </div>
    </div>
  );
}

function DiffToggle({ accepted, onAccept, onReject, acceptLabel, rejectLabel }: { accepted: boolean; onAccept: () => void; onReject: () => void; acceptLabel: string; rejectLabel: string }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onAccept} className={cn("flex-1 rounded-lg py-3 text-[13px] font-semibold transition-all active:scale-[0.98]", accepted ? "bg-[#1F8A5B] text-white shadow-[0_1px_3px_rgba(31,138,91,0.25)]" : "bg-[rgba(31,138,91,0.08)] text-[#1F8A5B] active:bg-[rgba(31,138,91,0.14)]")}>{accepted && <Check size={14} className="mr-1.5 hidden sm:inline-block align-middle" />}{acceptLabel}</button>
      <button type="button" onClick={onReject} className={cn("flex-1 rounded-lg py-3 text-[13px] font-semibold transition-all active:scale-[0.98]", !accepted ? "bg-[#6C3BAA] text-white shadow-[0_1px_3px_rgba(108,59,170,0.25)]" : "bg-[rgba(108,59,170,0.08)] text-[#6C3BAA] active:bg-[rgba(108,59,170,0.14)]")}>{rejectLabel}</button>
    </div>
  );
}

function InlineComment({ comment, state, onToggleResolved, onReplyChange }: { comment: EditorialComment; state: CommentState; onToggleResolved: () => void; onReplyChange: (v: string) => void }) {
  const fromWriter = comment.authorRole === "WRITER";
  return (
    <div className={cn("rounded-xl border p-3 transition-colors", state.resolved ? "border-[rgba(31,138,91,0.2)] bg-[rgba(31,138,91,0.04)]" : "border-[rgba(199,93,44,0.2)] bg-[rgba(199,93,44,0.04)]")}>
      <div className="flex items-start gap-2.5"><MessageSquare size={14} className={cn("mt-0.5 flex-none", state.resolved ? "text-[#1F8A5B]" : "text-[var(--color-primary)]")} /><div className="min-w-0 flex-1">{fromWriter && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Your earlier note</p>}<p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-ink)]">{comment.body}</p>{state.reply.trim() && <div className="mt-2 flex items-start gap-1.5 text-[12.5px] text-[var(--color-ink-muted)]"><CornerDownRight size={11} className="mt-0.5 flex-none" /><span className="whitespace-pre-wrap">{state.reply}</span></div>}</div></div>
      <div className="mt-2.5 flex items-center gap-3 pl-[26px]"><button type="button" onClick={onToggleResolved} className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors", state.resolved ? "bg-[rgba(31,138,91,0.1)] text-[#1F8A5B]" : "bg-[rgba(42,26,18,0.06)] text-[var(--color-ink-muted-2)] active:bg-[rgba(42,26,18,0.1)]")}><Check size={11} />{state.resolved ? "Resolved" : "Mark resolved"}</button>{!fromWriter && <input type="text" value={state.reply} onChange={(e) => onReplyChange(e.target.value)} placeholder="Reply to your editor…" className="min-w-0 flex-1 rounded-full border border-[rgba(42,26,18,0.12)] bg-white px-3 py-1 text-[12.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none" />}</div>
    </div>
  );
}

function WriterNoteBlock({ isOpen, draft, notes, onClose, onDraftChange, onAdd, onRemove }: { isOpen: boolean; draft: string; notes: string[]; onClose: () => void; onDraftChange: (v: string) => void; onAdd: () => void; onRemove: (index: number) => void }) {
  if (!isOpen && notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1.5">{notes.map((n, i) => (<li key={i} className="flex items-start gap-2 rounded-lg bg-[rgba(199,93,44,0.07)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--color-ink)]"><MessageSquare size={12} className="mt-0.5 flex-none text-[var(--color-primary)]" /><span className="min-w-0 flex-1 whitespace-pre-wrap">{n}</span><button type="button" onClick={() => onRemove(i)} className="flex-none text-[var(--color-ink-muted-3)] active:text-[#A13A3A]" aria-label="Remove note"><X size={12} /></button></li>))}</ul>
      )}
      {isOpen && (
        <div className="flex flex-col gap-2"><textarea value={draft} onChange={(e) => onDraftChange(e.target.value)} rows={2} autoFocus placeholder="Tell your editor what you think…" className="w-full resize-none rounded-lg border border-[rgba(42,26,18,0.14)] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-[11px] font-semibold text-[var(--color-ink-muted-2)] active:text-[var(--color-ink)]">Cancel</button><button type="button" onClick={onAdd} disabled={!draft.trim()} className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-[11px] font-semibold text-white transition-opacity disabled:opacity-40">Add note</button></div></div>
      )}
    </div>
  );
}

function ParagraphEditor({ html, textAlign, onSave, onCancel }: { html: string; textAlign?: "left" | "center" | "right"; onSave: (html: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Seeded once, deliberately: re-running this on every `html` change would
  // rewrite innerHTML mid-typing and throw the caret back to the end, which is
  // the classic controlled-contentEditable cursor jump.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const el = ref.current; if (!el) return; el.innerHTML = html; el.focus(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range); }, []);
  return (
    <div className="rounded-lg bg-[rgba(199,93,44,0.05)] p-3 ring-1 ring-[rgba(199,93,44,0.3)]">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-primary)]">Your rewrite</p>
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }} className="min-h-[3em] rounded-md bg-white px-3 py-2 text-[14.5px] leading-[1.7] text-[var(--color-ink)] outline-none ring-1 ring-[rgba(42,26,18,0.12)] focus:ring-[var(--color-primary)] [&_em]:italic [&_strong]:font-bold [&_s]:line-through [&_u]:underline" style={{ textAlign: textAlign ?? "left" }} />
      <div className="mt-2 flex items-center justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-full px-3 py-1 text-[11px] font-semibold text-[var(--color-ink-muted-2)] active:text-[var(--color-ink)]">Cancel</button><button type="button" onClick={() => onSave(ref.current?.innerHTML ?? "")} className="rounded-full bg-[#1F8A5B] px-3 py-1 text-[11px] font-semibold text-white">Save my wording</button></div>
    </div>
  );
}

function WriterEditBadge({ onRevert }: { onRevert: () => void }) {
  return (
    <div className="mt-1.5 flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-[rgba(31,138,91,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#1F8A5B]"><PencilLine size={10} /> Your edit</span><button type="button" onClick={onRevert} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-ink-muted-2)] active:text-[var(--color-ink)]"><Undo2 size={11} /> Undo my edit</button></div>
  );
}
