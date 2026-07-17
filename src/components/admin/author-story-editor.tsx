"use client";

import { useRef, useState, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Upload, ImageIcon, Check } from "lucide-react";
import { StoryEditor, type StoryEditorHandle } from "@/components/kekere/StoryEditor";
import { categoryForTag } from "@/content/story-tags";
import { formatRelativeTime } from "@/lib/tiptap/save-status";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";

interface TagItem {
  id: string;
  slug: string;
  label: string;
}

interface AuthorStoryEditorProps {
  writerId: string;
  writerName: string;
}

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

// Matches AdminTopBar's fixed h-[62px] (src/components/admin/admin-top-bar.tsx)
// — the editor's sticky toolbar reads this same CSS variable
// (StoryEditor.tsx) to stick just below the admin header instead of
// underneath it at top:0, where it'd be invisible behind a higher z-index bar.
const ADMIN_TOP_BAR_HEIGHT = "62px";

interface AdminDraft {
  title: string;
  hookLine: string;
  tier: string;
  cowrieCost: number;
  coverImageRef: string | null;
  coverPreviewUrl: string | null;
  tagIds: string[];
  body: TiptapDoc;
  savedAt: string;
}

function draftKey(writerId: string): string {
  return `kekere_admin_author_draft_${writerId}`;
}

function loadDraft(writerId: string): AdminDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(writerId));
    if (!raw) return null;
    return JSON.parse(raw) as AdminDraft;
  } catch {
    return null;
  }
}

function saveDraft(writerId: string, draft: Omit<AdminDraft, "savedAt">): string {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(draftKey(writerId), JSON.stringify({ ...draft, savedAt }));
  } catch {
    // Storage full/unavailable — non-fatal, matches StoryEditor's own handling.
  }
  return savedAt;
}

function clearDraft(writerId: string) {
  try {
    localStorage.removeItem(draftKey(writerId));
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

export function AuthorStoryEditor({ writerId, writerName }: AuthorStoryEditorProps) {
  const router = useRouter();
  const editorRef = useRef<StoryEditorHandle>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [title, setTitle] = useState("");
  const [hookLine, setHookLine] = useState("");
  const [tier, setTier] = useState<string>("STANDARD");
  const [cowrieCost, setCowrieCost] = useState(5);
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    tags: { slug: string; label: string; feedHeading: string }[];
    hookLine: string;
  } | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // Local draft persistence — this form has no server-side draft to save
  // against until "Save" is clicked (storyId doesn't exist yet), so work is
  // preserved in localStorage instead, keyed per writer. draftChecked gates
  // <StoryEditor>'s first render so a restored draft's body can be passed in
  // as its initialContent (which Tiptap only reads once, at mount) rather
  // than needing to be set imperatively after the fact.
  const [draftChecked, setDraftChecked] = useState(false);
  const [initialBody, setInitialBody] = useState<TiptapDoc | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftSavedAtLabel, setDraftSavedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kekere/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  // Restore any existing draft for this writer, once, before StoryEditor
  // ever mounts. Runs client-only (localStorage doesn't exist during SSR),
  // which is why this can't happen in a lazy useState initializer.
  useEffect(() => {
    const draft = loadDraft(writerId);
    if (draft) {
      setTitle(draft.title);
      setHookLine(draft.hookLine);
      setTier(draft.tier);
      setCowrieCost(draft.cowrieCost);
      setCoverImageRef(draft.coverImageRef);
      setCoverPreviewUrl(draft.coverPreviewUrl);
      setTagIds(draft.tagIds);
      setInitialBody(draft.body);
      setRestoredAt(draft.savedAt);
      setDraftSavedAt(draft.savedAt);
    }
    setDraftChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writerId]);

  // Keep the relative-time label ticking without re-saving anything.
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
    if (!draftChecked) return; // don't clobber a restore that hasn't applied yet
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const body = editorRef.current?.getContent() ?? initialBody ?? EMPTY_DOC;
      // A "blank" Tiptap doc still contains one empty paragraph node (the
      // schema requires at least one block), so checking body.content.length
      // alone is never actually zero — extract real text instead.
      const hasContent = title.trim() || hookLine.trim() || tagIds.length > 0 || coverImageRef || extractPlainText(body).trim().length > 0;
      if (!hasContent) return; // nothing worth remembering on a still-blank form
      const savedAt = saveDraft(writerId, {
        title,
        hookLine,
        tier,
        cowrieCost,
        coverImageRef,
        coverPreviewUrl,
        tagIds,
        body,
      });
      setDraftSavedAt(savedAt);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 1200);
  }, [draftChecked, writerId, title, hookLine, tier, cowrieCost, coverImageRef, coverPreviewUrl, tagIds, initialBody]);

  // Covers every field except the editor body (which has no onChange of its
  // own to hook — see onWordCountChange on <StoryEditor> below).
  useEffect(() => {
    scheduleDraftSave();
  }, [scheduleDraftSave]);

  // Best-effort immediate flush if the admin closes/navigates away inside
  // the 1.2s debounce window, so the last few keystrokes aren't lost.
  useEffect(() => {
    function flush() {
      clearTimeout(saveTimerRef.current);
      const body = editorRef.current?.getContent();
      if (!body) return;
      saveDraft(writerId, { title, hookLine, tier, cowrieCost, coverImageRef, coverPreviewUrl, tagIds, body });
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
  }, [writerId, title, hookLine, tier, cowrieCost, coverImageRef, coverPreviewUrl, tagIds]);

  function discardDraft() {
    if (!window.confirm("Discard this draft and start over? This can't be undone.")) return;
    clearDraft(writerId);
    setTitle("");
    setHookLine("");
    setTier("STANDARD");
    setCowrieCost(5);
    setCoverImageRef(null);
    setCoverPreviewUrl(null);
    setTagIds([]);
    setRestoredAt(null);
    setDraftSavedAt(null);
    editorRef.current?.setContent(EMPTY_DOC);
  }

  const selectedTagObjs = tagIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is TagItem => !!t);

  // The category title is what actually appears as the feed row heading —
  // for a tag grouped with others (e.g. dark/creepy/psychological) that's
  // a shared title, not the tag's own individual feedHeading. A story with
  // two tags that happen to share a category still only appears in one row;
  // two tags in different categories appear in both.
  const selectedCategories = Array.from(
    new Map(selectedTagObjs.map((t) => [categoryForTag(t.slug).slug, categoryForTag(t.slug)])).values()
  );

  const isValid =
    title.trim() &&
    hookLine.trim() &&
    tagIds.length >= 1 &&
    tagIds.length <= 2 &&
    cowrieCost >= 1 &&
    cowrieCost <= 10 &&
    !!coverImageRef;

  async function handleNariSuggest() {
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

    setSuggesting(true);
    setSuggestionError(null);
    setSuggestion(null);

    try {
      const res = await fetch("/api/admin/kekere/stories/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Untitled", body: plainText }),
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
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/kekere/cover-upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setCoverImageRef(data.coverImageRef ?? null);
        setCoverPreviewUrl(data.previewUrl ?? null);
      } else {
        // Previously failures were swallowed silently — the spinner just
        // stopped and nothing appeared, so the admin couldn't tell the cover
        // hadn't uploaded. Surface the real reason instead.
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
  }, []);

  async function handleSubmit() {
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      const bodyContent = editorRef.current?.getContent();
      if (!bodyContent) {
        setError("Story content is empty");
        setSubmitting(false);
        return;
      }

      // Genre is no longer a field admins fill in directly — tags are the
      // real categorization mechanism now. The story-creation API still
      // requires some genre string (it's rendered into the signed
      // publishing contract's "Genre:" line), so derive a reasonable one
      // from whichever tag was picked rather than asking for it twice.
      const derivedGenre = allTags.find((t) => t.id === tagIds[0])?.label ?? "Fiction";

      const res = await fetch(`/api/admin/kekere/writers/${writerId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hookLine: hookLine.trim(),
          body: bodyContent,
          tier,
          cowrieCost,
          genre: derivedGenre,
          coverColor: "#C75D2C",
          coverImageRef: coverImageRef ?? undefined,
          tagIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(data.error ?? "Failed to create story");
        setSubmitting(false);
        return;
      }

      clearDraft(writerId);
      router.push("/admin/kekere/writers/unclaimed");
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-3xl p-4 sm:p-6"
      style={{ "--writer-header-h": ADMIN_TOP_BAR_HEIGHT } as CSSProperties}
    >
      <div className="mb-6">
        <h1 className="text-[16px] font-bold text-[#15171C] sm:text-[18px]">
          Author a story for {writerName}
        </h1>
        <p className="mt-1 text-[12px] text-[#7C828C] sm:text-[13px]">
          This saves the story under {writerName}&rsquo;s account as PENDING_CONTRACT. Nothing is
          sent to the writer yet — after saving, use &ldquo;Send email&rdquo; in the Onboarded
          Writers list to invite them to review, sign, and go live.
        </p>
      </div>

      {restoredAt && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[8px] border border-[#E8C98C] bg-[#FBEFD9] px-4 py-3 text-[12.5px] text-[#5A4419]">
          <span>
            Restored your unsaved draft from {formatRelativeTime(restoredAt)} — nothing was lost.
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="flex-none rounded-[6px] border border-[rgba(90,68,25,0.3)] px-2.5 py-1 text-[11px] font-semibold hover:bg-[rgba(90,68,25,0.08)]"
          >
            Discard &amp; start over
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
              onClick={handleNariSuggest}
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
                onClick={() => setSuggestion(null)}
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

            <button
              type="button"
              onClick={applySuggestion}
              className="rounded-[7px] bg-[#1F4B4B] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#163838]"
            >
              Apply suggestions
            </button>
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
                storyId={writerId}
                initialContent={initialBody ?? EMPTY_DOC}
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
              <option value="PREMIUM">Premium</option>
            </select>
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

        {/* Cover upload */}
        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
            Cover image
          </label>

          {coverPreviewUrl ? (
            <div className="relative overflow-hidden rounded-[10px] border border-[rgba(20,22,26,0.1)] bg-[#F8F9FB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreviewUrl}
                alt="Story cover preview"
                className="mx-auto max-h-[200px] object-contain"
              />
              <div className="flex items-center justify-between border-t border-[rgba(20,22,26,0.06)] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[12px] text-green-700">
                  <Check size={13} />
                  Cover uploaded
                </span>
                <button
                  type="button"
                  onClick={() => { setCoverImageRef(null); setCoverPreviewUrl(null); }}
                  className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium text-[#7C828C] hover:bg-[rgba(20,22,26,0.06)] hover:text-[#15171C]"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-[10px] border-2 border-dashed p-8 text-center transition-colors ${
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

        {/* Category / tag picker */}
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

        {/* Submit footer */}
        <div className="flex flex-col gap-3 border-t border-[rgba(20,22,26,0.08)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[#7C828C] sm:text-[12px]">
            {isValid
              ? "Saves as PENDING_CONTRACT. Send the agreement email afterwards from Onboarded Writers."
              : "Add a title, hook line, cover image and at least one tag to continue."}
          </span>
          <button
            type="button"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
            className="w-full rounded-[9px] bg-[#C75D2C] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#B0531E] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
