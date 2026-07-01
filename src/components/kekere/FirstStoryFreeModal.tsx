"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kekere_welcome_new_user";

export function FirstStoryFreeModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — skip silently
    }
  }, []);

  function dismiss() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        className="fixed inset-0 z-[60] bg-[rgba(42,26,18,0.55)]"
        style={{ animation: "ffFadeIn .2s ease" }}
      />

      <style>{`
        @keyframes ffFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ffSlideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Card */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-sm rounded-t-[24px] bg-[#FBF5EC] px-6 pb-10 pt-8 shadow-[0_-16px_48px_rgba(42,26,18,.28)] md:bottom-auto md:left-1/2 md:top-1/2 md:rounded-[20px] md:-translate-x-1/2 md:-translate-y-1/2"
        style={{ animation: "ffSlideUp .32s cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* Cowrie glyph */}
        <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[rgba(199,93,44,0.12)]">
          <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
            <ellipse cx="12" cy="12" rx="6" ry="9" fill="#C75D2C" />
            <path d="M12 5 Q13.5 12 12 19 M12 5 Q10.5 12 12 19" stroke="#F5EBDD" strokeWidth="1.4" fill="none" />
          </svg>
        </div>

        <h2 className="text-center font-[family-name:var(--font-display)] text-[22px] font-semibold leading-[1.2] text-[#2A1A12]">
          Your first story is on us
        </h2>
        <p className="mx-auto mt-3 max-w-[280px] text-center text-[14px] leading-[1.6] text-[rgba(42,26,18,.65)]">
          Welcome to Kekere. Unlock any story for free — no cowries needed. After that, top up and keep reading.
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-7 w-full cursor-pointer rounded-[30px] bg-[#C75D2C] py-[14px] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ border: "none" }}
        >
          Browse stories
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full cursor-pointer bg-transparent py-2 text-[13px] text-[rgba(42,26,18,.45)] transition-colors hover:text-[rgba(42,26,18,.7)]"
          style={{ border: "none" }}
        >
          Got it
        </button>
      </div>
    </>
  );
}
