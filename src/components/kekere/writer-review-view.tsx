"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Check, PencilLine, CornerDownRight } from "lucide-react";
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

// A change unit the writer decides on, in reading order.
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

  // Build the ordered list of units the writer reviews: every edited paragraph
  // (unchanged/changed/added), with removed originals slotted after their
  // nearest surviving predecessor.
  const units = useMemo<Unit[]>(() => {
    const list: Unit[] = [];
    for (const p of editedParas) {
      const kind: ParaKind = !p.id || !origHtmlById.has(p.id) ? "added" : origHtmlById.get(p.id) !== p.html ? "changed" : "unchanged";
      list.push({ id: p.id, kind, newHtml: p.html, oldHtml: p.id ? origHtmlById.get(p.id) : undefined, textAlign: p.textAlign, comments: p.id ? commentsByPara[p.id] ?? [] : [] });
    }
    // Insert removed originals after their nearest earlier surviving paragraph.
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

  const anyRejected =
    changeUnits.some((u) => decisionFor(u.id) === "reject") || (props.hookLineChanged && false); // hook line handled separately below
  const rejectedHook = props.hookLineChanged && (decisions["__hook__"] ?? "accept") === "reject";
  const hasReply = Object.values(commentState).some((c) => c.reply.trim().length > 0);
  const goesToEditor = anyRejected || rejectedHook || hasReply;

  async function submit() {
    setBusy(true);
    setError(null);
    // Only paragraph decisions travel to the server (hook-line rejection is
    // folded into the note so the editor sees it — the merge is paragraph-level).
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
      <div className="px-[22px] pb-24 pt-24 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(31,138,91,0.12)] text-[var(--color-accent)]">
          <Check size={26} />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
          {done === "contract" ? "Edits accepted" : "Sent back to your editor"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-[var(--color-ink-muted-2)]">
          {done === "contract"
            ? "Taking you to your publishing contract — sign it and your story goes live."
            : "Your editor will reconcile your choices and get back to you. We'll let you know when there's an update."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-[22px] pb-[calc(150px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/kekere/feed" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(42,26,18,0.06)]" aria-label="Back">
          <ChevronLeft size={20} />
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">Review your edits</span>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">Your editor reviewed</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight text-[var(--color-ink)]">{props.title}</h1>
        <p className="mt-2 text-[13px] text-[var(--color-ink-muted-2)]">
          {changeUnits.length === 0 && !props.hookLineChanged
            ? "No text changes — just notes for you below. Reply or resolve, then send."
            : "Accept each change or keep your own wording. Reply to any note. Nothing is published until you're done."}
        </p>
      </div>

      {props.summaryNote && (
        <div className="mb-5 rounded-2xl border border-[rgba(199,93,44,0.25)] bg-[rgba(199,93,44,0.05)] p-4">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-primary)]"><PencilLine size={12} /> A note from your editor</p>
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-ink)]">{props.summaryNote}</p>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px]">
        <span className="text-[var(--color-ink-muted-2)]">If you accept everything, your story goes to contract at</span>
        <span className="font-semibold text-[var(--color-ink)]">{props.cowrieCost} cowrie{props.cowrieCost === 1 ? "" : "s"} · you keep {props.writerSharePercent}%</span>
      </div>

      {/* Hook line */}
      {props.hookLineChanged && (
        <section className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Hook line</h2>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className={cn("mb-1.5 text-[14px] italic leading-relaxed", rejectedHook ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted-3)] line-through")}>{props.originalHookLine || "— (none)"}</p>
            <p className={cn("border-l-2 pl-3 text-[15px] italic leading-relaxed", rejectedHook ? "border-[var(--color-ink-muted-3)] text-[var(--color-ink-muted-3)] line-through" : "border-[var(--color-primary)] text-[var(--color-ink)]")}>{props.editedHookLine}</p>
            <ChoiceToggle
              accepted={!rejectedHook}
              onAccept={() => setDecisions((p) => ({ ...p, __hook__: "accept" }))}
              onReject={() => setDecisions((p) => ({ ...p, __hook__: "reject" }))}
              acceptLabel="Use editor's"
              rejectLabel="Keep mine"
            />
          </div>
        </section>
      )}

      {/* Body */}
      <section className="mb-6">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
          {props.bodyChanged ? "Proposed text" : "Your story"}
        </h2>
        <div className="story-reader-prose rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[15px] leading-[1.75] text-[var(--color-ink)] [&_em]:italic [&_strong]:font-bold [&_u]:underline">
          {units.map((u, i) => {
            const rejected = decisionFor(u.id) === "reject";
            const highlight = u.kind !== "unchanged";
            return (
              <div key={u.id || i} className={highlight ? "-mx-2 mb-2 rounded-[10px] px-2 py-2" : ""} style={highlight ? { background: "rgba(199,93,44,0.05)" } : undefined}>
                {/* changed: show old struck + new (or, if kept-mine, original wins) */}
                {u.kind === "changed" && (
                  <>
                    <p className={cn("mb-1 text-[13.5px] leading-relaxed", rejected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted-3)] line-through")} dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} />
                    <div className="flex items-start gap-2">
                      <span className="mt-1 flex-none rounded-full bg-[rgba(199,93,44,0.14)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-primary)]">Edited</span>
                      <p className={cn("mb-1 min-w-0 flex-1", rejected && "text-[var(--color-ink-muted-3)] line-through")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "<br/>" }} />
                    </div>
                  </>
                )}
                {u.kind === "added" && (
                  <div className="flex items-start gap-2">
                    <span className="mt-1 flex-none rounded-full bg-[rgba(199,93,44,0.14)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-primary)]">New</span>
                    <p className={cn("mb-1 min-w-0 flex-1", rejected && "text-[var(--color-ink-muted-3)] line-through")} style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "<br/>" }} />
                  </div>
                )}
                {u.kind === "removed" && (
                  <div className="flex items-start gap-2">
                    <span className="mt-1 flex-none rounded-full bg-[rgba(20,22,26,0.1)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-ink-muted-2)]">Removed</span>
                    <p className={cn("mb-1 min-w-0 flex-1", !rejected && "text-[var(--color-ink-muted-3)] line-through")} dangerouslySetInnerHTML={{ __html: u.oldHtml || "" }} />
                  </div>
                )}
                {u.kind === "unchanged" && (
                  <p className="mb-[1em]" style={{ textAlign: u.textAlign ?? "left" }} dangerouslySetInnerHTML={{ __html: u.newHtml || "<br/>" }} />
                )}

                {u.kind !== "unchanged" && (
                  <ChoiceToggle
                    accepted={!rejected}
                    onAccept={() => setDecision(u.id, "accept")}
                    onReject={() => setDecision(u.id, "reject")}
                    acceptLabel={u.kind === "removed" ? "Remove it" : u.kind === "added" ? "Keep it" : "Use editor's"}
                    rejectLabel={u.kind === "removed" ? "Keep it" : u.kind === "added" ? "Drop it" : "Keep mine"}
                  />
                )}

                {u.comments.map((c) => {
                  const cs = commentFor(c.id);
                  return (
                    <div key={c.id} className="mt-2 rounded-[10px] border border-[rgba(199,93,44,0.2)] bg-[rgba(199,93,44,0.04)] px-3 py-2">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={13} className="mt-0.5 flex-none text-[var(--color-primary)]" />
                        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-ink)]">{c.body}</p>
                      </div>
                      {cs.reply.trim() && (
                        <div className="mt-1.5 flex items-start gap-1.5 pl-[21px] text-[12.5px] text-[var(--color-ink-muted-2)]">
                          <CornerDownRight size={12} className="mt-0.5 flex-none" />
                          <span className="whitespace-pre-wrap">{cs.reply}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3 pl-[21px]">
                        <button type="button" onClick={() => setComment(c.id, { resolved: !cs.resolved })} className={cn("flex items-center gap-1 text-[11px] font-semibold", cs.resolved ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted-2)] hover:text-[var(--color-ink)]")}>
                          <Check size={12} /> {cs.resolved ? "Resolved" : "Mark resolved"}
                        </button>
                        <ReplyField value={cs.reply} onChange={(v) => setComment(c.id, { reply: v })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="mb-3 text-[13px] font-medium text-[#A13A3A]">{error}</p>}

      {goesToEditor && (
        <div className="mb-3">
          <label className="mb-1.5 block text-[12px] font-semibold text-[var(--color-ink)]">Anything to tell your editor? (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Explain the choices you kept…"
            className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-3 py-2.5 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className={cn("w-full rounded-[12px] py-[15px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-50", goesToEditor ? "bg-[var(--color-ink)]" : "bg-[var(--color-primary)]")}
      >
        {busy ? "Submitting…" : goesToEditor ? "Send my review to the editor" : "Accept edits & continue to contract"}
      </button>
      {goesToEditor && (
        <p className="mt-2 text-center text-[11.5px] text-[var(--color-ink-muted-2)]">
          You kept some of your own wording or left a reply, so this goes back to your editor to reconcile — not straight to contract.
        </p>
      )}
    </div>
  );
}

function ChoiceToggle({ accepted, onAccept, onReject, acceptLabel, rejectLabel }: { accepted: boolean; onAccept: () => void; onReject: () => void; acceptLabel: string; rejectLabel: string }) {
  return (
    <div className="mt-2 inline-flex overflow-hidden rounded-[8px] border border-[var(--color-border)] text-[11.5px] font-semibold">
      <button type="button" onClick={onAccept} className={cn("px-3 py-1.5 transition-colors", accepted ? "bg-[var(--color-primary)] text-white" : "bg-transparent text-[var(--color-ink-muted-2)] hover:bg-[rgba(42,26,18,0.04)]")}>{acceptLabel}</button>
      <button type="button" onClick={onReject} className={cn("px-3 py-1.5 transition-colors", !accepted ? "bg-[var(--color-ink)] text-white" : "bg-transparent text-[var(--color-ink-muted-2)] hover:bg-[rgba(42,26,18,0.04)]")}>{rejectLabel}</button>
    </div>
  );
}

function ReplyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open && !value) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-semibold text-[var(--color-ink-muted-2)] hover:text-[var(--color-ink)]">
        Reply
      </button>
    );
  }
  return (
    <input
      type="text"
      value={value}
      autoFocus={open}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Reply to your editor…"
      className="min-w-0 flex-1 rounded-[7px] border border-[rgba(42,26,18,0.16)] bg-white px-2.5 py-1.5 text-[12.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none"
    />
  );
}
