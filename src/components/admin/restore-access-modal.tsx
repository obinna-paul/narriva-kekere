"use client";

import { useState } from "react";
import { X, Check, Copy } from "lucide-react";

export interface RestoreAccessModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

interface Result {
  resetUrl: string;
  emailed: boolean;
  markedVerified: boolean;
  stillSuspended: boolean;
}

/**
 * Confirm-then-act, not act-on-open — generating a reset link invalidates
 * any link already issued to this account, so it shouldn't fire just from
 * an admin clicking through to look.
 */
export function RestoreAccessModal({ userId, userName, onClose }: RestoreAccessModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/restore-access`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a reset link.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.resetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#1A1C20]">Restore access for {userName}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-[#8B919A] hover:bg-[#F4F5F7]">
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#646B73]">
              A password can never be shown or recovered — it&apos;s hashed, not stored. This generates a
              real password-reset link (the same one <code className="text-[12px]">/forgot-password</code>{" "}
              sends) and emails it to them. It also shows you the link directly, so you can share it
              another way if email delivery is in doubt. If their account never completed email
              verification, this clears that too — otherwise a working reset link still wouldn&apos;t
              get them past login.
            </p>
            {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] border border-[rgba(20,22,26,0.14)] px-4 py-2 text-[13px] font-semibold text-[#1A1C20] hover:bg-[#F4F5F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleGenerate}
                className="rounded-[8px] bg-[#1A1C20] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2D3139] disabled:opacity-50"
              >
                {submitting ? "Generating…" : "Generate reset link"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 space-y-2 text-[13px] text-[#1A1C20]">
              {result.markedVerified && (
                <p className="rounded-[8px] bg-[rgba(31,138,91,0.08)] px-3 py-2 text-[#1F8A5B]">
                  Their email is now marked verified — that gate is cleared.
                </p>
              )}
              <p className={result.emailed ? "text-[#646B73]" : "rounded-[8px] bg-[rgba(192,57,43,0.08)] px-3 py-2 text-[#C0392B]"}>
                {result.emailed
                  ? "The reset link was also emailed to them."
                  : "The email attempt failed — use the link below instead."}
              </p>
              {result.stillSuspended && (
                <p className="rounded-[8px] bg-[rgba(192,57,43,0.08)] px-3 py-2 text-[#C0392B]">
                  Their account is still suspended — unsuspend it too, or this link won&apos;t get them
                  back in.
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-[rgba(20,22,26,0.14)] bg-[#F9FAFB] px-3 py-2">
              <input
                readOnly
                value={result.resetUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[#1A1C20] outline-none"
              />
              <button
                type="button"
                onClick={copyLink}
                className="flex flex-none items-center gap-1 rounded-[6px] border border-[rgba(20,22,26,0.14)] px-2 py-1 text-[11px] font-semibold text-[#1A1C20] hover:bg-white"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-[11.5px] text-[#8B919A]">Expires in 60 minutes and can only be used once.</p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] bg-[#1A1C20] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2D3139]"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
