"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Bookmark, BookmarkCheck } from "lucide-react";
import type { MockStory } from "@/content/mock/kekere-stories";

interface StoryPreviewSheetProps {
  story: MockStory | null;
  initialSaved?: boolean;
  onClose: () => void;
}

export function StoryPreviewSheet({
  story,
  initialSaved = false,
  onClose,
}: StoryPreviewSheetProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaved(initialSaved);
  }, [story?.id, initialSaved]);

  useEffect(() => {
    if (!story) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [story]);

  if (!story) return null;

  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      if (saved) {
        await fetch(`/api/kekere/saved/${story!.id}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch("/api/kekere/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: story!.id }),
        });
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  function readNow() {
    onClose();
    router.push(`/kekere/story/${story!.id}`);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[24px] bg-[var(--color-bg)] shadow-[0_-20px_60px_-10px_rgba(42,26,18,0.5)]">
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-[3px] w-10 rounded-full bg-[rgba(42,26,18,0.18)]" />
        </div>

        {/* Cover */}
        <div className="relative mx-4 mt-2 overflow-hidden rounded-[18px]" style={{ aspectRatio: "16/9" }}>
          <div
            className="absolute inset-0"
            style={{
              background: story.coverImageUrl
                ? undefined
                : "radial-gradient(circle at 30% 30%,#E2A565,#C75D2C 45%,#7A3415)",
              backgroundColor: story.coverColor ?? "#1A0A14",
            }}
          />
          {story.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}

          {/* Dark gradient overlay so title is always readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.88)] via-[rgba(0,0,0,0.25)] to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(0,0,0,0.45)] backdrop-blur-sm"
          >
            <X size={14} className="text-white" />
          </button>

          {/* Title + author */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-[1.15] text-white drop-shadow-sm">
              {story.title}
            </h2>
            <p className="mt-[5px] text-[13px] text-[rgba(255,255,255,0.7)]">
              by {story.authorName}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pb-10 pt-5">
          <p className="text-[15px] italic leading-[1.6] text-[var(--color-ink-muted)]">
            &ldquo;{story.hookLine}&rdquo;
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-ink-muted-2)]">
            <span className="flex items-center gap-[4px] font-semibold text-[var(--color-primary)]">
              <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
                <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
                <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
              </svg>
              {story.cowrieCost}
            </span>
            <span>·</span>
            <span>{story.readingTimeMinutes} min read</span>
            {story.completionRate > 0 && (
              <>
                <span>·</span>
                <span>{Math.round(story.completionRate)}% finish</span>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={toggleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-[6px] rounded-[14px] border-2 border-[rgba(42,26,18,0.15)] bg-transparent py-[13px] text-[14px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[rgba(42,26,18,0.3)] disabled:opacity-60"
            >
              {saved ? (
                <BookmarkCheck size={15} className="text-[var(--color-primary)]" />
              ) : (
                <Bookmark size={15} />
              )}
              {saved ? "Saved" : "Save for later"}
            </button>

            <button
              onClick={readNow}
              className="flex flex-1 items-center justify-center rounded-[14px] bg-[var(--color-primary)] py-[13px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              Read now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
