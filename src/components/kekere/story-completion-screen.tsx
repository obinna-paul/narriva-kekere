"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star, Send, Copy, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CompletionProps {
  storyId: string;
  storyTitle: string;
  authorName: string;
  spendingBalance: number;
  tipSent: boolean;
  onTip: () => Promise<void>;
  rating: number;
  onRate: (r: number) => Promise<void>;
  referralCode: string | null;
}

export function StoryCompletionScreen({ storyId, storyTitle, authorName, spendingBalance, tipSent, onTip, rating, onRate, referralCode }: CompletionProps) {
  const [tipping, setTipping] = useState(false);
  const [tipped, setTipped] = useState(tipSent);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittedRating, setSubmittedRating] = useState(rating);
  const [shareCopied, setShareCopied] = useState(false);

  const shareUrl = referralCode
    ? `https://kekere.narriva.com/invite/${referralCode}`
    : `https://kekere.narriva.com/story/${storyId}`;
  const shareText = `I just read "${storyTitle}" on Kekere Stories. Check it out: ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleTip() {
    setTipping(true);
    try {
      await onTip();
      setTipped(true);
    } catch {}
    setTipping(false);
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
        <p className="mt-1.5 text-[14px] text-[#8A7565]">by {authorName}</p>
      </div>

      {/* Completion bonus */}
      <div className="mt-6 rounded-[16px] bg-[#1F8A5B]/10 px-4 py-4 flex items-center gap-3">
        <div className="flex h-[36px] w-[36px] flex-none items-center justify-center rounded-full bg-[#1F8A5B]/20">
          <span className="text-[18px]">+1</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[#176E48]">Completion bonus</div>
          <div className="text-[12px] text-[#1F8A5B]/70">You earned 1 cowrie for finishing</div>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-5 rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4">
        <p className="text-[13px] font-medium text-[#2A1A12] mb-3">Rate this story</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" disabled={submittedRating > 0} onClick={() => { setSubmittedRating(s); onRate(s); }} onMouseEnter={() => !submittedRating && setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}>
              <Star size={28} className={cn("transition-colors", (hoverRating || submittedRating) >= s ? "fill-[#E9A56B] text-[#E9A56B]" : "text-[rgba(42,26,18,0.12)]")} />
            </button>
          ))}
        </div>
      </div>

      {/* Tip section */}
      <div className="mt-[14px] rounded-[16px] bg-[#2A1A12] px-4 py-4">
        <p className="text-[13px] font-medium text-white/80">Tip {authorName}</p>
        <div className="mt-1 text-[12px] text-[#A08C7C]">Balance: {spendingBalance} cowries</div>
        {tipped ? (
          <div className="mt-3 flex items-center gap-2 text-[#1F8A5B]">
            <Check size={16} /> <span className="text-[13px] font-medium">You've already tipped this story</span>
          </div>
        ) : spendingBalance === 0 ? (
          <Link href="/kekere/wallet" className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[#E9A56B] hover:underline">Top up to tip <span className="text-[#A08C7C]">—</span></Link>
        ) : (
          <button type="button" disabled={tipping} onClick={handleTip} className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#C75D2C] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <Send size={14} /> Send tip · 1 cowrie
          </button>
        )}
      </div>

      {/* Share */}
      <div className="mt-[14px] flex gap-3">
        <button type="button" onClick={handleCopy} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white py-3 text-[13px] font-medium text-[#2A1A12] transition-colors hover:border-[#C75D2C]/30">
          {shareCopied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
        </button>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
          <MessageCircle size={15} /> WhatsApp
        </a>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#A08C7C]">Links carry your referral code — earn 3 cowries when they unlock their first story</p>

      <Link href="/kekere/feed" className="mt-6 flex w-full items-center justify-center rounded-[13px] bg-[#C75D2C] py-3.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90">
        Back to feed
      </Link>
    </div>
  );
}
