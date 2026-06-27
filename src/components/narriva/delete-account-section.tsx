"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface DeleteAccountSectionProps {
  initialDeletionRequestedAt: string | null;
}

export function DeleteAccountSection({ initialDeletionRequestedAt }: DeleteAccountSectionProps) {
  const [requestedAt, setRequestedAt] = useState(initialDeletionRequestedAt);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/account/delete-request", { method: "POST" });
    setSubmitting(false);

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }

    const data = await res.json();
    setRequestedAt(data.deletionRequestedAt);
    setConfirming(false);
  }

  if (requestedAt) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          Deletion requested on {new Date(requestedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="mt-1 text-sm text-amber-800">
          A confirmation email has been sent. Your personal data will be deleted within 30
          days; order and submission records are retained for 7 years for legal/financial
          purposes. Contact support if you want to cancel this request.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">Delete my account</p>
      <p className="mt-1 text-sm text-red-800">
        This permanently removes your personal data within 30 days. Order, transaction,
        and submission records are kept for 7 years for legal/financial record-keeping.
        This can&apos;t be undone once processed.
      </p>

      {!confirming ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setConfirming(true)}
        >
          Delete my account
        </Button>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm font-medium text-red-900">
            Are you sure? We&apos;ll send a confirmation email and start the 30-day deletion
            process.
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="destructive" size="sm" disabled={submitting} onClick={handleConfirm}>
              {submitting ? "Submitting…" : "Yes, delete my account"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
