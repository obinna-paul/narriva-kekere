"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Check, PencilLine } from "lucide-react";
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

type ParaKind = "unchanged" | "changed" | "added";

export function WriterReviewView(props: WriterReviewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "accepting" | "requesting">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "accepted" | "requested">(null);

  const editedParas = useMemo(() => docParagraphsToHtml(props.editedBody), [props.editedBody]);
  const originalParas = useMemo(() => docParagraphsToHtml(props.originalBody), [props.originalBody]);
  const origHtmlById = useMemo(() => new Map(originalParas.map((p) => [p.id, p.html])), [originalParas]);
  const editedIds = useMemo(() => new Set(editedParas.map((p) => p.id)), [editedParas]);

  const commentsByPara = useMemo(() => {
    const map: Record<string, EditorialComment[]> = {};
    for (const c of props.comments) (map[c.paragraphId] ??= []).push(c);
    return map;
  }, [props.comments]);

  const removedParas = useMemo(
    () => originalParas.filter((p) => p.id && !editedIds.has(p.id) && p.html.trim().length > 0),
    [originalParas, editedIds],
  );

  const changeCount =
    editedParas.filter((p) => !p.id || !origHtmlById.has(p.id) || origHtmlById.get(p.id) !== p.html).length +
    removedParas.length +
    (props.hookLineChanged ? 1 : 0);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/kekere/stories/${props.storyId}/accept-edits`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      setDone("accepted");
      setTimeout(() => router.push("/kekere/contracts"), 1400);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  async function requestChanges() {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/kekere/stories/${props.storyId}/request-edit-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      setDone("requested");
      setTimeout(() => router.push("/kekere/feed"), 1800);
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
          {done === "accepted" ? "Edits accepted" : "Sent back to your editor"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-[var(--color-ink-muted-2)]">
          {done === "accepted"
            ? "Taking you to your publishing contract — sign it and your story goes live."
            : "Your editor will take another look. We'll let you know when there's an update."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-[22px] pb-[calc(120px+env(safe-area-inset-bottom))] pt-[18px]">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/kekere/feed"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted-2)] transition-colors hover:bg-[rgba(42,26,18,0.06)]"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          Review your edits
        </span>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">Your editor reviewed</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight text-[var(--color-ink)]">
          {props.title}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--color-ink-muted-2)]">
          {changeCount === 0
            ? "No text changes — just notes for you below."
            : `${changeCount} change${changeCount === 1 ? "" : "s"} proposed. Nothing is published until you accept.`}
        </p>
      </div>

      {props.summaryNote && (
        <div className="mb-5 rounded-2xl border border-[rgba(199,93,44,0.25)] bg-[rgba(199,93,44,0.05)] p-4">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-primary)]">
            <PencilLine size={12} /> A note from your editor
          </p>
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-ink)]">{props.summaryNote}</p>
        </div>
      )}

      {/* Terms reminder */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px]">
        <span className="text-[var(--color-ink-muted-2)]">If you accept, your story goes to contract at</span>
        <span className="font-semibold text-[var(--color-ink)]">
          {props.cowrieCost} cowrie{props.cowrieCost === 1 ? "" : "s"} · you keep {props.writerSharePercent}%
        </span>
      </div>

      {/* Hook line diff */}
      {props.hookLineChanged && (
        <section className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">Hook line</h2>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="mb-1.5 text-[14px] italic leading-relaxed text-[var(--color-ink-muted-3)] line-through">
              {props.originalHookLine || "— (none)"}
            </p>
            <p className="border-l-2 border-[var(--color-primary)] pl-3 text-[15px] italic leading-relaxed text-[var(--color-ink)]">
              {props.editedHookLine}
            </p>
          </div>
        </section>
      )}

      {/* Body diff */}
      <section className="mb-8">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
          {props.bodyChanged ? "Proposed text" : "Your story"}
        </h2>
        <div className="story-reader-prose rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[15px] leading-[1.75] text-[var(--color-ink)] [&_em]:italic [&_strong]:font-bold [&_u]:underline">
          {editedParas.map((p, i) => {
            const kind: ParaKind =
              !p.id || !origHtmlById.has(p.id) ? "added" : origHtmlById.get(p.id) !== p.html ? "changed" : "unchanged";
            const paraComments = p.id ? commentsByPara[p.id] ?? [] : [];
            return (
              <div key={p.id || i} className={kind !== "unchanged" ? "-mx-2 mb-2 rounded-[10px] px-2 py-1" : ""}
                style={kind !== "unchanged" ? { background: "rgba(199,93,44,0.05)" } : undefined}>
                {kind === "changed" && (
                  <p
                    className="mb-1 text-[13.5px] leading-relaxed text-[var(--color-ink-muted-3)] line-through"
                    dangerouslySetInnerHTML={{ __html: origHtmlById.get(p.id) || "" }}
                  />
                )}
                <div className="flex items-start gap-2">
                  {kind !== "unchanged" && (
                    <span className="mt-1 flex-none rounded-full bg-[rgba(199,93,44,0.14)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-primary)]">
                      {kind === "added" ? "New" : "Edited"}
                    </span>
                  )}
                  <p
                    className="mb-[1em] min-w-0 flex-1"
                    style={{ textAlign: p.textAlign ?? "left" }}
                    dangerouslySetInnerHTML={{ __html: p.html || "<br/>" }}
                  />
                </div>
                {paraComments.map((c) => (
                  <div key={c.id} className="mb-2 ml-1 flex items-start gap-2 rounded-[10px] border border-[rgba(199,93,44,0.2)] bg-[rgba(199,93,44,0.04)] px-3 py-2">
                    <MessageSquare size={13} className="mt-0.5 flex-none text-[var(--color-primary)]" />
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-ink)]">{c.body}</p>
                  </div>
                ))}
              </div>
            );
          })}

          {removedParas.length > 0 && (
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted-3)]">Removed</p>
              {removedParas.map((p) => (
                <p key={p.id} className="mb-2 text-[13.5px] leading-relaxed text-[var(--color-ink-muted-3)] line-through" dangerouslySetInnerHTML={{ __html: p.html }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {error && <p className="mb-3 text-[13px] font-medium text-[#A13A3A]">{error}</p>}

      {/* Actions */}
      {mode === "requesting" ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <label className="mb-1.5 block text-[12px] font-semibold text-[var(--color-ink)]">
            What would you like changed?
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Tell your editor what isn't right…"
            className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-3 py-2.5 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted-3)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!note.trim() || busy}
              onClick={requestChanges}
              className="flex-1 rounded-[10px] bg-[var(--color-primary)] py-3 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send back to editor"}
            </button>
            <button
              type="button"
              onClick={() => { setMode(null); setNote(""); }}
              className="rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-[14px] font-semibold text-[var(--color-ink-muted-2)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="w-full rounded-[12px] bg-[var(--color-primary)] py-[15px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {busy ? "Accepting…" : "Accept edits & continue to contract"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("requesting")}
            className="w-full rounded-[12px] border border-[var(--color-border)] bg-transparent py-[14px] text-[14px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[rgba(42,26,18,0.04)]"
          >
            Request changes instead
          </button>
        </div>
      )}
    </div>
  );
}
