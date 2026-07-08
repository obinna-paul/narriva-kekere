"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryExportModalProps {
  userEmail: string;
  onClose: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HistoryExportModal({ userEmail, onClose }: HistoryExportModalProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!from || !to) {
      setError("Choose a start and end date.");
      return;
    }
    if (from > to) {
      setError("Start date must be before end date.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/kekere/wallet/history/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not send that history");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-fade-in-up rounded-t-3xl bg-[var(--color-surface)] p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Request full transaction history</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="mt-5">
            <p className="text-sm text-[var(--color-ink)]">
              Sent! Check <span className="font-medium">{userEmail}</span> for your transaction history.
            </p>
            <Button type="button" className="mt-5 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              Pick a date range. We&apos;ll email your full transaction history for that period to{" "}
              <span className="font-medium">{userEmail}</span>.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-muted)]">
                From
                <input
                  type="date"
                  value={from}
                  max={to || todayIso()}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-lg border border-[rgba(42,26,18,0.14)] bg-white px-3 py-2 text-sm text-[#1A1C20]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-muted)]">
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  max={todayIso()}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-lg border border-[rgba(42,26,18,0.14)] bg-white px-3 py-2 text-sm text-[#1A1C20]"
                />
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <Button type="button" className="mt-5 w-full" disabled={submitting} onClick={handleSend}>
              {submitting ? "Sending…" : "Send to my email"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
