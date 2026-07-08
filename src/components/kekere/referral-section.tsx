"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ReferralStats {
  code: string | null;
  shareUrl: string | null;
  totalReferrals: number;
  rewardedReferrals: number;
  totalCowriesEarned: number;
  referrals: Array<{
    referredAt: string;
    status: string;
    rewardStatus: string;
    referredUserName: string;
  }>;
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

async function copyToClipboard(
  text: string,
  setCopied: (v: boolean) => void,
  setFailed: (v: boolean) => void
) {
  try {
    await navigator.clipboard.writeText(text);
    setFailed(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    return;
  } catch {
    // Some in-app/webview browsers restrict the async clipboard API — fall
    // back to the older execCommand approach before giving up.
  }
  if (legacyCopy(text)) {
    setFailed(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } else {
    setFailed(true);
    setTimeout(() => setFailed(false), 3000);
  }
}

export function ReferralSection({ stats }: { stats: ReferralStats }) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeCopyFailed, setCodeCopyFailed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkCopyFailed, setLinkCopyFailed] = useState(false);
  const whatsappMessage = stats.shareUrl
    ? `Hi! Let me plug you to Kekere Stories where I read the best short fiction: ${stats.shareUrl}`
    : "";

  return (
    <div className="mx-auto max-w-[402px] px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-6">
      <h1 className="font-[family-name:var(--font-display)] text-[26px] font-semibold text-[#2A1A12]">Invite friends, earn cowries</h1>
      <p className="mt-2 text-[14px] text-[#8A7565] leading-[1.55]">Share Kekere with friends. When someone you referred buys cowries for the first time — even just ₦500 — you earn 3 cowries instantly.</p>

      {/* Referral code card */}
      {stats.code && (
        <div className="mt-5 overflow-hidden rounded-[18px] bg-[#2A1A12] px-5 py-5 shadow-[0_6px_30px_rgba(42,26,18,0.12)]">
          <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#A08C7C]">Your referral code</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-wider text-[#E9A56B]">{stats.code}</div>
            <button
              type="button"
              onClick={() => copyToClipboard(stats.code!, setCodeCopied, setCodeCopyFailed)}
              className="flex items-center gap-2 rounded-[11px] bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/15"
            >
              {codeCopied ? <><Check size={14} /> Copied</> : codeCopyFailed ? "Couldn't copy — select it manually" : <><Copy size={14} /> Copy code</>}
            </button>
          </div>
        </div>
      )}

      {/* Share row */}
      <div className="mt-[14px] flex gap-3">
        <button type="button" onClick={() => stats.shareUrl && copyToClipboard(stats.shareUrl, setLinkCopied, setLinkCopyFailed)} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white py-3 text-[13px] font-medium text-[#2A1A12] transition-colors hover:border-[#C75D2C]/30">
          {linkCopied ? <><Check size={15} /> Copied</> : linkCopyFailed ? "Couldn't copy" : <><Copy size={15} /> Copy link</>}
        </button>
        <a href={stats.shareUrl ? `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}` : "#"} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
          <MessageCircle size={15} /> WhatsApp
        </a>
      </div>
      {linkCopyFailed && (
        <p className="mt-2 text-center text-[12px] text-[#C0392B]">
          Couldn&apos;t copy automatically. Your link: {stats.shareUrl}
        </p>
      )}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-[10px]">
        <div className="rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-3 py-3.5 text-center">
          <div className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-[#2A1A12]">{stats.totalReferrals}</div>
          <div className="mt-0.5 text-[11px] text-[#8A7565]">Joined</div>
        </div>
        <div className="rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-3 py-3.5 text-center">
          <div className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-[#2A1A12]">{stats.rewardedReferrals}</div>
          <div className="mt-0.5 text-[11px] text-[#8A7565]">Rewarded</div>
        </div>
        <div className="rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-3 py-3.5 text-center">
          <div className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-[#1F8A5B]">{stats.totalCowriesEarned}</div>
          <div className="mt-0.5 text-[11px] text-[#8A7565]">Earned</div>
        </div>
      </div>

      {/* Referral history */}
      <div className="mt-6">
        <h2 className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#2A1A12]">Referral history</h2>
        {stats.referrals.length === 0 ? (
          <p className="mt-3 py-8 text-center text-[14px] text-[#A08C7C]">No referrals yet. Share your code to start earning.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-[2px]">
            {stats.referrals.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[13px] px-3 py-3 transition-colors hover:bg-[rgba(42,26,18,0.03)]">
                <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[12px] bg-[rgba(42,26,18,0.06)] text-[14px] font-semibold text-[#8A7565]">{r.referredUserName}***</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[#2A1A12]">{r.referredUserName}***</div>
                  <div className="text-[12px] text-[#8A7565]">{new Date(r.referredAt).toLocaleDateString()}</div>
                </div>
                <div className={cn("flex-none rounded-full px-2.5 py-1 text-[11px] font-medium", r.status === "REWARDED" ? "bg-[#1F8A5B]/10 text-[#1F8A5B]" : "bg-[#E9A56B]/15 text-[#B7791F]")}>
                  {r.status === "REWARDED" ? "Reward earned" : "Joined"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
