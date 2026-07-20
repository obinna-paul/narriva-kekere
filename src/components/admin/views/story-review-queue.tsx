"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ImageIcon, Pencil, ShieldAlert, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminViewError, AdminEmptyState } from "@/components/admin/admin-skeleton";
import { TagPicker } from "@/components/admin/TagPicker";
import { StoryEditor, type StoryEditorHandle } from "@/components/kekere/StoryEditor";
import { docToHtml, isValidTiptapDoc, type TiptapDoc } from "@/lib/tiptap/doc-utils";
import type { SaveStatus } from "@/lib/tiptap/save-status";

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
  isAdult: boolean;
}

const TIER_COLORS: Record<string, string> = {
  STANDARD: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
  FEATURED: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  CHAMPION: "bg-[rgba(107,33,168,0.12)] text-[#6B21A8]",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
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
  story: StoryDetail;
  onAction: (action: "publish" | "reject" | "revisions", note: string, cowrieCost: number, tagIds: string[], isAdult: boolean) => void;
  acting: boolean;
  coverImageRef: string | null;
  coverPreview: string | null;
  onCoverUploaded: (ref: string, previewUrl: string) => void;
  onCoverRemoved: () => void;
}

function DecisionPanel({ story, onAction, acting, coverImageRef, coverPreview, onCoverUploaded, onCoverRemoved }: DecisionPanelProps) {
  const [tab, setTab] = useState<"publish" | "reject" | "revisions">("publish");
  const [note, setNote] = useState("");
  const [cowrieCost, setCowrieCost] = useState(Math.max(1, Math.min(10, story.cowrieCost || 3)));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isAdult, setIsAdult] = useState(story.isAdult);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tagError = tab === "publish" && (tagIds.length < 1 || tagIds.length > 2);
  const coverError = tab === "publish" && !coverPreview && !coverImageRef;

  // Nari tag suggestions
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[] | null>(null);
  const [newTagSuggestion, setNewTagSuggestion] = useState<NewTagSuggestion | null>(null);
  const [suggestedIsAdult, setSuggestedIsAdult] = useState<boolean | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function handleSuggestTags() {
    setSuggesting(true);
    setSuggestions(null);
    setNewTagSuggestion(null);
    setSuggestedIsAdult(null);
    setSuggestError(null);
    try {
      const res = await fetch(`/api/admin/kekere/stories/${story.id}/suggest-tags`, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setNewTagSuggestion(data.newTag ?? null);
      setSuggestedIsAdult(typeof data.isAdult === "boolean" ? data.isAdult : null);
    } catch {
      setSuggestError("Nari couldn't read the story right now. Try again.");
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestions() {
    if (!suggestions || suggestions.length === 0) return;
    setTagIds(suggestions.slice(0, 2).map((s) => s.id));
    if (suggestedIsAdult !== null) setIsAdult(suggestedIsAdult);
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
                <img src={coverPreview ?? coverImageRef ?? ""} alt="Cover" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { onCoverRemoved(); if (fileRef.current) fileRef.current.value = ""; }}
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

          {/* Mature content toggle */}
          <div>
            <button
              type="button"
              onClick={() => setIsAdult((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between rounded-[8px] border px-3 py-2.5 transition-colors",
                isAdult ? "border-[#A13A3A]/30 bg-[rgba(161,58,58,0.06)]" : "border-[rgba(20,22,26,0.14)] bg-[#F4F5F7]"
              )}
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-[#1A1C20]">
                <ShieldAlert size={14} className={isAdult ? "text-[#A13A3A]" : "text-[#9AA0A8]"} />
                18+ mature content
              </span>
              <span
                className={cn(
                  "relative h-5 w-9 flex-none rounded-full transition-colors",
                  isAdult ? "bg-[#A13A3A]" : "bg-[rgba(20,22,26,0.18)]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-[2px] h-4 w-4 rounded-full bg-white transition-transform",
                    isAdult ? "translate-x-[18px]" : "translate-x-[2px]"
                  )}
                />
              </span>
            </button>
            {isAdult && (
              <p className="mt-1.5 text-[10px] text-[#8B919A]">
                Readers see an 18+ warning before opening this story, and a mature badge on its cover.
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B919A]">
                Tags <span className="normal-case text-[#C0392B]">(1–2, required)</span>
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

            {/* Nari's content-rating suggestion */}
            {suggestedIsAdult !== null && (
              <div className="mb-2 flex items-center justify-between rounded-[8px] border border-[rgba(107,33,168,0.18)] bg-[rgba(107,33,168,0.04)] px-3 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#1A1C20]">
                  {suggestedIsAdult ? (
                    <ShieldAlert size={12} className="text-[#A13A3A]" />
                  ) : (
                    <ShieldAlert size={12} className="text-[#9AA0A8]" />
                  )}
                  Nari suggests: {suggestedIsAdult ? "18+ mature content" : "Safe for all readers"}
                </span>
                {suggestedIsAdult !== isAdult && (
                  <button
                    type="button"
                    onClick={() => setIsAdult(suggestedIsAdult)}
                    className="rounded-[6px] bg-[#6B21A8] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#5a1a8f]"
                  >
                    Apply
                  </button>
                )}
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

            <TagPicker value={tagIds} onChange={setTagIds} error={tagError} />
            {tagError && (
              <p className="mt-1 text-[10px] text-[#C0392B]">Select 1 or 2 tags before publishing.</p>
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
        onClick={() => onAction(tab, note, cowrieCost, tagIds, isAdult)}
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

// ─── Editorial working copy ───────────────────────────────────────────────────

// The admin's in-progress edits to a submitted story, loaded from and saved to
// /api/admin/kekere/stories/[id]/review-edit. Unlike the old plain-textarea
// draft (localStorage only), the body is a real Tiptap doc autosaved to the
// server, so edits survive a closed tab, another device, or a handoff — and
// the writer's original body/hookLine stay untouched here.
interface ReviewEdit {
  originalHookLine: string;
  originalBody: TiptapDoc;
  editedHookLine: string | null;
  editedBody: TiptapDoc | null;
  editedWordCount: number | null;
  editLastSavedAt: string | null;
  hasEdits: boolean;
}

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

// Matches AdminTopBar's fixed height so StoryEditor's sticky toolbar clears the
// admin header (same variable the author-on-behalf screen sets).
const ADMIN_TOP_BAR_HEIGHT = "62px";

function saveStatusLabel(status: SaveStatus): { text: string; tone: "muted" | "ok" | "warn" } | null {
  switch (status.kind) {
    case "saving": return { text: "Saving…", tone: "muted" };
    case "saved": return { text: "Saved", tone: "ok" };
    case "offline": return { text: "Offline — will retry", tone: "warn" };
    case "conflict": return { text: "Edited elsewhere — reload", tone: "warn" };
    default: return null;
  }
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
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // The editorial working copy (rich body + hook line), autosaved server-side.
  const [editData, setEditData] = useState<ReviewEdit | null>(null);
  const [hasEdits, setHasEdits] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });

  const editorRef = useRef<StoryEditorHandle>(null);
  const hookSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The hook-line value currently persisted server-side — so the debounced
  // save only fires on a real change and can update itself on success.
  const lastSavedHookRef = useRef<string>("");

  const reviewEditUrl = selectedId ? `/api/admin/kekere/stories/${selectedId}/review-edit` : null;

  // Debounced hook-line autosave (the body has its own autosave inside
  // StoryEditor; the hook line is a plain input, so it needs its own channel).
  useEffect(() => {
    if (!selectedId || !reviewEditUrl || !editData) return;
    if (draftHookLine === lastSavedHookRef.current) return;
    if (hookSaveTimer.current) clearTimeout(hookSaveTimer.current);
    hookSaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(reviewEditUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hookLine: draftHookLine }),
        });
        if (res.ok) {
          lastSavedHookRef.current = draftHookLine;
          setHasEdits(true);
        }
      } catch {
        // Non-fatal — the next keystroke reschedules the save.
      }
    }, 800);
    return () => { if (hookSaveTimer.current) clearTimeout(hookSaveTimer.current); };
  }, [draftHookLine, selectedId, reviewEditUrl, editData]);

  async function revertToOriginal() {
    if (!selectedId || !reviewEditUrl) return;
    if (!window.confirm("Discard all editorial changes and restore the writer's original submission? This can't be undone.")) return;
    try {
      await fetch(reviewEditUrl, { method: "DELETE" });
    } catch {
      // Even if the request failed, reloading below re-syncs with the server.
    }
    setCoverImageRef(null);
    setCoverPreview(null);
    await selectStory(selectedId);
  }

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
    setSaveStatus({ kind: "idle" });
    try {
      const [reviewRes, editRes] = await Promise.all([
        fetch(`/api/admin/kekere/stories/${id}/review`),
        fetch(`/api/admin/kekere/stories/${id}/review-edit`),
      ]);
      if (!reviewRes.ok) throw new Error(`${reviewRes.status}`);
      const detail: StoryDetail = await reviewRes.json();
      setSelected(detail);

      const edit = editRes.ok ? await editRes.json() : null;
      if (edit) {
        const data: ReviewEdit = {
          originalHookLine: edit.originalHookLine ?? "",
          originalBody: isValidTiptapDoc(edit.originalBody) ? edit.originalBody : EMPTY_DOC,
          editedHookLine: edit.editedHookLine ?? null,
          editedBody: isValidTiptapDoc(edit.editedBody) ? edit.editedBody : null,
          editedWordCount: edit.editedWordCount ?? null,
          editLastSavedAt: edit.editLastSavedAt ?? null,
          hasEdits: !!edit.hasEdits,
        };
        setEditData(data);
        const effectiveHook = data.editedHookLine ?? data.originalHookLine;
        setDraftHookLine(effectiveHook);
        lastSavedHookRef.current = effectiveHook;
        setHasEdits(data.hasEdits);
      } else {
        setEditData(null);
        const dbHook = detail.hookLine ?? "";
        setDraftHookLine(dbHook);
        lastSavedHookRef.current = dbHook;
        setHasEdits(false);
      }
      setCoverImageRef(null);
      setCoverPreview(null);
    } catch {
      setSelected(null);
      setEditData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  // Turning editing off: flush the last keystrokes to the server and capture
  // the editor's content into editData so the read-only view shows the latest
  // immediately, without waiting on a re-fetch.
  async function toggleEditing() {
    if (editingContent) {
      await editorRef.current?.flush().catch(() => {});
      const content = editorRef.current?.getContent();
      if (content) {
        setEditData((d) => (d ? { ...d, editedBody: content } : d));
        setHasEdits(true);
      }
      setEditingContent(false);
    } else {
      setEditingContent(true);
    }
  }

  async function handleAction(action: "publish" | "reject" | "revisions", note: string, cowrieCost: number, tagIds: string[], isAdult: boolean) {
    if (!selectedId || !selected) return;

    // Ensure the last few keystrokes are persisted before we promote the
    // editorial working copy to the live story on publish — the body/hook line
    // are read server-side from the edited* columns, not sent in this request.
    if (action === "publish") {
      if (editingContent) await editorRef.current?.flush().catch(() => {});
      if (hookSaveTimer.current) {
        clearTimeout(hookSaveTimer.current);
        if (draftHookLine !== lastSavedHookRef.current && reviewEditUrl) {
          await fetch(reviewEditUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hookLine: draftHookLine }),
          }).catch(() => {});
        }
      }
    }

    setActing(true);

    const endpoint =
      action === "publish" ? `/api/admin/kekere/stories/${selectedId}/publish`
      : action === "reject" ? `/api/admin/kekere/stories/${selectedId}/reject`
      : `/api/admin/kekere/stories/${selectedId}/request-revisions`;

    const body =
      action === "publish"
        ? {
            cowrieCost,
            tier: selected.tier,
            tagIds,
            isAdult,
            ...(coverImageRef ? { coverImageRef } : {}),
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

      setToast({ type: "ok", msg: successMsg });
      setQueue((q) => q.filter((s) => s.id !== selectedId));
      setSelected(null);
      setSelectedId(null);
      setEditData(null);
      setCoverImageRef(null);
      setCoverPreview(null);
    } catch {
      setToast({ type: "err", msg: "Something went wrong. Try again." });
    } finally {
      setActing(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="flex min-w-[900px] gap-4">
          <div className="w-[200px] flex-none space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[90px] animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" />
            ))}
          </div>
          <div className="flex-1 animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" style={{ minHeight: 400 }} />
          <div className="w-[300px] flex-none animate-pulse rounded-[11px] bg-[rgba(20,22,26,0.06)]" style={{ minHeight: 400 }} />
        </div>
      </div>
    );
  }

  if (error) return <AdminViewError message={error} onRetry={loadQueue} />;

  return (
    <div className="overflow-x-auto">
    <div className="relative flex h-[calc(100vh-130px)] min-w-[900px] gap-4">
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
      <div className="flex-1 overflow-y-scroll rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
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
              {/* Row 1 — title + tier badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight text-[#1A1C20]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-[14px] text-[#646B73]">by {selected.authorName}</p>
                </div>
                <span className={cn("mt-1 flex-none rounded-full px-3 py-1 text-[10px] font-bold uppercase", TIER_COLORS[selected.tier] ?? TIER_COLORS.STANDARD)}>
                  {selected.tier}
                </span>
              </div>

              {/* Row 2 — action toolbar */}
              <div className="mt-3 flex items-center gap-2">
                {hasEdits && (
                  <span className="rounded-full bg-[rgba(199,93,44,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#C75D2C]">
                    Edited
                  </span>
                )}
                {(() => {
                  const label = saveStatusLabel(saveStatus);
                  if (!label) return null;
                  return (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        label.tone === "ok" ? "text-[#1F8A5B]" : label.tone === "warn" ? "text-[#C0392B]" : "text-[#9AA0A8]",
                      )}
                    >
                      {label.text}
                    </span>
                  );
                })()}
                <div className="flex-1" />
                {hasEdits && (
                  <button
                    type="button"
                    onClick={revertToOriginal}
                    title="Discard all edits and restore the writer's original submission"
                    className="rounded-[7px] border border-[rgba(192,57,43,0.25)] px-2.5 py-1.5 text-[10px] font-semibold text-[#C0392B] transition-colors hover:bg-[rgba(192,57,43,0.06)]"
                  >
                    Revert to original
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleEditing}
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
                <span>{(editData?.editedWordCount ?? selected.wordCount).toLocaleString()} words</span>
                <span>·</span>
                <span>{selected.readingTime} min read</span>
                <span>·</span>
                <span>{selected.genre}</span>
              </div>
            </div>

            {/* Body — the real rich editor (server-autosaved to the editorial
                working copy) when editing, a formatted read-only render
                otherwise. The plain textarea is gone: edits now keep their
                bold/italic and survive a closed tab or a handoff. */}
            {editingContent ? (
              <div style={{ "--writer-header-h": ADMIN_TOP_BAR_HEIGHT } as CSSProperties}>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA0A8]">Story body</label>
                <StoryEditor
                  key={selected.id}
                  ref={editorRef}
                  storyId={selected.id}
                  initialContent={editData?.editedBody ?? editData?.originalBody ?? EMPTY_DOC}
                  initialLastSavedAt={editData?.editLastSavedAt ?? null}
                  saveEndpoint={`/api/admin/kekere/stories/${selected.id}/review-edit`}
                  versionsEndpoint={null}
                  storageKey={`admin-review-${selected.id}`}
                  onStatusChange={(status) => {
                    setSaveStatus(status);
                    if (status.kind === "saved") setHasEdits(true);
                  }}
                />
                <p className="mt-1.5 text-[10px] text-[#9AA0A8]">
                  Edits auto-save to the server as you type — they survive a refresh, a closed tab, or picking this story back up on another device.
                </p>
              </div>
            ) : (
              <div
                className="story-reader-prose prose prose-sm max-w-none text-[15px] leading-[1.75] text-[#1A1C20] [&_em]:italic [&_strong]:font-bold [&_u]:underline [&_p]:mb-[1.25em]"
                dangerouslySetInnerHTML={{
                  __html: docToHtml(editData?.editedBody ?? editData?.originalBody ?? EMPTY_DOC),
                }}
              />
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
            coverPreview={coverPreview}
            onCoverUploaded={(ref, preview) => { setCoverImageRef(ref || null); setCoverPreview(preview || null); }}
            onCoverRemoved={() => { setCoverImageRef(null); setCoverPreview(null); }}
          />
        ) : (
          <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-8 text-center">
            <p className="text-[12px] text-[#9AA0A8]">Select a story to review and make a decision.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
