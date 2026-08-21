"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Bookmark, BookmarkCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthorChip } from "@/components/kekere/author-chip";
import { MatureBadge } from "@/components/kekere/MatureBadge";
import { LonglistBadge } from "@/components/kekere/LonglistBadge";
import { TopUpModal } from "@/components/kekere/top-up-modal";
import type { MockStory } from "@/content/mock/kekere-stories";

interface StoryPreviewSheetProps {
  story: MockStory | null;
  initialSaved?: boolean;
  balance?: number;
  isLoggedIn?: boolean;
  /** Reader id + email — only used to open the in-context top-up modal when
   *  they're short on cowries. Null when logged out (falls back to the
   *  plain wallet link). */
  viewerId?: string | null;
  viewerEmail?: string | null;
  /** The reader's referral code — presence enables the "invite a friend"
   *  alternative on the paywall. */
  referralCode?: string | null;
  onClose: () => void;
}

type Step = "preview" | "unlock";

function CowrieDot() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
      <path d="M12 5 Q13.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.1" fill="none" />
    </svg>
  );
}

export function StoryPreviewSheet({
  story,
  initialSaved = false,
  balance = 0,
  isLoggedIn = false,
  viewerId = null,
  viewerEmail = null,
  referralCode = null,
  onClose,
}: StoryPreviewSheetProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("preview");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);

  // Reset to preview when a different story is opened
  useEffect(() => {
    setSaved(initialSaved);
    setStep("preview");
    setUnlockError(null);
    setShowTopUp(false);
  }, [story?.id, initialSaved]);

  useEffect(() => {
    if (!story) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [story]);

  if (!story) return null;

  const canAfford = balance >= story.cowrieCost;

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

  function handleReadNow() {
    if (!isLoggedIn) {
      onClose();
      router.push(`/login?callbackUrl=${encodeURIComponent(`/kekere/story/${story!.slug ?? story!.id}`)}`);
      return;
    }
    // Navigate directly — the story page handles unlock, paywall, and admin access
    onClose();
    router.push(`/kekere/story/${story!.slug ?? story!.id}`);
  }

  async function handleUnlock() {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/kekere/stories/${story!.id}/unlock`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnlockError(data.message ?? "Something went wrong. Try again.");
        return;
      }
      // Unlocked — navigate to full story
      onClose();
      router.push(`/kekere/story/${story!.slug ?? story!.id}`);
    } finally {
      setUnlocking(false);
    }
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
          <div className="h-[3px] w-10 rounded-full bg-[var(--color-ink)]/[0.18]" />
        </div>

        {step === "preview" ? (
          <>
            {/* Cover */}
            <div className="relative mx-4 mt-2 overflow-hidden rounded-[12px]" style={{ aspectRatio: "16/9" }}>
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
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.88)] via-[rgba(0,0,0,0.25)] to-transparent" />
              {(story.isAdult || story.isLonglisted) && (
                <span className="absolute left-3 top-3 flex flex-col items-start gap-1">
                  {story.isAdult && <MatureBadge />}
                  {story.isLonglisted && <LonglistBadge />}
                </span>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(0,0,0,0.45)] backdrop-blur-sm"
              >
                <X size={14} className="text-white" />
              </button>
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
                  className="flex flex-1 items-center justify-center gap-[6px] rounded-[14px] border-2 border-[var(--color-ink)]/15 bg-transparent py-[13px] text-[14px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]/30 disabled:opacity-60"
                >
                  {saved ? (
                    <BookmarkCheck size={15} className="text-[var(--color-primary)]" />
                  ) : (
                    <Bookmark size={15} />
                  )}
                  {saved ? "Saved" : "Save for later"}
                </button>

                <button
                  onClick={handleReadNow}
                  className="flex flex-1 items-center justify-center rounded-[14px] bg-[var(--color-primary)] py-[13px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
                >
                  Read now
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Unlock / Top-up step ── */
          <div className="px-5 pb-10 pt-4">
            <button
              onClick={() => { setStep("preview"); setUnlockError(null); }}
              className="mb-5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <ArrowLeft size={14} /> Back
            </button>

            <h3 className="font-[family-name:var(--font-display)] text-[20px] font-semibold leading-[1.2] text-[var(--color-ink)]">
              {story.title}
            </h3>
            <div className="mt-1.5">
              <AuthorChip
                authorId={story.authorId}
                authorName={story.authorName}
                avatarColor={story.authorAvatarColor}
                avatarUrl={story.authorAvatarUrl}
                size="sm"
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_36px_-16px_rgba(42,26,18,0.28)]">
              {/* Balance / cost ledger */}
              <div className="px-5 pt-5">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-[var(--color-ink-muted)]">Your balance</span>
                  <span className="flex items-center gap-[5px] font-semibold text-[var(--color-ink)]">
                    <CowrieDot />
                    {balance} {balance === 1 ? "cowrie" : "cowries"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[13.5px]">
                  <span className="text-[var(--color-ink-muted)]">Story cost</span>
                  <span className="flex items-center gap-[5px] font-semibold text-[var(--color-primary)]">
                    <CowrieDot />
                    {story.cowrieCost} {story.cowrieCost === 1 ? "cowrie" : "cowries"}
                  </span>
                </div>
              </div>

              {canAfford ? (
                <div className="px-5 pb-5 pt-5">
                  <button
                    type="button"
                    disabled={unlocking}
                    onClick={handleUnlock}
                    className="w-full rounded-[12px] bg-[var(--color-primary)] py-[15px] text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(199,93,44,0.5)] transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
                  >
                    {unlocking ? "Unlocking…" : `Unlock for ${story.cowrieCost} ${story.cowrieCost === 1 ? "cowrie" : "cowries"}`}
                  </button>
                  {unlockError && (
                    <p className="mt-3 text-center text-[13px] text-red-600">{unlockError}</p>
                  )}
                </div>
              ) : (
                <div className="mt-5 border-t border-[var(--color-border)] bg-[var(--color-primary)]/[0.05] px-5 pb-5 pt-4">
                  <p className="text-center text-[13.5px] font-semibold text-[var(--color-ink)]">
                    You&apos;re {story.cowrieCost - balance}{" "}
                    {story.cowrieCost - balance === 1 ? "cowrie" : "cowries"} away
                  </p>
                  <p className="mx-auto mt-1 max-w-[260px] text-center text-[12.5px] leading-[1.5] text-[var(--color-ink-muted)]">
                    Top up to unlock this story — a little goes a long way, and most of it reaches the
                    writer.
                  </p>

                  {viewerId && viewerEmail ? (
                    <button
                      type="button"
                      onClick={() => setShowTopUp(true)}
                      className="mt-4 w-full rounded-[12px] bg-[var(--color-primary)] py-[15px] text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(199,93,44,0.5)] transition-colors hover:bg-[var(--color-primary-light)]"
                    >
                      Top up to unlock
                    </button>
                  ) : (
                    <Link
                      href="/kekere/wallet"
                      onClick={onClose}
                      className="mt-4 block rounded-[12px] bg-[var(--color-primary)] py-[15px] text-center text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
                    >
                      Top up cowries
                    </Link>
                  )}

                  {referralCode && (
                    <Link
                      href="/kekere/invite"
                      onClick={onClose}
                      className="mt-3 block text-center text-[13px] font-medium text-[var(--color-primary)] hover:underline"
                    >
                      or invite a friend and earn 3 cowries →
                    </Link>
                  )}

                  {unlockError && (
                    <p className="mt-3 text-center text-[13px] text-red-600">{unlockError}</p>
                  )}
                </div>
              )}
            </div>

            <p className="mt-3 text-center text-[11.5px] text-[var(--color-ink-muted-3)]">
              Every unlock supports the writer directly.
            </p>
          </div>
        )}
      </div>

      {showTopUp && viewerId && viewerEmail && (
        <TopUpModal
          userId={viewerId}
          userEmail={viewerEmail}
          initialPackageIndex={0}
          elevated
          context={{ storyTitle: story.title, needed: story.cowrieCost - balance }}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => {
            setShowTopUp(false);
            // Refresh so the new balance flows into this sheet's `balance`
            // prop; the panel then flips to an enabled "Unlock" button while
            // the sheet stays open on the unlock step. One deliberate tap to
            // spend, rather than auto-spending their fresh cowries.
            router.refresh();
          }}
        />
      )}
    </>
  );
}
