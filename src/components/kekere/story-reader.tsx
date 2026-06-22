"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bookmark, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { WatermarkOverlay } from "@/components/kekere/watermark-overlay";
import { UnlockModal } from "@/components/kekere/unlock-modal";
import { renderSimpleMarkdown } from "@/lib/utils/markdown";
import type { MockStory } from "@/content/mock/kekere-stories";

export interface StoryReaderProps {
  /** story.paragraphs is ALREADY the right text for this viewer (full body
   * if unlocked, server-truncated preview otherwise) — see
   * getStoryForReader / toReaderStoryData. Never re-truncate it here. */
  story: MockStory;
  isLoggedIn: boolean;
  /** Only set when isLoggedIn — watermarking anonymous traffic isn't meaningful. */
  userEmail?: string;
  initialUnlocked: boolean;
  initialBalance: number;
  initialSaved: boolean;
}

export function StoryReader({
  story,
  isLoggedIn,
  userEmail,
  initialUnlocked,
  initialBalance,
  initialSaved,
}: StoryReaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [balance, setBalance] = useState(initialBalance);
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [savePending, setSavePending] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  function requireLogin() {
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  function openUnlockModal() {
    if (!isLoggedIn) return requireLogin();
    setUnlockError(null);
    setModalOpen(true);
  }

  async function handleUnlock() {
    const res = await fetch(`/api/kekere/stories/${story.id}/unlock`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.error === "insufficient_balance") {
        setBalance(data.balance);
        setUnlockError(data.message);
      } else {
        setUnlockError("Something went wrong unlocking this story. Try again.");
      }
      return;
    }

    setBalance(data.balance);
    setUnlocked(true);
    setModalOpen(false);
    // The server only sends full body to unlocked requesters — refresh so
    // this Server Component re-fetches it now that the unlock is recorded.
    router.refresh();
  }

  async function toggleSave() {
    if (!isLoggedIn) return requireLogin();
    setSavePending(true);
    const nextSaved = !saved;
    setSaved(nextSaved);

    const res = nextSaved
      ? await fetch("/api/kekere/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: story.id }),
        })
      : await fetch(`/api/kekere/saved/${story.id}`, { method: "DELETE" });

    setSavePending(false);
    if (!res.ok) setSaved(!nextSaved); // revert on failure
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently no-op, nothing to recover from.
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-ink)]/10 bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/kekere/feed"
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)]/70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Feed
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSave}
            disabled={savePending}
            aria-pressed={saved}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
              saved
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-ink)]/[0.06] text-[var(--color-ink)]/70"
            )}
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-ink)]/[0.06] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)]/70"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            {shareCopied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>

      <article className="relative mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-primary)]">
          {story.genre}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">
          {story.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink)]/60">
          By {story.authorName} · {story.readingTimeMinutes} min read
        </p>

        <div
          className="relative mt-8 select-none text-lg leading-relaxed text-[var(--color-ink)]"
          style={{ userSelect: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isLoggedIn && userEmail && <WatermarkOverlay email={userEmail} />}

          {unlocked ? (
            <div className="relative flex flex-col gap-5">
              {renderSimpleMarkdown(story.paragraphs.join("\n\n"))}
            </div>
          ) : (
            <div className="relative">
              <p>{story.paragraphs.join(" ")}</p>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
            </div>
          )}
        </div>

        {!unlocked && (
          <div className="relative mt-2 flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={openUnlockModal}
              className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}
            >
              Unlock for {story.cowrieCost} cowries
            </button>
            {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}
          </div>
        )}
      </article>

      <UnlockModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        storyTitle={story.title}
        cowrieCost={story.cowrieCost}
        balance={balance}
        onUnlock={handleUnlock}
      />
    </div>
  );
}
