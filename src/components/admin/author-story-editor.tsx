"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { StoryEditor, type StoryEditorHandle } from "@/components/kekere/StoryEditor";
import { STORY_TAGS, TAG_BY_SLUG } from "@/content/story-tags";
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

  const [title, setTitle] = useState("");
  const [hookLine, setHookLine] = useState("");
  const [tier, setTier] = useState<string>("STANDARD");
  const [cowrieCost, setCowrieCost] = useState(5);
  const [genre, setGenre] = useState("Drama");
  const [coverColor, setCoverColor] = useState("#C75D2C");
  const [coverImageRef, setCoverImageRef] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    tagSlug: string;
    tagLabel: string;
    tagFeedHeading: string;
    hookLine: string;
  } | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kekere/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  const selectedTagSlug = tagIds.length === 1
    ? allTags.find((t) => t.id === tagIds[0])?.slug ?? null
    : null;

  const selectedTagInfo = selectedTagSlug ? TAG_BY_SLUG[selectedTagSlug] : null;

  const isValid = title.trim() && hookLine.trim() && tagIds.length >= 1 && cowrieCost >= 1 && cowrieCost <= 10;

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

      if (data.suggestedTag || data.suggestedHookLine) {
        setSuggestion({
          tagSlug: data.suggestedTag?.slug ?? "",
          tagLabel: data.suggestedTag?.label ?? "",
          tagFeedHeading: data.suggestedTag?.feedHeading ?? "",
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

    if (suggestion.tagSlug) {
      const dbTag = allTags.find((t) => t.slug === suggestion.tagSlug);
      if (dbTag) {
        setTagIds([dbTag.id]);
      }
    }

    setSuggestion(null);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
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
      }
    } catch {
      setError("Cover upload failed");
    } finally {
      setUploading(false);
    }
  }

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

      const res = await fetch(`/api/admin/kekere/writers/${writerId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hookLine: hookLine.trim(),
          body: bodyContent,
          tier,
          cowrieCost,
          genre,
          coverColor,
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

      router.push("/admin/kekere/writers/unclaimed");
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold text-[#15171C]">
          Author a story for {writerName}
        </h1>
        <p className="mt-1 text-[13px] text-[#7C828C]">
          This story will be created under {writerName}&rsquo;s account with a
          PENDING_CONTRACT status. They&rsquo;ll receive an email with the
          publishing agreement and a claim link.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
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

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Hook line
            </label>
            <button
              type="button"
              onClick={handleNariSuggest}
              disabled={suggesting || !title.trim()}
              className="inline-flex items-center gap-1 rounded-[7px] border border-[rgba(199,93,44,0.3)] bg-[#FFF8F2] px-2.5 py-1 text-[11px] font-semibold text-[#C75D2C] hover:bg-[#FFEDDD] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={12} />
              {suggesting ? "Nari is reading..." : "Nari suggest"}
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

            {suggestion.tagSlug && (
              <div className="mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[rgba(31,75,75,0.55)]">
                  Suggested category &amp; row
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full border border-[rgba(31,75,75,0.2)] bg-white px-2.5 py-0.5 text-[12px] font-medium text-[#1F4B4B]">
                    {suggestion.tagLabel}
                  </span>
                  <span className="text-[12px] text-[rgba(31,75,75,0.6)]">
                    &rarr; feed row: &ldquo;{suggestion.tagFeedHeading}&rdquo;
                  </span>
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

        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
            Story content
          </label>
          <div className="rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white p-4">
            <StoryEditor
              ref={editorRef}
              storyId={writerId}
              initialContent={EMPTY_DOC}
              initialLastSavedAt={null}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
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
              Cowrie cost
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={cowrieCost}
              onChange={(e) => setCowrieCost(Number(e.target.value))}
              className="w-full rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3.5 py-2.5 text-[14px] text-[#15171C] focus:border-[#C75D2C] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Genre
            </label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-[9px] border border-[rgba(20,22,26,0.12)] bg-white px-3.5 py-2.5 text-[14px] text-[#15171C] focus:border-[#C75D2C] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
            Cover colour
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={coverColor}
              onChange={(e) => setCoverColor(e.target.value)}
              className="h-[38px] w-[38px] cursor-pointer rounded-[7px] border border-[rgba(20,22,26,0.12)]"
            />
            <span className="text-[13px] text-[#7C828C]">{coverColor}</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
            Cover image (Cloudinary)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleCoverUpload}
            className="text-[13px] text-[#7C828C] file:mr-3 file:rounded-[7px] file:border-0 file:bg-[#F0F2F5] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[#15171C] hover:file:bg-[#E4E7EB]"
          />
          {uploading && <span className="mt-1 text-[12px] text-[#7C828C]">Uploading...</span>}
          {coverImageRef && (
            <span className="mt-1 text-[12px] text-green-700">Cover uploaded</span>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#7C828C]">
              Category (select one)
            </label>
            {selectedTagInfo && (
              <span className="text-[11px] text-[rgba(199,93,44,0.7)]">
                Feed row: &ldquo;{selectedTagInfo.feedHeading}&rdquo;
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const info = TAG_BY_SLUG[tag.slug];
              const isActive = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => setTagIds([tag.id])}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? "border-[#C75D2C] bg-[#C75D2C] text-white"
                      : "border-[rgba(20,22,26,0.12)] bg-white text-[#15171C] hover:bg-[#F0F2F5]"
                  }`}
                  title={info?.feedHeading ?? ""}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[rgba(20,22,26,0.08)] pt-5">
          <span className="text-[12px] text-[#7C828C]">
            Story will be set to PENDING_CONTRACT — the writer must claim and sign to go live.
          </span>
          <button
            type="button"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
            className="rounded-[9px] bg-[#C75D2C] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#B0531E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Save & send agreement"}
          </button>
        </div>
      </div>
    </div>
  );
}
