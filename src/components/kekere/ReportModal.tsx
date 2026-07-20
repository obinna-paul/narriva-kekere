"use client";

import { useState } from "react";
import { X, Flag, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ReportTargetType = "STORY" | "PARAGRAPH_COMMENT";

const REASONS: readonly { value: string; label: string }[] = [
  { value: "PLAGIARISM", label: "Plagiarism or stolen work" },
  { value: "HATE_SPEECH", label: "Hate speech or harassment" },
  { value: "SEXUAL_CONTENT", label: "Sexual or explicit content" },
  { value: "MISTAGGED", label: "Mis-tagged or misleading" },
  { value: "BROKEN", label: "Broken or not displaying right" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Something else" },
];

const ERROR_MESSAGES: Record<string, string> = {
  cannot_report_own_content: "You can't report your own content.",
  too_long: "That's a bit long — keep it under 500 characters.",
  profanity: "Please remove inappropriate language and try again.",
  not_found: "This content is no longer available.",
};

export interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}

/** Reader-facing report sheet — reports a Story or a ParagraphComment into
 * the admin moderation queue (see kekere-reports.ts). Shared by the story
 * reader's "Report story" menu item and the comment panel's per-comment
 * report action, so both content types go through one consistent flow. */
export function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/kekere/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Couldn't send your report — try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't send your report — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(42,26,18,0.5)] sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-t-[20px] bg-white p-6 shadow-[0_20px_50px_-16px_rgba(42,26,18,0.4)] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1F8A5B]/10">
              <Check size={22} className="text-[#1F8A5B]" />
            </div>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#2A1A12]">
              Thanks for letting us know
            </h3>
            <p className="mt-1.5 text-[13.5px] text-[#6B5744]">We&apos;ll take a look and follow up if needed.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-[12px] bg-[#C75D2C] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#2A1A12]">
                {targetType === "STORY" ? "Report this story" : "Report this comment"}
              </h3>
              <button type="button" onClick={onClose} aria-label="Close" className="text-[#A08C7C] transition-colors hover:text-[#2A1A12]">
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={cn(
                    "flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors",
                    reason === r.value
                      ? "border-[#C75D2C] bg-[#C75D2C]/[0.06] text-[#C75D2C]"
                      : "border-[rgba(42,26,18,0.12)] text-[#2A1A12] hover:border-[#C75D2C]/40"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Add any details that might help (optional)…"
              className="mt-3 w-full resize-none rounded-[10px] border border-[rgba(42,26,18,0.14)] px-3 py-2.5 text-[13.5px] text-[#2A1A12] outline-none transition-colors focus:border-[#C75D2C]"
            />

            {error && <p className="mt-2 text-[12px] text-[#A13A3A]">{error}</p>}

            <button
              type="button"
              disabled={!reason || submitting}
              onClick={handleSubmit}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#C75D2C] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Flag size={15} /> {submitting ? "Sending…" : "Submit report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
