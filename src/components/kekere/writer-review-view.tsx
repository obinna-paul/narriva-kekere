"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Check, PencilLine, CornerDownRight, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { docParagraphsToHtml, type TiptapDoc } from "@/lib/tiptap/doc-utils";

interface EditorialComment {
  id: string;
  paragraphId: string;
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
}

type ParaKind = "unchanged" | "changed" | "added" | "removed";
type Decision = "accept" | "reject";
interface CommentState { resolved: boolean; reply: string }

interface Unit {
  id: string;
  kind: ParaKind;
  newHtml?: string;
  oldHtml?: string;
  textAlign?: "left" | "center" | "right";
  comments: EditorialComment[];
}

export function WriterReviewView(props: WriterReviewProps) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [commentState, setCommentState] = useState<Record<string, CommentState>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "contract" | "returned">(null);

  const editedParas = useMemo(() => docParagraphsToHtml(props.editedBody), [props.editedBody]);
  const originalParas = useMemo(() => docParagraphsToHtml(props.originalBody), [props.originalBody]);
  const origHtmlById = useMemo(() => new Map(originalParas.map((p) => [p.id, p.html])), [originalParas]);
  const editedIds = useMemo(() => new Set(editedParas.map((p) => p.id)), [editedParas]);
  const commentsByPara = useMemo(() => {
    const m: Record<string, EditorialComment[]> = {};
    for (const c of props.comments) (m[c.paragraphId] ??= []).push(c);
    return m;
  }, [props.comments]);

  const units = useMemo<Unit[]>(() => {
    const list: Unit[] = [];
    for (const p of editedParas) {
      const kind: ParaKind = !p.id || !origHtmlById.has(p.id) ? "added" : origHtmlById.get(p.id) !== p.html ? "changed" : "unchanged";
      list.push({ id: p.id, kind, newHtml: p.html, oldHtml: p.id ? origHtmlById.get(p.id) : undefined, textAlign: p.textAlign, comments: p.id ? commentsByPara[p.id] ?? [] : [] });
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
  }, [editedParas, originalParas, origHtmlById, editedIds, commentsByPara]);

  const changeUnits = units.filter((u) => u.kind !== "unchanged");

  const decisionFor = (id: string): Decision => decisions[id] ?? "accept";
  const setDecision = (id: string, d: Decision) => setDecisions((prev) => ({ ...prev, [id]: d }));
  const commentFor = (id: string): CommentState => commentState[id] ?? { resolved: false, reply: "" };
  const setComment = (id: string, patch: Partial<CommentState>) =>
    setCommentState((prev) => ({ ...prev, [id]: { ...commentFor(id), ...patch } }));

  const anyRejected = changeUnits.some((u) => decisionFor(u.id) === "reject");
  const rejectedHook = props.hookLineChanged && (decisions["__hook__"] ?? "accept") === "reject";
  const hasReply = Object.values(commentState).some((c) => c.reply.trim().length > 0);
  const goesToEditor = anyRejected || rejectedHook || hasReply;

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
    const fullNote = rejectedHook
      ? `${note.trim() ? note.trim() + "\n\n" : ""}I'd like to keep my original hook line: "${props.originalHookLine}"`
      : note.trim();

    try {
      const res = await fetch(`/api/kekere/stories/${props.storyId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: paraDecisions, commentDecisions, note: fullNote || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      const data = await res.json();
      setDone(data.outcome === "contract" ? "contract" : "returned");
      setTimeout(() => router.push(data.outcome === "contract" ? "/kekere/contracts" : "/kekere/feed"), 1500);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[560px] px-[22px] pb-24 pt-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]">
          <Check size={28} />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
          {done === "contract" ? "Edits accepted" : "Sent back to your editor"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
          {done === "contract"
            ? "Taking you to your publishing contract — sign it and your story enters the publishing queue."
            : "Your editor will review your feedback and get back to you. We'll notify you when there's an update."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-[22px] pb-[calc(120px+env(safe-area-inset-bottom))] pt-6">
      {/* Top navigation */}
      <Link href="/kekere/feed" className="mb-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(42,26,18,0.06)]" aria-label="Back">
        <ChevronLeft size={20} />
      </Link>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]">Editorial review</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight tracking-[-0.2px] text-[var(--color-ink)]">{props.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-ink-muted-2)]">
          <span>{totalChanges} change{totalChanges === 1 ? "" : "s"} to review</span>
          <span className="text-[var(--color-ink-muted-3)]">·</span>
          <span>{acceptedCount} accepted</span>
        </div>
      </div>

      {/* Editor's cover note */}
      {props.summaryNote && (
        <div className="mb-6 rounded-2xl border border-[rgba(199,93,44,0.2)] bg-gradient-to-br from-[rgba(199,93,44,0.05)] to-[rgba(199,93,44,0.02)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(199,93,44,0.12)]">
              <PencilLine size={13} className="text-[var(--color-primary)]" />
            </span>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-primary)]">A note from your editor</p>
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-[1.65] text-[var(--color-ink)]">{props.summaryNote}</p>
        </div>
      )}

      {/* Progress — only show when there are changes to review */}
      {totalChanges > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-[var(--color-ink)]">{acceptedCount} of {totalChanges} accepted</span>
            <span className="text-[var(--color-ink-muted-2)]">{Math.round((acceptedCount / totalChanges) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full bg-[rgba(42,26,18,0.08)]">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${(acceptedCount / totalChanges) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Hook line diff */}
      {props.hookLineChanged && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Hook line</h2>
          <div className="overflow-hidden rounded-2xl border border-[rgba(42,26,18,0.1)]">
            {/* Original */}
            <div className={cn("px-5 py-4", rejectedHook ? "bg-[rgba(42,26,18,0.02)]" : "bg-[rgba(193,58,58,0.04)]")}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Your original</p>
              <p className={cn("font-[family-name:var(--font-display)] text-[16px] italic leading-relaxed", rejectedHook ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted-3)] line-through")}>
                {props.originalHookLine || "—"}
              </p>
            </div>
            <div className="h-px bg-[rgba(42,26,18,0.08)]" />
            {/* Edited */}
            <div className={cn("px-5 py-4 border-l-[3px]", rejectedHook ? "border-[var(--color-primary)]" : "border-[#1F8A5B]")}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Editor's proposed</p>
              <p className={cn("font-[family-name:var(--font-display)] text-[16px] italic leading-relaxed", rejectedHook ? "line-through text-[var(--color-ink-muted-3)]" : "text-[var(--color-ink)]")}>
                {props.editedHookLine || "—"}
              </p>
            </div>
          </div>
          <div className="mt-3" />
          <DiffToggle
            accepted={!rejectedHook}
            onAccept={() => setDecisions((p) => ({ ...p, __hook__: "accept" }))}
            onReject={() => setDecisions((p) => ({ ...p, __hook__: "reject" }))}
            acceptLabel="Use editor's hook line"
            rejectLabel="Keep my original"
          />
        </section>
      )}

      {/* Body diff */}
      {props.bodyChanged && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Story text</h2>
          <div className="flex flex-col gap-4">
            {units.map((u, i) => {
              if (u.kind === "unchanged") {
                return (
                  <p key={u.id || i} className="px-1 text-[15px] leading-[1.75] text-[var(--color-ink)]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "" }} />
                );
              }

              const rejected = decisionFor(u.id) === "reject";

              return (
                <div key={u.id || i} className="relative overflow-hidden rounded-xl border border-[rgba(42,26,18,0.1)]">
                  {/* Kind badge */}
                  <div className="flex items-center justify-between border-b border-[rgba(42,26,18,0.06)] bg-[rgba(42,26,18,0.02)] px-4 py-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]",
                      u.kind === "added" ? "bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]" :
                      u.kind === "removed" ? "bg-[rgba(193,58,58,0.1)] text-[#A13A3A]" :
                      "bg-[rgba(199,93,44,0.12)] text-[var(--color-primary)]",
                    )}>
                      <AlertCircle size={10} />
                      {u.kind === "added" ? "New paragraph" : u.kind === "removed" ? "Removed" : "Edited"}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Change {i + 1} of {changeUnits.length}</span>
                  </div>

                  <div className="p-4">
                    {/* Old text */}
                    {u.kind !== "added" && u.oldHtml && (
                      <div className={cn("rounded-lg px-4 py-3 mb-3", rejected ? "bg-[rgba(42,26,18,0.03)]" : "bg-[rgba(193,58,58,0.05)]")}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Original</p>
                        <p className={cn("text-[14.5px] leading-[1.7]", rejected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted-3)] line-through")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.oldHtml }} />
                      </div>
                    )}

                    {/* New text */}
                    {u.kind !== "removed" && u.newHtml && (
                      <div className={cn("rounded-lg px-4 py-3", rejected ? "bg-[rgba(193,58,58,0.05)] line-through text-[var(--color-ink-muted-3)]" : "bg-[rgba(31,138,91,0.05)]")}>
                        <p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-[0.06em]", rejected ? "text-[var(--color-ink-muted-3)]" : "text-[#1F8A5B]")}>
                          {rejected ? "Keep mine instead" : "Editor's version"}
                        </p>
                        <p className={cn("text-[14.5px] leading-[1.7]", rejected ? "text-[var(--color-ink-muted-3)]" : "text-[var(--color-ink)]")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml }} />
                      </div>
                    )}

                    {/* Removed-only: show old text with remove option */}
                    {u.kind === "removed" && (
                      <div className={cn("rounded-lg px-4 py-3", rejected ? "bg-[rgba(42,26,18,0.02)] text-[var(--color-ink)]" : "bg-[rgba(193,58,58,0.05)] text-[var(--color-ink-muted-3)] line-through")}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">This will be removed</p>
                        <p className="text-[14.5px] leading-[1.7]" dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} />
                      </div>
                    )}

                    {/* Decision toggle */}
                    <div className="mt-4">
                      <DiffToggle
                        accepted={!rejected}
                        onAccept={() => setDecision(u.id, "accept")}
                        onReject={() => setDecision(u.id, "reject")}
                        acceptLabel={u.kind === "removed" ? "Remove this paragraph" : u.kind === "added" ? "Keep this paragraph" : "Use editor's version"}
                        rejectLabel={u.kind === "removed" ? "Keep this paragraph" : u.kind === "added" ? "Drop this paragraph" : "Keep my original"}
                      />
                    </div>
                  </div>

                  {/* Inline comments */}
                  {u.comments.length > 0 && (
                    <div className="border-t border-[rgba(42,26,18,0.06)] bg-[rgba(199,93,44,0.02)] px-4 py-3">
                      {u.comments.map((c) => (
                        <InlineComment
                          key={c.id}
                          comment={c}
                          state={commentFor(c.id)}
                          onToggleResolved={() => setComment(c.id, { resolved: !commentFor(c.id).resolved })}
                          onReplyChange={(v) => setComment(c.id, { reply: v })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Comments-only message */}
      {!props.bodyChanged && props.comments.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Notes from your editor</h2>
          <div className="rounded-2xl border border-[rgba(42,26,18,0.1)] bg-[rgba(199,93,44,0.02)] p-4">
            {props.comments.map((c) => (
              <InlineComment
                key={c.id}
                comment={c}
                state={commentFor(c.id)}
                onToggleResolved={() => setComment(c.id, { resolved: !commentFor(c.id).resolved })}
                onReplyChange={(v) => setComment(c.id, { reply: v })}
              />
            ))}
          </div>
        </section>
      )}

      {error && <p className="mb-4 text-[13px] font-medium text-[#A13A3A]">{error}</p>}

      {/* Writer note — only shown when sending back */}
      {goesToEditor && (
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-semibold text-[var(--color-ink)]">A note to your editor (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Explain why you kept certain changes…"
            className="w-full resize-none rounded-xl border border-[rgba(42,26,18,0.14)] bg-white px-4 py-3 text-[14px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30"
          />
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-0 -mx-[22px] border-t border-[rgba(42,26,18,0.08)] bg-[var(--color-bg)] px-[22px] py-4">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-[14px] text-[15px] font-semibold text-white transition-all disabled:opacity-50",
            goesToEditor ? "bg-[#6C3BAA] hover:bg-[#5a2f8f]" : "bg-[#1F8A5B] hover:bg-[#1a7a50]",
          )}
        >
          {busy ? (
            "Submitting…"
          ) : goesToEditor ? (
            <>Send my review to the editor <ArrowRight size={16} /></>
          ) : (
            <>Accept all changes <ArrowRight size={16} /></>
          )}
        </button>
        {goesToEditor ? (
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-[var(--color-ink-muted-2)]">
            You kept some of your own wording or left a reply, so this goes back to your editor for review.
          </p>
        ) : (
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-[var(--color-ink-muted-2)]">
            By accepting all changes, you agree that this version of your story will move forward to the publishing contract.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiffToggle — prominent binary accept/reject control
// ---------------------------------------------------------------------------
function DiffToggle({ accepted, onAccept, onReject, acceptLabel, rejectLabel }: {
  accepted: boolean;
  onAccept: () => void;
  onReject: () => void;
  acceptLabel: string;
  rejectLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onAccept}
        className={cn(
          "flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-all",
          accepted
            ? "bg-[#1F8A5B] text-white shadow-[0_1px_3px_rgba(31,138,91,0.25)]"
            : "bg-[rgba(31,138,91,0.08)] text-[#1F8A5B] hover:bg-[rgba(31,138,91,0.14)]",
        )}
      >
        {accepted && <Check size={14} className="mr-1.5 inline-block align-middle" />}
        {acceptLabel}
      </button>
      <button
        type="button"
        onClick={onReject}
        className={cn(
          "flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-all",
          !accepted
            ? "bg-[#6C3BAA] text-white shadow-[0_1px_3px_rgba(108,59,170,0.25)]"
            : "bg-[rgba(108,59,170,0.08)] text-[#6C3BAA] hover:bg-[rgba(108,59,170,0.14)]",
        )}
      >
        {rejectLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineComment — editor note with reply and resolve toggle
// ---------------------------------------------------------------------------
function InlineComment({ comment, state, onToggleResolved, onReplyChange }: {
  comment: EditorialComment;
  state: CommentState;
  onToggleResolved: () => void;
  onReplyChange: (v: string) => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 transition-colors",
      state.resolved
        ? "border-[rgba(31,138,91,0.2)] bg-[rgba(31,138,91,0.04)]"
        : "border-[rgba(199,93,44,0.2)] bg-[rgba(199,93,44,0.04)]",
    )}>
      <div className="flex items-start gap-2.5">
        <MessageSquare size={14} className={cn("mt-0.5 flex-none", state.resolved ? "text-[#1F8A5B]" : "text-[var(--color-primary)]")} />
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-ink)]">{comment.body}</p>
          {state.reply.trim() && (
            <div className="mt-2 flex items-start gap-1.5 text-[12.5px] text-[var(--color-ink-muted)]">
              <CornerDownRight size={11} className="mt-0.5 flex-none" />
              <span className="whitespace-pre-wrap">{state.reply}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3 pl-[26px]">
        <button
          type="button"
          onClick={onToggleResolved}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
            state.resolved
              ? "bg-[rgba(31,138,91,0.1)] text-[#1F8A5B]"
              : "bg-[rgba(42,26,18,0.06)] text-[var(--color-ink-muted-2)] hover:bg-[rgba(42,26,18,0.1)] hover:text-[var(--color-ink)]",
          )}
        >
          <Check size={11} /> {state.resolved ? "Resolved" : "Mark resolved"}
        </button>
        <input
          type="text"
          value={state.reply}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder="Reply to your editor…"
          className="min-w-0 flex-1 rounded-full border border-[rgba(42,26,18,0.12)] bg-white px-3 py-1 text-[12.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>
    </div>
  );
}
