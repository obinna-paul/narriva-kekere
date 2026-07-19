"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star, Send, Copy, MessageCircle, PenLine, MapPin, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AuthorChip } from "@/components/kekere/author-chip";
import { FollowButton } from "@/components/kekere/follow-button";

interface CompletionProps {
  storyId: string;
  storyTitle: string;
  authorId: string;
  authorName: string;
  authorAvatarColor: string | null;
  /** Already a full CDN URL — see toFeedStoryData / kekere-writer-profile.ts. */
  authorAvatarUrl: string | null;
  authorBio: string | null;
  authorCountry: string | null;
  spendingBalance: number;
  tipCount: number;
  rating: number;
  referralCode: string | null;
  initialFollowing: boolean;
  isOwnStory: boolean;
  /** Server-computed: finished the story, writer accepts notes, no note
   * already sent for this story, and the writer hasn't blocked this reader. */
  noteEligible: boolean;
}

export function StoryCompletionScreen({
  storyId,
  storyTitle,
  authorId,
  authorName,
  authorAvatarColor,
  authorAvatarUrl,
  authorBio,
  authorCountry,
  spendingBalance: initialBalance,
  tipCount: initialTipCount,
  rating,
  referralCode,
  initialFollowing,
  isOwnStory,
  noteEligible,
}: CompletionProps) {
  const [tipping, setTipping] = useState(false);
  const [tipCount, setTipCount] = useState(initialTipCount);
  const [balance, setBalance] = useState(initialBalance);
  const [confirmingRetip, setConfirmingRetip] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittedRating, setSubmittedRating] = useState(rating);
  const [shareCopied, setShareCopied] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "?";
  const authorColor = authorAvatarColor ?? "#C75D2C";

  const shareUrl = referralCode
    ? `https://narriva.pro/kekere/invite/${referralCode}`
    : `https://narriva.pro/kekere/story/${storyId}`;
  const shareText = `I just read "${storyTitle}" on Kekere Stories. Check it out: ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  function handleTipClick() {
    if (tipCount > 0) {
      setConfirmingRetip(true);
      return;
    }
    void doTip();
  }

  async function doTip() {
    setTipping(true);
    setTipError(null);
    try {
      const res = await fetch(`/api/kekere/stories/${storyId}/tip`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTipError(data.error === "insufficient_balance" ? "Not enough cowries to tip." : "Couldn't send tip — try again.");
        return;
      }
      setTipCount((c) => c + 1);
      setBalance(data.balance);
      setConfirmingRetip(false);
    } catch {
      setTipError("Couldn't send tip — try again.");
    } finally {
      setTipping(false);
    }
  }

  async function handleRate(r: number) {
    setSubmittedRating(r);
    try {
      await fetch(`/api/kekere/stories/${storyId}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: r }),
      });
    } catch {}
  }

  async function handleSendNote() {
    setNoteSending(true);
    setNoteError(null);
    try {
      const res = await fetch("/api/kekere/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, body: noteBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const messages: Record<string, string> = {
          profanity: "Please remove inappropriate language and try again.",
          too_long: "That's a bit long — keep it under 500 characters.",
          empty: "Write something before sending.",
          already_sent: "You've already sent a note for this story.",
        };
        setNoteError(messages[data.error] ?? "Couldn't send your note — try again.");
        return;
      }
      setNoteSent(true);
    } catch {
      setNoteError("Couldn't send your note — try again.");
    } finally {
      setNoteSending(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareText).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-[402px] px-[22px] pb-[80px] pt-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#C75D2C]">You finished it</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold text-[#2A1A12] leading-[1.15]">{storyTitle}</h1>
        {/* Just a light byline here — the full follow/profile treatment lives
            in the "Meet the writer" card below, so the header stays a clean
            celebration of what they just finished rather than a cramped
            avatar-name-button cluster. */}
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-[#A08C7C]">
          <span>by</span>
          <AuthorChip authorId={authorId} authorName={authorName} avatarColor={authorAvatarColor} avatarUrl={authorAvatarUrl} size="sm" />
        </div>
      </div>

      {/* Rating */}
      <div className="mt-6 rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4 text-center">
        <p className="mb-3 text-[13px] font-medium text-[#2A1A12]">
          {submittedRating > 0 ? "Thanks for rating" : "Rate this story"}
        </p>
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" disabled={submittedRating > 0} onClick={() => handleRate(s)} onMouseEnter={() => !submittedRating && setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}>
              <Star size={28} className={cn("transition-colors", (hoverRating || submittedRating) >= s ? "fill-[#E9A56B] text-[#E9A56B]" : "text-[rgba(42,26,18,0.12)]")} />
            </button>
          ))}
        </div>
      </div>

      {/* Meet the writer — a self-contained profile snippet so the person
          behind the story reads as a person, not just another byline. Ringed
          avatar matches the real writer-profile page; the whole header taps
          through, and the action row gives Follow real prominence. */}
      <div className="mt-7">
        <h2 className="mb-2.5 px-0.5 text-[13px] font-semibold text-[#2A1A12]">Meet the writer</h2>
        <div className="rounded-[18px] border border-[rgba(42,26,18,0.08)] bg-white p-[18px] shadow-[0_12px_32px_-22px_rgba(42,26,18,0.55)]">
          <Link href={`/kekere/writer/${authorId}`} className="group flex items-center gap-3.5">
            <div
              className="flex h-[58px] w-[58px] flex-none items-center justify-center overflow-hidden rounded-full p-[3px]"
              style={{ background: authorColor }}
            >
              <div
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-[family-name:var(--font-display)] text-[22px] font-semibold text-white"
                style={{ background: `linear-gradient(135deg, #E08A4A, ${authorColor})` }}
              >
                {authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  authorInitial
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-[family-name:var(--font-display)] text-[19px] font-semibold leading-tight text-[#2A1A12] transition-colors group-hover:text-[#C75D2C]">
                {authorName}
              </span>
              {authorCountry && (
                <span className="mt-1 flex items-center gap-1 text-[12.5px] text-[#A08C7C]">
                  <MapPin size={12} className="flex-none" /> Writer from {authorCountry}
                </span>
              )}
            </div>
          </Link>

          {authorBio && (
            <p className="mt-3.5 text-[13.5px] leading-[1.55] text-[#6B5744]">{authorBio}</p>
          )}

          <div className="mt-4 flex items-center gap-2.5">
            {!isOwnStory && (
              <FollowButton
                writerId={authorId}
                isLoggedIn
                initialFollowing={initialFollowing}
                variant="full"
                className="flex-1"
              />
            )}
            <Link
              href={`/kekere/writer/${authorId}`}
              className={cn(
                "flex items-center justify-center gap-1 rounded-full border border-[rgba(42,26,18,0.16)] px-5 py-[10px] text-sm font-semibold text-[#2A1A12] transition-colors hover:border-[#C75D2C]/40 hover:text-[#C75D2C]",
                isOwnStory && "flex-1",
              )}
            >
              View profile <ArrowUpRight size={15} className="flex-none" />
            </Link>
          </div>
        </div>
      </div>

      {/* Note to writer */}
      {noteEligible && (
        <div className="mt-[14px] rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4">
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-[#2A1A12]">
            <PenLine size={14} className="text-[#C75D2C]" /> Send a note to {authorName}
          </p>
          {noteSent ? (
            <p className="flex items-center gap-1.5 text-[13px] text-[#1F8A5B]">
              <Check size={14} /> Sent — {authorName} will see it next time they check Kekere.
            </p>
          ) : (
            <>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell them what stuck with you…"
                disabled={noteSending}
                className="w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.14)] px-3 py-2.5 text-[13.5px] text-[#2A1A12] transition-colors focus:border-[#C75D2C] focus:outline-none disabled:opacity-60"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#A08C7C]">{noteBody.length} / 500</span>
                <button
                  type="button"
                  onClick={handleSendNote}
                  disabled={noteSending || !noteBody.trim()}
                  className="flex items-center gap-1.5 rounded-[10px] bg-[#C75D2C] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Send size={13} /> {noteSending ? "Sending…" : "Send note"}
                </button>
              </div>
              {noteError && <p className="mt-2 text-[12px] text-[#A13A3A]">{noteError}</p>}
            </>
          )}
        </div>
      )}

      {/* Tip section */}
      <div className="mt-[14px] rounded-[16px] bg-[#2A1A12] px-4 py-4 text-center">
        <p className="text-[13px] font-medium text-white/80">Tip {authorName}</p>
        <div className="mt-1 text-[12px] text-[#A08C7C]">Balance: {balance} cowries</div>
        {tipCount > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[#1F8A5B]">
            <Check size={14} /> <span className="text-[12px] font-medium">Tipped {tipCount} time{tipCount === 1 ? "" : "s"}</span>
          </div>
        )}
        {tipError && <p className="mt-2 text-[12px] text-[#E9A56B]">{tipError}</p>}
        {balance === 0 ? (
          <Link href="/kekere/wallet" className="mt-3 inline-flex items-center justify-center gap-2 text-[13px] font-medium text-[#E9A56B] hover:underline">Top up to tip <span className="text-[#A08C7C]">—</span></Link>
        ) : confirmingRetip ? (
          <div className="mt-3">
            <p className="text-[13px] text-white/90">Tip {authorName} again for 1 cowrie?</p>
            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmingRetip(false)}
                disabled={tipping}
                className="rounded-[10px] border border-white/20 px-4 py-2 text-[13px] font-medium text-white/80 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doTip}
                disabled={tipping}
                className="rounded-[10px] bg-[#C75D2C] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {tipping ? "Sending…" : "Yes, tip again"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={tipping} onClick={handleTipClick} className="mx-auto mt-3 flex items-center gap-2 rounded-[10px] bg-[#C75D2C] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <Send size={14} /> {tipCount === 0 ? "Send tip · 1 cowrie" : "Tip again · 1 cowrie"}
          </button>
        )}
      </div>

      {/* Share */}
      <div className="mt-7">
        <h2 className="mb-2.5 px-0.5 text-[13px] font-semibold text-[#2A1A12]">Share this story</h2>
        <div className="flex gap-3">
          <button type="button" onClick={handleCopy} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white py-3 text-[13px] font-medium text-[#2A1A12] transition-colors hover:border-[#C75D2C]/30">
            {shareCopied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
          </button>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>
        {referralCode && (
          <p className="mt-2 text-center text-[11px] text-[#A08C7C]">
            Your invite link is attached — earn 3 cowries when someone new to Kekere joins through it and buys their first cowries.
          </p>
        )}
      </div>

      <Link href="/kekere/feed" className="mt-6 flex w-full items-center justify-center rounded-[13px] bg-[#C75D2C] py-3.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90">
        Back to feed
      </Link>
    </div>
  );
}
