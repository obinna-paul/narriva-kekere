"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface SuspendUserModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [
  { label: "Indefinite — until manually unsuspended", value: "" },
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

export function SuspendUserModal({ userId, userName, onClose, onSuccess }: SuspendUserModalProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (reason.trim().length === 0) {
      setError("A reason is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          ...(duration ? { durationDays: Number(duration) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Suspend failed");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suspend failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#1A1C20]">Suspend {userName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8B919A] hover:bg-[rgba(20,22,26,0.05)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-[12px] text-[#8B919A]">
          They&apos;ll be signed out and unable to log back in until unsuspended. They&apos;re emailed
          when this happens, so make the reason something you&apos;d stand behind them reading.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-[12px] font-medium text-[#646B73]">
            Reason (required)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="Why is this account being suspended?"
              className="mt-1 w-full rounded-lg border border-[rgba(20,22,26,0.14)] px-3 py-2 text-[13px] text-[#1A1C20] disabled:opacity-50"
            />
          </label>

          <label className="block text-[12px] font-medium text-[#646B73]">
            Duration
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-[rgba(20,22,26,0.14)] px-3 py-2 text-[13px] text-[#1A1C20] disabled:opacity-50"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-3 text-[13px] text-[#C0392B]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-[rgba(20,22,26,0.14)] px-4 py-2 text-[13px] font-semibold text-[#1A1C20] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || reason.trim().length === 0}
            className="rounded-lg bg-[#C0392B] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Suspending…" : "Suspend"}
          </button>
        </div>
      </div>
    </div>
  );
}
