"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState } from "@/components/admin/admin-skeleton";
import { TagPicker } from "@/components/admin/TagPicker";

interface QueueStory {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  tier: string;
  wordCount: number;
  cowrieCost: number;
  submittedAt: string;
  moderationNotes: string | null;
  plagiarismFlagged: boolean;
}

interface StoryDetail extends QueueStory {
  hookLine: string;
  body: string | object;
  readingTime: number;
}

const TIER_COLORS: Record<string, string> = {
  STANDARD: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
  FEATURED: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  PREMIUM: "bg-[rgba(107,33,168,0.12)] text-[#6B21A8]",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function bodyToText(body: string | object | null): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  try {
    const doc = body as { content?: Array<{ content?: Array<{ text?: string }> }> };
    return (doc.content ?? [])
      .flatMap((node) => (node.content ?? []).map((c) => c.text ?? "").join(""))
      .join("\n\n");
  } catch {
    return JSON.stringify(body);
  }
}

function DecisionPanel({
  story,
  onAction,
  acting,
}: {
  story: QueueStory;
  onAction: (action: "publish" | "reject" | "revisions", note: string, cowrieCost: number, tagIds: string[]) => void;
  acting: boolean;
}) {
  const [tab, setTab] = useState<"publish" | "reject" | "revisions">("publish");
  const [note, setNote] = useState("");
  const [cowrieCost, setCowrieCost] = useState(Math.max(1, Math.min(10, story.cowrieCost || 3)));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const tagError = tab === "publish" && tagIds.length === 0;

  return (
    <div className="flex flex-col gap-4 rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
      <div className="text-[13px] font-semibold text-[#1A1C20]">Decision</div>

      {story.plagiarismFlagged && (
        <div className="rounded-[8px] border border-[#C0392B]/25 bg-[rgba(192,57,43,0.06)] px-4 py-3">
          <p className="text-[12px] font-semibold text-[#C0392B]">⚠ Plagiarism flag</p>
          <p className="mt-0.5 text-[11px] text-[#C0392B]/80">This story was flagged for potential plagiarism. Review carefully before publishing.</p>
        </div>
      )}

      <div className="flex gap-1 rounded-[8px] bg-[rgba(20,22,26,0.06)] p-[3px]">
        {(["publish", "revisions", "reject"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-[6px] py-2 text-[12px] font-semibold capitalize transition-colors",
              tab === t
                ? t === "publish" ? "bg-[#1F8A5B] text-white" : t === "reject" ? "bg-[#C0392B] text-white" : "bg-[#B7791F] text-white"
                : "text-[#8B919A] hover:text-[#1A1C20]"
            )}
          >
            {t === "revisions" ? "Revisions" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "publish" && (
        <>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
              Cowrie cost (1–10)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={cowrieCost}
                onChange={(e) => setCowrieCost(Number(e.target.value))}
                className="flex-1 accent-[#C75D2C]"
              />
              <span className="w-8 text-center text-[14px] font-bold text-[#1A1C20]">{cowrieCost}</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
              Tags <span className="normal-case text-[#C0392B]">(required)</span>
            </label>
            <TagPicker value={tagIds} onChange={setTagIds} error={tagError} />
            {tagError && (
              <p className="mt-1 text-[10px] text-[#C0392B]">Select at least one tag before publishing.</p>
            )}
          </div>
        </>
      )}

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
          {tab === "publish" ? "Editor note (optional)" : tab === "reject" ? "Rejection reason (required)" : "Revision instructions (required)"}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={
            tab === "publish"
              ? "Optional note to the author on publication…"
              : tab === "reject"
              ? "Explain why this story is being rejected…"
              : "Describe what changes are needed…"
          }
          className="w-full resize-none rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
        />
      </div>

      <div className="space-y-2 border-t border-[rgba(20,22,26,0.07)] pt-4">
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Genre</span>
          <span className="font-medium text-[#1A1C20]">{story.genre}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Tier</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", TIER_COLORS[story.tier] ?? TIER_COLORS.STANDARD)}>{story.tier}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Cost</span>
          <span className="font-mono font-medium text-[#1A1C20]">{story.cowrieCost} ₵</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Words</span>
          <span className="font-medium text-[#1A1C20]">{story.wordCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Submitted</span>
          <span className="font-medium text-[#1A1C20]">{relativeTime(story.submittedAt)}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={acting || (tab !== "publish" && !note.trim()) || (tab === "publish" && tagIds.length === 0)}
        onClick={() => onAction(tab, note, cowrieCost, tagIds)}
        className={cn(
          "w-full rounded-[8px] py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40",
          tab === "publish" ? "bg-[#1F8A5B] hover:bg-[#1a7a50]" : tab === "reject" ? "bg-[#C0392B] hover:bg-[#a93226]" : "bg-[#B7791F] hover:bg-[#9c6719]"
        )}
      >
        {acting ? "Processing…" : tab === "publish" ? "Publish story" : tab === "reject" ? "Reject story" : "Request revisions"}
      </button>
    </div>
  );
}

export function StoryReviewQueue() {
  const [queue, setQueue] = useState<QueueStory[]>([]);
  const [selected, setSelected] = useState<StoryDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kekere/stories/queue");
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setQueue(d.stories ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function selectStory(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/kekere/stories/${id}/review`);
      if (!res.ok) throw new Error(`${res.status}`);
      setSelected(await res.json());
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAction(action: "publish" | "reject" | "revisions", note: string, cowrieCost: number, tagIds: string[]) {
    if (!selectedId || !selected) return;
    setActing(true);
    const endpoint =
      action === "publish" ? `/api/admin/kekere/stories/${selectedId}/publish`
      : action === "reject" ? `/api/admin/kekere/stories/${selectedId}/reject`
      : `/api/admin/kekere/stories/${selectedId}/request-revisions`;

    const body =
      action === "publish"
        ? { cowrieCost, tier: selected.tier, noteToWriter: note || undefined, tagIds }
        : action === "reject"
        ? { moderationNotes: note, internalReason: note, plagiarismFlagged: selected.plagiarismFlagged }
        : { moderationNotes: note };

    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Action failed");
      setToast({ type: "ok", msg: action === "publish" ? "Story published." : action === "reject" ? "Story rejected." : "Revision request sent." });
      setQueue((q) => q.filter((s) => s.id !== selectedId));
      setSelected(null);
      setSelectedId(null);
    } catch {
      setToast({ type: "err", msg: "Something went wrong. Try again." });
    } finally {
      setActing(false);
      setTimeout(() => setToast(null), 3500);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4">
        <div className="w-[280px] flex-none space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[90px] animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" />
          ))}
        </div>
        <div className="flex-1 animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" style={{ minHeight: 400 }} />
        <div className="w-[260px] flex-none animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" style={{ minHeight: 400 }} />
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={loadQueue} />;

  return (
    <div className="relative flex h-[calc(100vh-130px)] gap-4">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "absolute left-1/2 top-[-10px] z-50 -translate-x-1/2 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg",
          toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]"
        )}>
          {toast.msg}
        </div>
      )}

      {/* Left pane — queue list */}
      <div className="flex w-[280px] flex-none flex-col gap-2 overflow-y-auto">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#8B919A]">QUEUE</span>
          <span className="rounded-full bg-[#C75D2C] px-2 py-0.5 text-[10px] font-bold text-white">{queue.length}</span>
        </div>
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-4 py-10 text-center">
            <p className="text-[13px] font-semibold text-[#1A1C20]">Queue is clear</p>
            <p className="mt-1 text-[12px] text-[#9AA0A8]">No stories awaiting review.</p>
          </div>
        ) : (
          queue.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectStory(s.id)}
              className={cn(
                "w-full rounded-[11px] border px-4 py-3.5 text-left transition-colors",
                selectedId === s.id
                  ? "border-[#1A1C20]/20 bg-[#1A1C20] text-white"
                  : "border-[rgba(20,22,26,0.08)] bg-white hover:border-[rgba(20,22,26,0.14)]"
              )}
            >
              {s.plagiarismFlagged && (
                <span className="mb-1.5 inline-block rounded-full bg-[#C0392B]/15 px-2 py-0.5 text-[9px] font-bold uppercase text-[#C0392B]">⚠ Plagiarism flag</span>
              )}
              <p className={cn("line-clamp-1 text-[13px] font-semibold", selectedId === s.id ? "text-white" : "text-[#1A1C20]")}>{s.title}</p>
              <p className={cn("mt-0.5 text-[11px]", selectedId === s.id ? "text-white/60" : "text-[#8B919A]")}>
                {s.authorName} · {s.genre}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                  selectedId === s.id ? "bg-white/15 text-white" : (TIER_COLORS[s.tier] ?? TIER_COLORS.STANDARD)
                )}>
                  {s.tier}
                </span>
                <span className={cn("text-[10px]", selectedId === s.id ? "text-white/50" : "text-[#9AA0A8]")}>{relativeTime(s.submittedAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Middle pane — reading pane */}
      <div className="flex-1 overflow-y-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
        {!selectedId ? (
          <AdminEmptyState title="Select a story" note="Pick a submission from the queue to read it here." />
        ) : detailLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A1C20] border-t-transparent" />
          </div>
        ) : selected ? (
          <div className="px-8 py-8">
            <div className="mb-6 border-b border-[rgba(20,22,26,0.07)] pb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight text-[#1A1C20]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-[14px] text-[#646B73]">by {selected.authorName}</p>
                </div>
                <span className={cn("mt-1 flex-none rounded-full px-3 py-1 text-[10px] font-bold uppercase", TIER_COLORS[selected.tier] ?? TIER_COLORS.STANDARD)}>
                  {selected.tier}
                </span>
              </div>
              {selected.hookLine && (
                <p className="mt-4 border-l-2 border-[#C75D2C] pl-4 font-[family-name:var(--font-display)] text-[16px] italic leading-relaxed text-[#646B73]">
                  {selected.hookLine}
                </p>
              )}
              <div className="mt-3 flex gap-4 text-[12px] text-[#9AA0A8]">
                <span>{selected.wordCount.toLocaleString()} words</span>
                <span>·</span>
                <span>{selected.readingTime} min read</span>
                <span>·</span>
                <span>{selected.genre}</span>
                <span>·</span>
                <span>{selected.cowrieCost} ₵</span>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-[15px] leading-[1.75] text-[#1A1C20]">
              {bodyToText(selected.body).split("\n\n").map((para, i) => (
                <p key={i} className="mb-[1.25em]">{para}</p>
              ))}
            </div>
            {selected.moderationNotes && (
              <div className="mt-8 rounded-[8px] border border-[#B7791F]/25 bg-[rgba(183,121,31,0.06)] px-4 py-3">
                <p className="text-[12px] font-semibold text-[#B7791F]">Previous moderation note</p>
                <p className="mt-1 text-[13px] text-[#8B919A]">{selected.moderationNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <AdminViewError message="Could not load story details." />
        )}
      </div>

      {/* Right pane — decision */}
      <div className="w-[260px] flex-none overflow-y-auto">
        {selected ? (
          <DecisionPanel story={selected} onAction={handleAction} acting={acting} />
        ) : (
          <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-8 text-center">
            <p className="text-[12px] text-[#9AA0A8]">Select a story to review and make a decision.</p>
          </div>
        )}
      </div>
    </div>
  );
}
