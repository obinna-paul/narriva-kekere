"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Pencil, Sparkles, X } from "lucide-react";
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

// ─── Decision Panel ───────────────────────────────────────────────────────────

interface TagSuggestion {
  id: string;
  slug: string;
  label: string;
  feedHeading: string;
}

interface NewTagSuggestion {
  slug: string;
  label: string;
  feedHeading: string;
  description: string;
}

interface DecisionPanelProps {
  story: QueueStory;
  onAction: (action: "publish" | "reject" | "revisions", note: string, cowrieCost: number, tagIds: string[]) => void;
  acting: boolean;
  coverImageRef: string | null;
  onCoverUploaded: (ref: string, previewUrl: string) => void;
}

function DecisionPanel({ story, onAction, acting, coverImageRef, onCoverUploaded }: DecisionPanelProps) {
  const [tab, setTab] = useState<"publish" | "reject" | "revisions">("publish");
  const [note, setNote] = useState("");
  const [cowrieCost, setCowrieCost] = useState(Math.max(1, Math.min(10, story.cowrieCost || 3)));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tagError = tab === "publish" && tagIds.length === 0;
  const coverError = tab === "publish" && !coverPreview && !coverImageRef;

  // Nari tag suggestions
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[] | null>(null);
  const [newTagSuggestion, setNewTagSuggestion] = useState<NewTagSuggestion | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function handleSuggestTags() {
    setSuggesting(true);
    setSuggestions(null);
    setNewTagSuggestion(null);
    setSuggestError(null);
    try {
      const res = await fetch(`/api/admin/kekere/stories/${story.id}/suggest-tags`, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setNewTagSuggestion(data.newTag ?? null);
    } catch {
      setSuggestError("Nari couldn't read the story right now. Try again.");
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestions() {
    if (!suggestions) return;
    setTagIds(suggestions.map((s) => s.id));
    setSuggestions(null);
    setNewTagSuggestion(null);
  }

  async function handleCoverFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("storyId", story.id);
      const res = await fetch("/api/admin/kekere/cover-upload", { method: "POST", body: form });
      if (res.ok) {
        const { coverImageRef: ref, previewUrl } = await res.json();
        setCoverPreview(previewUrl);
        onCoverUploaded(ref, previewUrl);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5">
      <div className="text-[13px] font-semibold text-[#1A1C20]">Decision</div>

      {story.plagiarismFlagged && (
        <div className="rounded-[8px] border border-[#C0392B]/25 bg-[rgba(192,57,43,0.06)] px-4 py-3">
          <p className="text-[12px] font-semibold text-[#C0392B]">⚠ Plagiarism flag</p>
          <p className="mt-0.5 text-[11px] text-[#C0392B]/80">Review carefully before publishing.</p>
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
          {/* Cover image upload */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
              Story cover <span className="normal-case text-[#C0392B]">(required)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }}
            />
            {coverPreview || coverImageRef ? (
              <div className="relative flex h-[100px] w-full items-center justify-center overflow-hidden rounded-[8px] border border-[rgba(20,22,26,0.14)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview ?? ""} alt="Cover" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverPreview(null); onCoverUploaded("", ""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "flex h-[80px] w-full flex-col items-center justify-center gap-1.5 rounded-[8px] border border-dashed bg-[#F4F5F7] transition-colors disabled:opacity-50",
                  coverError ? "border-[#C0392B]/50 hover:border-[#C0392B]" : "border-[rgba(20,22,26,0.20)] hover:border-[rgba(20,22,26,0.35)]"
                )}
              >
                <ImageIcon size={18} className={coverError ? "text-[#C0392B]/60" : "text-[#9AA0A8]"} />
                <span className={cn("text-[11px]", coverError ? "text-[#C0392B]/70" : "text-[#9AA0A8]")}>{uploading ? "Uploading…" : "Upload cover image"}</span>
              </button>
            )}
            {coverError && (
              <p className="mt-1 text-[10px] text-[#C0392B]">A cover image is required before sending the contract.</p>
            )}
          </div>

          {/* Cowrie cost */}
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

          {/* Tags */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
                Tags <span className="normal-case text-[#C0392B]">(required)</span>
              </label>
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={suggesting}
                className="flex items-center gap-1 rounded-[6px] bg-[rgba(107,33,168,0.08)] px-2 py-1 text-[10px] font-semibold text-[#6B21A8] transition-colors hover:bg-[rgba(107,33,168,0.14)] disabled:opacity-50"
              >
                <Sparkles size={10} />
                {suggesting ? "Nari is reading…" : "Nari suggests"}
              </button>
            </div>

            {/* Nari suggestion results */}
            {suggestions && suggestions.length > 0 && (
              <div className="mb-2 rounded-[8px] border border-[rgba(107,33,168,0.18)] bg-[rgba(107,33,168,0.04)] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B21A8]">Nari suggests</p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((s) => (
                    <div key={s.id} className="rounded-[6px] bg-white px-2.5 py-1.5">
                      <div className="text-[12px] font-semibold text-[#1A1C20]">{s.label}</div>
                      <div className="text-[10px] text-[#8B919A]">{s.feedHeading}</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={applySuggestions}
                  className="mt-2.5 w-full rounded-[7px] bg-[#6B21A8] py-2 text-[11px] font-semibold text-white hover:bg-[#5a1a8f]"
                >
                  Use these tags
                </button>
              </div>
            )}

            {/* New tag suggestion from Nari */}
            {newTagSuggestion && (
              <div className="mb-2 rounded-[8px] border border-[rgba(183,121,31,0.25)] bg-[rgba(183,121,31,0.05)] p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#B7791F]">Nari also suggests a new category</p>
                <p className="text-[12px] font-semibold text-[#1A1C20]">{newTagSuggestion.label}</p>
                <p className="text-[10px] italic text-[#8B919A]">"{newTagSuggestion.feedHeading}"</p>
                <p className="mt-1 text-[10px] text-[#9AA0A8]">This category doesn't exist yet. Ask your engineer to add it to the tag list.</p>
              </div>
            )}

            {suggestError && (
              <p className="mb-1.5 text-[10px] text-[#C0392B]">{suggestError}</p>
            )}

            <TagPicker value={tagIds} onChange={(ids) => setTagIds(ids.slice(0, 2))} error={tagError} />
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
          rows={3}
          placeholder={
            tab === "publish"
              ? "Optional note to the author…"
              : tab === "reject"
              ? "Explain why this story is being rejected…"
              : "Describe what changes are needed…"
          }
          className="w-full resize-none rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F4F5F7] px-3 py-2.5 text-[13px] text-[#1A1C20] placeholder:text-[#9AA0A8] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
        />
      </div>

      <div className="space-y-2 border-t border-[rgba(20,22,26,0.07)] pt-3">
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Genre</span>
          <span className="font-medium text-[#1A1C20]">{story.genre}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Tier</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", TIER_COLORS[story.tier] ?? TIER_COLORS.STANDARD)}>{story.tier}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Words</span>
          <span className="font-medium text-[#1A1C20]">{story.wordCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Submitted</span>
          <span className="font-medium text-[#1A1C20]">{relativeTime(story.submittedAt)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#8B919A]">Cowrie price</span>
          <span className="font-medium text-[#1A1C20]">Set above ↑</span>
        </div>
      </div>

      <button
        type="button"
        disabled={acting || (tab !== "publish" && !note.trim()) || (tab === "publish" && (tagIds.length === 0 || coverError))}
        onClick={() => onAction(tab, note, cowrieCost, tagIds)}
        className={cn(
          "w-full rounded-[8px] py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40",
          tab === "publish" ? "bg-[#1F8A5B] hover:bg-[#1a7a50]" : tab === "reject" ? "bg-[#C0392B] hover:bg-[#a93226]" : "bg-[#B7791F] hover:bg-[#9c6719]"
        )}
      >
        {acting
          ? "Processing…"
          : tab === "publish"
          ? "Send publishing contract"
          : tab === "reject"
          ? "Reject story"
          : "Request revisions"}
      </button>
    </div>
  );
}

// ─── Draft persistence helpers ────────────────────────────────────────────────

interface StoryDraft {
  hookLine: string;
  body: string;
  coverImageRef: string | null;
}

function draftKey(storyId: string) { return `kekere-story-draft-${storyId}`; }

function loadDraft(storyId: string): StoryDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(storyId));
    return raw ? (JSON.parse(raw) as StoryDraft) : null;
  } catch { return null; }
}

function saveDraft(storyId: string, draft: StoryDraft) {
  try { localStorage.setItem(draftKey(storyId), JSON.stringify(draft)); } catch {}
}

function clearDraft(storyId: string) {
  try { localStorage.removeItem(draftKey(storyId)); } catch {}
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StoryReviewQueue() {
  const [queue, setQueue] = useState<QueueStory[]>([]);
  const [selected, setSelected] = useState<StoryDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Admin editing state — reset when a new story is selected
  const [editingContent, setEditingContent] = useState(false);
  const [draftHookLine, setDraftHookLine] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save draft to localStorage whenever edits change
  useEffect(() => {
    if (!selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setDraftSaved(false);
    saveTimer.current = setTimeout(() => {
      saveDraft(selectedId, { hookLine: draftHookLine, body: draftBody, coverImageRef });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draftHookLine, draftBody, coverImageRef, selectedId]);

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
    setEditingContent(false);
    try {
      const res = await fetch(`/api/admin/kekere/stories/${id}/review`);
      if (!res.ok) throw new Error(`${res.status}`);
      const detail: StoryDetail = await res.json();
      setSelected(detail);

      // Restore saved draft if one exists, otherwise use story data
      const saved = loadDraft(id);
      if (saved) {
        setDraftHookLine(saved.hookLine);
        setDraftBody(saved.body);
        setCoverImageRef(saved.coverImageRef);
      } else {
        setDraftHookLine(detail.hookLine ?? "");
        setDraftBody(bodyToText(detail.body));
        setCoverImageRef(null);
      }
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

    const originalHookLine = selected.hookLine ?? "";
    const originalBody = bodyToText(selected.body);

    const body =
      action === "publish"
        ? {
            cowrieCost,
            tier: selected.tier,
            tagIds,
            ...(coverImageRef ? { coverImageRef } : {}),
            ...(draftHookLine !== originalHookLine ? { hookLineOverride: draftHookLine } : {}),
            ...(draftBody !== originalBody ? { bodyOverride: draftBody } : {}),
          }
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

      let successMsg = action === "reject" ? "Story rejected." : action === "revisions" ? "Revision request sent." : "";
      if (action === "publish") {
        const data = await res.json();
        successMsg = `Contract sent to ${data.writerName ?? selected.authorName}.`;
      }

      clearDraft(selectedId);
      setToast({ type: "ok", msg: successMsg });
      setQueue((q) => q.filter((s) => s.id !== selectedId));
      setSelected(null);
      setSelectedId(null);
      setCoverImageRef(null);
    } catch {
      setToast({ type: "err", msg: "Something went wrong. Try again." });
    } finally {
      setActing(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4">
        <div className="w-[200px] flex-none space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[90px] animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" />
          ))}
        </div>
        <div className="flex-1 animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" style={{ minHeight: 400 }} />
        <div className="w-[300px] flex-none animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" style={{ minHeight: 400 }} />
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
      <div className="flex w-[200px] flex-none flex-col gap-2 overflow-y-auto">
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

      {/* Middle pane — reading / editing pane */}
      <div className="flex-1 overflow-y-auto rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
        {!selectedId ? (
          <AdminEmptyState title="Select a story" note="Pick a submission from the queue to read it here." />
        ) : detailLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A1C20] border-t-transparent" />
          </div>
        ) : selected ? (
          <div className="px-8 py-8">
            {/* Header */}
            <div className="mb-6 border-b border-[rgba(20,22,26,0.07)] pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight text-[#1A1C20]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-[14px] text-[#646B73]">by {selected.authorName}</p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  {draftSaved && (
                    <span className="text-[10px] font-medium text-[#1F8A5B]">Draft saved</span>
                  )}
                  <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase", TIER_COLORS[selected.tier] ?? TIER_COLORS.STANDARD)}>
                    {selected.tier}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingContent((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      editingContent
                        ? "bg-[#1A1C20] text-white"
                        : "border border-[rgba(20,22,26,0.15)] text-[#646B73] hover:border-[rgba(20,22,26,0.3)] hover:text-[#1A1C20]"
                    )}
                  >
                    <Pencil size={11} />
                    {editingContent ? "Done editing" : "Edit content"}
                  </button>
                </div>
              </div>

              {/* Hook line — editable or read-only */}
              <div className="mt-4">
                {editingContent ? (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Hook line</label>
                    <input
                      type="text"
                      value={draftHookLine}
                      onChange={(e) => setDraftHookLine(e.target.value)}
                      placeholder="Write a hook line for the story…"
                      className="w-full rounded-[8px] border border-[rgba(20,22,26,0.18)] bg-[#F7F8FA] px-4 py-2.5 font-[family-name:var(--font-display)] text-[16px] italic text-[#1A1C20] placeholder:text-[#B0B6BE] focus:outline-none focus:ring-1 focus:ring-[#C75D2C]/40"
                    />
                  </div>
                ) : draftHookLine ? (
                  <p className="border-l-2 border-[#C75D2C] pl-4 font-[family-name:var(--font-display)] text-[16px] italic leading-relaxed text-[#646B73]">
                    {draftHookLine}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex gap-4 text-[12px] text-[#9AA0A8]">
                <span>{selected.wordCount.toLocaleString()} words</span>
                <span>·</span>
                <span>{selected.readingTime} min read</span>
                <span>·</span>
                <span>{selected.genre}</span>
              </div>
            </div>

            {/* Body — editable or read-only */}
            {editingContent ? (
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Story body</label>
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={30}
                  placeholder="Story content…"
                  className="w-full resize-y rounded-[8px] border border-[rgba(20,22,26,0.18)] bg-[#F7F8FA] px-4 py-3 text-[15px] leading-[1.75] text-[#1A1C20] placeholder:text-[#B0B6BE] focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/20"
                />
                <p className="mt-1.5 text-[10px] text-[#9AA0A8]">Separate paragraphs with a blank line. Edits auto-save and survive page refreshes.</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-[15px] leading-[1.75] text-[#1A1C20]">
                {draftBody.split("\n\n").map((para, i) => (
                  <p key={i} className="mb-[1.25em]">{para}</p>
                ))}
              </div>
            )}

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
      <div className="w-[300px] flex-none overflow-y-auto">
        {selected ? (
          <DecisionPanel
            story={selected}
            onAction={handleAction}
            acting={acting}
            coverImageRef={coverImageRef}
            onCoverUploaded={(ref, _preview) => setCoverImageRef(ref || null)}
          />
        ) : (
          <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-8 text-center">
            <p className="text-[12px] text-[#9AA0A8]">Select a story to review and make a decision.</p>
          </div>
        )}
      </div>
    </div>
  );
}
