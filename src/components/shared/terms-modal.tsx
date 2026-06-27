"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TermsModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        className="cursor-pointer border-none bg-transparent p-0 font-medium text-[var(--color-primary)] underline"
      >
        Terms of Use
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,18,0.5)] p-4">
          <div className="relative max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-[20px] bg-white p-[28px] shadow-[0_20px_50px_-16px_rgba(42,26,18,0.4)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-none bg-[var(--color-ink)]/5 text-[var(--color-ink)]/60 hover:bg-[var(--color-ink)]/10"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-sm leading-relaxed text-[var(--color-ink)]">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
