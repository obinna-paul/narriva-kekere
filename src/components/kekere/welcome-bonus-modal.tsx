"use client";

import { useEffect, useState } from "react";

// Set to "1" by the signup form (auth-form.tsx) the moment an account is
// created, and removed here the first time the new reader dismisses this —
// so the welcome shows exactly once, right after signup, and never again.
const STORAGE_KEY = "kekere_welcome_new_user";

export interface WelcomeBonusModalProps {
  /** The reader's live spending balance. At the moment this shows (right
   *  after signup, before any spend) it equals the starter grant, so the
   *  copy can name the real number instead of hardcoding it — and if the
   *  grant is ever zero/disabled, balance is 0 and we show nothing. */
  cowries: number;
}

/**
 * A one-time welcome beat surfaced on the first feed load after signup. Its
 * whole job is the endowment moment: make the brand-new reader *see* that
 * they already own cowries, framed as a genuine gift rather than a currency
 * lesson — while still making it legible that stories cost cowries and that
 * most of a cowrie goes to the writer (which is the mentality we actually
 * want new readers to form). Deliberately not a "your first story is free"
 * message — that benefit was retired in favour of the starter grant.
 */
export function WelcomeBonusModal({ cowries }: WelcomeBonusModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setVisible(true);
    } catch {
      // localStorage unavailable — skip silently.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setVisible(false);
  }

  // Nothing to celebrate if the grant never landed (bonus disabled, or an
  // already-spent balance somehow reaching here) — don't show "you've got 0".
  if (!visible || cowries < 1) return null;

  const cowrieWord = cowries === 1 ? "cowrie" : "cowries";

  return (
    <>
      <div
        onClick={dismiss}
        className="fixed inset-0 z-[60] bg-[rgba(42,26,18,0.55)]"
        style={{ animation: "wbFadeIn .2s ease" }}
        aria-hidden="true"
      />

      <style>{`
        @keyframes wbFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wbSlideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Kekere"
        className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-sm rounded-t-[24px] bg-[#FBF5EC] px-6 pb-10 pt-8 shadow-[0_-16px_48px_rgba(42,26,18,.28)] md:bottom-auto md:left-1/2 md:top-1/2 md:rounded-[20px] md:-translate-x-1/2 md:-translate-y-1/2"
        style={{ animation: "wbSlideUp .32s cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* Two stacked cowries — the gift is the currency itself */}
        <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[rgba(199,93,44,0.12)]">
          <svg width="42" height="36" viewBox="0 0 32 24" aria-hidden="true">
            <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
            <path d="M12 5 Q13.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.2" fill="none" />
            <ellipse cx="21" cy="12" rx="6" ry="9" fill="#E2A565" />
            <path d="M21 5 Q22.5 12 21 19" stroke="#F5EBDD" strokeWidth="1.2" fill="none" />
          </svg>
        </div>

        <h2 className="text-center font-[family-name:var(--font-display)] text-[22px] font-semibold leading-[1.2] text-[#2A1A12]">
          Welcome — here&apos;s {cowries} {cowrieWord}
        </h2>
        <p className="mx-auto mt-3 max-w-[290px] text-center text-[14px] leading-[1.6] text-[rgba(42,26,18,.65)]">
          They&apos;re in your wallet now, ready to spend. Stories here cost a few cowries each — and
          most of it goes straight to the writer. These first {cowries === 1 ? "one is" : "ones are"} on
          us.
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-7 w-full cursor-pointer rounded-[30px] bg-[#C75D2C] py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ border: "none" }}
        >
          Find a story
        </button>
      </div>
    </>
  );
}
