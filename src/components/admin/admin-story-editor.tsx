"use client";

import { useRef, useState, useEffect, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { ShieldAlert, Sparkles, X, Upload, ImageIcon, Check, RefreshCw } from "lucide-react";
import { StoryEditor, type StoryEditorHandle } from "@/components/kekere/StoryEditor";
import { categoryForTag } from "@/content/story-tags";
import { formatRelativeTime } from "@/lib/tiptap/save-status";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

interface TagItem {
  id: string;
  slug: string;
  label: string;
}

interface AdminStoryEditorInitial {
  title: string;
  hookLine: string;
  body: TiptapDoc;
  tier: string;
  cowrieCost: number;
  isAdult: boolean;
  coverImageRef: string | null;
  coverPreviewUrl: string | null;
  tagIds: string[];
  lastSavedAt: string;
}

interface AdminStoryEditorProps {
  storyId: string;
  authorName: string;
  status: string;
  initial: AdminStoryEditorInitial;
}

// Matches AdminTopBar's fixed h-[62px] (src/components/admin/admin-top-bar.tsx)
const ADMIN_TOP_BAR_HEIGHT = "62px";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted — awaiting review",
  REVIEWING: "Under review",
  REVISIONS_REQUESTED: "Revisions requested",
  PENDING_CONTRACT: "Pending contract",
  PUBLISHED: "Published — live on the feed",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-[rgba(31,138,91,0.12)] text-[#1F8A5B]",
  PENDING_CONTRACT: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  REJECTED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
};

const TIER_HINTS: Record<string, string> = {
  STANDARD: "Regular feed placement — no special treatment.",
  FEATURED: "Also enters the daily rotation for the \"Editor's Pick\" spot on the feed.",
  CHAMPION: "Appears in the Winners' Circle, and also enters the daily rotation for the \"Editor's Pick\" spot on the feed.",
};

interface EditDraft {
  title: string;
  hookLine: string;
  tier: string;
  cowrieCost: number;
  isAdult: boolean;
  coverImageRef: string | null;
  coverPreviewUrl: string | null;
  tagIds: string[];
  body: TiptapDoc;
  savedAt: string;
}

function draftKey(storyId: string): string {
  return `kekere_admin_edit_draft_${storyId}`;
}

function loadDraft(storyId: string): EditDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(storyId));
    if (!raw) return null;
    return JSON.parse(raw) as EditDraft;
  } catch {
    return null;
  }
}

function saveDraftToStorage(storyId: string, draft: Omit<EditDraft, "savedAt">): string {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(draftKey(storyId), JSON.stringify({ ...draft, savedAt }));
  } catch {
    // Storage full/unavailable — non-fatal.
  }
  return savedAt;
}

function clearDraft(storyId: string) {
  try {
    localStorage.removeItem(draftKey(storyId));
  } catch {
    // ignore
  }
}

function extractPlainText(doc: TiptapDoc): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paragraphs = (doc.content ?? []) as any[];
  return paragraphs
    .map((p) => {
      if (p.type === "paragraph" && Array.isArray(p.content)) {
        return p.content
          .filter((n: { type?: string }) => n.type === "text")
          .map((n: { text?: string }) => n.text ?? "")
          .join("");
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

export function AdminStoryEditor({ storyId, authorName, status, initial }: AdminStoryEditorProps) {
  const editorRef = useRef<StoryEditorHandle>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [title, setTitle] = useState(initial.title);
  const [hookLine, setHookLine] = useState(initial.hookLine);
  const [tier, setTier] = useState<string>(initial.tier);
  const [cowrieCost, setCowrieCost] = useState(initial.cowrieCost);
  const [isAdult, setIsAdult] = useState(initial.isAdult);
  const [coverImageRef, setCoverImageRef] = useState<string | null>(initial.coverImageRef);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(initial.coverPreviewUrl);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    tags: { slug: string; label: string; feedHeading: string }[];
    hookLine: string;
  } | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const suggestionHistoryRef = useRef<{ tagSlugs: string[]; hookLine: string }[]>([]);

  // Local draft persistence — a safety net so an admin who navigates away
  // mid-edit doesn't lose work before hitting Save. Only offered as a
  // restore if it's actually newer than the server's own last save.
  const [draftChecked, setDraftChecked] = useState(false);
  const [initialBody, setInitialBody] = useState<TiptapDoc>(initial.body);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftSavedAtLabel, setDraftSavedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kekere/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  // Restore a local draft only if it postdates the server's own content —
  // otherwise a stale draft from a previous unrelated edit session could
  // clobber content another admin (or this one, elsewhere) saved since.
  useEffect(() => {
    const draft = loadDraft(storyId);
    if (draft && new Date(draft.savedAt).getTime() > new Date(initial.lastSavedAt).getTime()) {
      setTitle(draft.title);
      setHookLine(draft.hookLine);
      setTier(draft.tier);
      setCowrieCost(draft.cowrieCost);
      setIsAdult(draft.isAdult ?? initial.isAdult);
      setCoverImageRef(draft.coverImageRef);
      setCoverPreviewUrl(draft.coverPreviewUrl);
      setTagIds(draft.tagIds);
      setInitialBody(draft.body);
      setRestoredAt(draft.savedAt);
      setDraftSavedAt(draft.savedAt);
    } else if (draft) {
      clearDraft(storyId); // stale — older than what's already saved server-side
    }
    setDraftChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  useEffect(() => {
    if (!draftSavedAt) {
      setDraftSavedAtLabel(null);
      return;
    }
    setDraftSavedAtLabel(formatRelativeTime(draftSavedAt));
    const interval = setInterval(() => setDraftSavedAtLabel(formatRelativeTime(draftSavedAt)), 15000);
    return () => clearInterval(interval);
  }, [draftSavedAt]);

  const scheduleDraftSave = useCallback(() => {
    if (!draftChecked) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const body = editorRef.current?.getContent() ?? initialBody;
      // Unlike the create flow (which starts blank), edit mode starts
      // already full of real content — without this check, the safety net
      // would fire the moment the page loads and claim "Draft saved" before
      // the admin has touched anything. Only persist once something has
      // actually changed from the baseline (initialBody: the server's
      // content, or a restored draft's, whichever we're currently diffing
      // against).
      const changed =
        title !== initial.title ||
        hookLine !== initial.hookLine ||
        tier !== initial.tier ||
        cowrieCost !== initial.cowrieCost ||
        isAdult !== initial.isAdult ||
        coverImageRef !== initial.coverImageRef ||
        JSON.stringify(tagIds) !== JSON.stringify(initial.tagIds) ||
        extractPlainText(body).trim() !== extractPlainText(initialBody).trim();
      if (!changed) return;
      const savedAt = saveDraftToStorage(storyId, {
        title,
        hookLine,
        tier,
        cowrieCost,
        isAdult,
        coverImageRef,
        coverPreviewUrl,
        tagIds,
        body,
      });
      setDraftSavedAt(savedAt);
    }, 1200);
    // initial.* is a stable prop (set once at mount) — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftChecked, storyId, title, hookLine, tier, cowrieCost, isAdult, coverImageRef, coverPreviewUrl, tagIds, initialBody]);

  useEffect(() => {
    scheduleDraftSave();
  }, [scheduleDraftSave]);

  useEffect(() => {
    function flush() {
      clearTimeout(saveTimerRef.current);
      const body = editorRef.current?.getContent();
      if (!body) return;
      saveDraftToStorage(storyId, { title, hookLine, tier, cowrieCost, isAdult, coverImageRef, coverPreviewUrl, tagIds, body });
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, title, hookLine, tier, cowrieCost, isAdult, coverImageRef, coverPreviewUrl, tagIds]);

  function discardDraft() {
    if (!window.confirm("Discard this unsaved draft and go back to the last saved version? This can't be undone.")) return;
    clearDraft(storyId);
    setTitle(initial.title);
    setHookLine(initial.hookLine);
    setTier(initial.tier);
    setCowrieCost(initial.cowrieCost);
    setIsAdult(initial.isAdult);
    setCoverImageRef(initial.coverImageRef);
    setCoverPreviewUrl(initial.coverPreviewUrl);
    setTagIds(initial.tagIds);
    setRestoredAt(null);
    setDraftSavedAt(null);
    editorRef.current?.setContent(initial.body);
  }

  const selectedTagObjs = tagIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is TagItem => !!t);

  const selectedCategories = Array.from(
    new Map(selectedTagObjs.map((t) => [categoryForTag(t.slug).slug, categoryForTag(t.slug)])).values()
  );

  const isValid =
    title.trim() &&
    hookLine.trim() &&
    tagIds.length >= 1 &&
    tagIds.length <= 2 &&
    cowrieCost >= 1 &&
    cowrieCost <= 10;

  async function handleNariSuggest(regenerate = false) {
    const content = editorRef.current?.getContent();
    if (!content) {
      setSuggestionError("Type some story content first");
      return;
    }

    const plainText = extractPlainText(content);
    if (plainText.length < 50) {
      setSuggestionError("At least 50 characters of story content needed for useful suggestions");
      return;
    }

    if (regenerate && suggestion) {
      suggestionHistoryRef.current = [
        ...suggestionHistoryRef.current,
        { tagSlugs: suggestion.tags.map((t) => t.slug), hookLine: suggestion.hookLine },
      ].slice(-4);
    } else if (!regenerate) {
      suggestionHistoryRef.current = [];
    }

    setSuggesting(true);
    setSuggestionError(null);
    setSuggestion(null);

    try {
      const res = await fetch("/api/admin/kekere/stories/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled",
          body: plainText,
          avoid: suggestionHistoryRef.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setSuggestionError(data.error ?? "AI service unavailable");
        setSuggesting(false);
        return;
      }

      const data = await res.json();

      if ((data.suggestedTags && data.suggestedTags.length > 0) || data.suggestedHookLine) {
        setSuggestion({
          tags: data.suggestedTags ?? [],
          hookLine: data.suggestedHookLine ?? "",
        });
      } else {
        setSuggestionError("No useful suggestions returned");
      }
    } catch {
      setSuggestionError("Network error while fetching suggestions");
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;

    if (suggestion.hookLine) {
      setHookLine(suggestion.hookLine);
    }

    if (suggestion.tags.length > 0) {
      const matchedIds = suggestion.tags
        .map((t) => allTags.find((at) => at.slug === t.slug)?.id)
        .filter((id): id is string => !!id)
        .slice(0, 2);
      if (matchedIds.length > 0) setTagIds(matchedIds);
    }

    setSuggestion(null);
    suggestionHistoryRef.current = [];
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storyId", storyId);
      const res = await fetch("/api/admin/kekere/cover-upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setCoverImageRef(data.coverImageRef ?? null);
        setCoverPreviewUrl(data.previewUrl ?? null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Cover upload failed (${res.status}). Please try again.`);
      }
    } catch {
      setError("Cover upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && ["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      uploadFile(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!isValid) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const bodyContent = editorRef.current?.getContent();
      if (!bodyContent) {
        setError("Story content is empty");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/admin/kekere/stories/${storyId}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hookLine: hookLine.trim(),
          body: bodyContent,
          tier,
          cowrieCost,
          isAdult,
          tagIds,
          ...(coverImageRef ? { coverImageRef } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(data.error ?? "Failed to save story");
        setSaving(false);
        return;
      }

      clearDraft(storyId);
      setRestoredAt(null);
      setDraftSavedAt(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-3xl p-4 sm:p-6"
      style={{ "--writer-header-h": ADMIN_TOP_BAR_HEIGHT } as CSSProperties}
    >
      <div className="mb-6">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <h1 className="text-[16px] font-bold text-[#15171C] sm:text-[18px]">Edit story</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[status] ?? "bg-[rgba(20,22,26,0.07)] text-[#646B73]"}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#7C828C] sm:text-[13px]">
          by {authorName}.{" "}
          {status === "PUBLISHED"
            ? "This story is live — any change you save here updates the feed and the reader immediately."
            : "Changes save directly to this story, wherever it is in the pipeline."}
        </p>
      </div>

      {restoredAt && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[8px] border border-[#E8C98C] bg-[#FBEFD9] px-4 py-3 text-[12.5px] text-[#5A4419]">
          <span>
            Restored an unsaved draft from {formatRelativeTime(restoredAt)} — nothing was lost.
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="flex-none rounded-[6px] border border-[rgba(90,68,25,0.3)] px-2.5 py-1 text-[11px] font-semibold hover:bg-[rgba(90,68,25,0.08)]"
          >
            Discard &amp; revert
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Story title"
            className="w-full rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3.5 py-2.5 text-[14px] text-[#15171C] placeholder:text-[#B0B5BD] focus:border-[#C75D2C] focus:outline-none"
          />
        </div>

        {/* Hook line + Nari suggest */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Hook line
            </label>
            <button
              type="button"
              onClick={() => handleNariSuggest(false)}
              disabled={suggesting}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-[rgba(199,93,44,0.3)] bg-[#FFF8F2] px-3 py-1.5 text-[11px] font-semibold text-[#C75D2C] hover:bg-[#FFEDDD] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={12} />
              {suggesting ? "Reading..." : "Nari suggest tag & hook"}
            </button>
          </div>
          <input
            type="text"
            value={hookLine}
            onChange={(e) => setHookLine(e.target.value)}
            placeholder="A single compelling line that hooks the reader"
            className="w-full rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3.5 py-2.5 text-[14px] text-[#15171C] placeholder:text-[#B0B5BD] focus:border-[#C75D2C] focus:outline-none"
          />
        </div>

        {/* Nari suggestions panel */}
        {suggestionError && (
          <div className="rounded-[8px] border border-[rgba(199,93,44,0.25)] bg-[#FFF8F2] px-4 py-3 text-[12px] text-[#B0531E]">
            {suggestionError}
          </div>
        )}

        {suggestion && (
          <div className="rounded-[10px] border border-[rgba(31,75,75,0.25)] bg-[#F0F7F7] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1F4B4B]">
                Nari&rsquo;s suggestions
              </span>
              <button
                type="button"
                onClick={() => { setSuggestion(null); suggestionHistoryRef.current = []; }}
                className="rounded-[6px] p-0.5 text-[#5E8A8A] hover:bg-[rgba(31,75,75,0.1)] hover:text-[#1F4B4B]"
              >
                <X size={14} />
              </button>
            </div>

            {suggestion.hookLine && (
              <div className="mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[rgba(31,75,75,0.55)]">
                  Suggested hook line
                </span>
                <p className="mt-0.5 text-[13px] italic text-[#2A1A12]">
                  &ldquo;{suggestion.hookLine}&rdquo;
                </p>
              </div>
            )}

            {suggestion.tags.length > 0 && (
              <div className="mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[rgba(31,75,75,0.55)]">
                  Suggested {suggestion.tags.length > 1 ? "tags" : "category"} &amp; feed row{suggestion.tags.length > 1 ? "s" : ""}
                </span>
                <div className="mt-1 flex flex-col gap-1.5">
                  {suggestion.tags.map((t) => (
                    <div key={t.slug} className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[rgba(31,75,75,0.2)] bg-white px-2.5 py-0.5 text-[12px] font-medium text-[#1F4B4B]">
                        {t.label}
                      </span>
                      <span className="text-[12px] text-[rgba(31,75,75,0.6)]">
                        &rarr; &ldquo;{t.feedHeading}&rdquo;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applySuggestion}
                className="rounded-[7px] bg-[#1F4B4B] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#163838]"
              >
                Apply suggestions
              </button>
              <button
                type="button"
                onClick={() => handleNariSuggest(true)}
                disabled={suggesting}
                className="inline-flex items-center gap-1.5 rounded-[7px] border border-[rgba(31,75,75,0.25)] px-3 py-1.5 text-[12px] font-semibold text-[#1F4B4B] hover:bg-[rgba(31,75,75,0.06)] disabled:opacity-50"
              >
                <RefreshCw size={12} />
                {suggesting ? "Thinking..." : "Try another idea"}
              </button>
            </div>
          </div>
        )}

        {/* Story content */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Story content
            </label>
            {draftSavedAtLabel && (
              <span className="flex items-center gap-1 text-[11px] text-[#9AA0A8]">
                <Check size={11} className="text-green-600" />
                Draft saved {draftSavedAtLabel}
              </span>
            )}
          </div>
          <div className="rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white p-[22px]">
            {draftChecked && (
              <StoryEditor
                ref={editorRef}
                storyId={storyId}
                initialContent={initialBody}
                initialLastSavedAt={null}
                autosave={false}
                onWordCountChange={scheduleDraftSave}
              />
            )}
          </div>
        </div>

        {/* Tier + Cowrie cost */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3 py-2.5 text-[14px] text-[#15171C] focus:border-[#C75D2C] focus:outline-none"
            >
              <option value="STANDARD">Standard</option>
              <option value="FEATURED">Featured</option>
              <option value="CHAMPION">Champion</option>
            </select>
            <p className="mt-1 text-[11px] text-[#9AA0A8]">{TIER_HINTS[tier] ?? TIER_HINTS.STANDARD}</p>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Cowrie cost (1–10)
            </label>
            <div className="flex items-center gap-3 rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3.5 py-[11px]">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={cowrieCost}
                onChange={(e) => setCowrieCost(Number(e.target.value))}
                className="flex-1 accent-[#C75D2C]"
              />
              <span className="w-6 text-center text-[15px] font-bold text-[#15171C]">{cowrieCost}</span>
            </div>
          </div>
        </div>

        {/* Mature content toggle */}
        <div>
          <button
            type="button"
            onClick={() => setIsAdult((v) => !v)}
            className={`flex w-full items-center justify-between rounded-[9px] border px-3.5 py-3 transition-colors ${
              isAdult ? "border-[#A13A3A]/30 bg-[rgba(161,58,58,0.06)]" : "border-[rgba(20,22,26,0.12)] bg-white"
            }`}
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#15171C]">
              <ShieldAlert size={15} className={isAdult ? "text-[#A13A3A]" : "text-[#9AA0A8]"} />
              18+ mature content
            </span>
            <span
              className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
                isAdult ? "bg-[#A13A3A]" : "bg-[rgba(20,22,26,0.18)]"
              }`}
            >
              <span
                className={`absolute top-[2px] h-4 w-4 rounded-full bg-white transition-transform ${
                  isAdult ? "translate-x-[18px]" : "translate-x-[2px]"
                }`}
              />
            </span>
          </button>
          <p className="mt-1 text-[11px] text-[#9AA0A8]">
            Readers see an 18+ warning before opening this story, and a mature badge on its cover.
          </p>
        </div>

        {/* Cover upload / replace */}
        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
            Cover image
          </label>

          {coverPreviewUrl ? (
            <div className="relative overflow-hidden rounded-[8px] border border-[rgba(20,22,26,0.1)] bg-[#F8F9FB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreviewUrl}
                alt="Story cover preview"
                className="mx-auto max-h-[200px] object-contain"
              />
              <div className="flex items-center justify-between border-t border-[rgba(20,22,26,0.06)] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[12px] text-green-700">
                  <Check size={13} />
                  {status === "PUBLISHED" ? "Live cover — replace below" : "Cover uploaded"}
                </span>
                <label className="cursor-pointer rounded-[6px] px-2.5 py-1 text-[11px] font-medium text-[#C75D2C] hover:bg-[rgba(199,93,44,0.08)]">
                  {uploading ? "Uploading…" : "Replace"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-[8px] border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? "border-[#C75D2C] bg-[#FFF8F2]"
                  : "border-[rgba(20,22,26,0.15)] bg-[#F8F9FB] hover:border-[rgba(20,22,26,0.25)]"
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#C75D2C] border-t-transparent" />
                  <span className="text-[12px] text-[#7C828C]">Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[rgba(199,93,44,0.08)]">
                    <ImageIcon size={20} className="text-[#C75D2C]" />
                  </div>
                  <p className="mb-1 text-[13px] font-medium text-[#15171C]">
                    Drag &amp; drop a cover image here
                  </p>
                  <p className="mb-3 text-[11px] text-[#9AA0A8]">
                    PNG, JPG, or WebP &middot; recommended 3:4 portrait
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-[rgba(20,22,26,0.12)] bg-white px-3.5 py-2 text-[12px] font-medium text-[#15171C] hover:bg-[#F0F2F5]">
                    <Upload size={13} />
                    Browse files
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tag picker */}
        <div>
          <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Tags (pick 1 — or 2 only if the story truly spans two themes)
            </label>
            {selectedCategories.length > 0 && (
              <span className="text-[10px] text-[rgba(199,93,44,0.7)] sm:text-[11px]">
                {selectedCategories.length === 1 ? (
                  <>
                    Feed row: &ldquo;{selectedCategories[0].title}&rdquo;
                    {selectedCategories[0].tagSlugs.length > 1 && " (shared with related tags)"}
                  </>
                ) : (
                  <>
                    Appears in {selectedCategories.length} feed rows: {selectedCategories.map((c) => `"${c.title}"`).join(" & ")}
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const category = categoryForTag(tag.slug);
              const isActive = tagIds.includes(tag.id);
              const atLimit = !isActive && tagIds.length >= 2;
              return (
                <button
                  key={tag.slug}
                  type="button"
                  disabled={atLimit}
                  onClick={() => {
                    setTagIds((prev) => {
                      if (prev.includes(tag.id)) return prev.filter((id) => id !== tag.id);
                      if (prev.length >= 2) return prev;
                      return [...prev, tag.id];
                    });
                  }}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? "border-[#C75D2C] bg-[#C75D2C] text-white"
                      : atLimit
                      ? "cursor-not-allowed border-[rgba(20,22,26,0.08)] bg-[#F8F9FB] text-[#B0B5BD]"
                      : "border-[rgba(20,22,26,0.12)] bg-white text-[#15171C] hover:bg-[#F0F2F5]"
                  }`}
                  title={category.title}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save footer */}
        <div className="flex flex-col gap-3 border-t border-[rgba(20,22,26,0.08)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[#7C828C] sm:text-[12px]">
            {saved
              ? "Saved ✓ — changes are live now."
              : isValid
              ? status === "PUBLISHED"
                ? "Saving updates the feed and reader immediately."
                : "Saves directly to this story."
              : "Add a title, hook line, and 1–2 tags to save."}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/kekere/stories/all"
              className="text-[12px] font-medium text-[#7C828C] hover:text-[#15171C]"
            >
              ← All Stories
            </Link>
            <button
              type="button"
              disabled={!isValid || saving}
              onClick={handleSave}
              className="rounded-[9px] bg-[#C75D2C] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#B0531E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
