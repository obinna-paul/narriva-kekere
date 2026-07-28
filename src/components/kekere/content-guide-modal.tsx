"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { GUIDE_TITLE, GUIDE_INTRO, GUIDE_SECTIONS } from "@/content/legal/writer-content-guide";

/**
 * The content guide as a popup rather than a page navigation.
 *
 * It used to open /kekere/content-guide in a new tab. That left a writer
 * with a bare browser tab and no way back into the app short of closing it
 * by hand — no X, no "back" affordance, because a fresh tab has no history
 * to go back to. A dialog over the same screen fixes that by construction:
 * closing it is just closing it, the dashboard underneath was never
 * navigated away from.
 *
 * Self-contained on purpose — this renders both the trigger and the dialog,
 * so dropping it into a page is a one-line swap for whatever text link used
 * to be there.
 */
export function ContentGuideModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#C75D2C] hover:underline"
      >
        <FileText size={12} />
        See our content guide
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,18,0.5)] p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-[20px] bg-white p-[28px] shadow-[0_20px_50px_-16px_rgba(42,26,18,0.4)]"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-none bg-[var(--color-ink)]/5 text-[var(--color-ink)]/60 hover:bg-[var(--color-ink)]/10"
            >
              <X className="h-4 w-4" />
            </button>

            <h2
              id="content-guide-title"
              className="pr-10 font-[family-name:var(--font-display)] text-[26px] font-medium tracking-[-0.02em] text-[var(--color-ink)]"
            >
              {GUIDE_TITLE}
            </h2>
            <p className="mt-3 text-[15px] italic leading-[1.6] text-[var(--color-muted)]">
              {GUIDE_INTRO}
            </p>

            <div className="mt-7 flex flex-col gap-7">
              {GUIDE_SECTIONS.map((s) => (
                <div key={s.heading}>
                  <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-ink)]">
                    {s.heading}
                  </h3>
                  <div className="flex flex-col gap-3 text-[14.5px] leading-[1.7] text-[#3A352E]">
                    {s.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
