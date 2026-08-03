"use client";

import { useState } from "react";
import { X, TriangleAlert } from "lucide-react";

export interface DeleteUserModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUserModal({ userId, userName, userEmail, onClose, onSuccess }: DeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once the server 409s because there's real money owed or published
  // work at stake — see the DELETE handler. Re-shows the same warning it
  // gave, and gates the retry-with-force behind an explicit checkbox rather
  // than just letting the confirm-email match alone push it through.
  const [needsForce, setNeedsForce] = useState<string | null>(null);
  const [forceAcknowledged, setForceAcknowledged] = useState(false);

  const emailConfirmed = confirmText.trim().toLowerCase() === userEmail.toLowerCase();

  async function handleDelete() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: needsForce !== null }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.error === "needs_force") {
        setNeedsForce(data.message as string);
        return;
      }
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Delete failed");

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = emailConfirmed && (!needsForce || forceAcknowledged);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#1A1C20]">Delete {userName}</h2>
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
          This permanently deletes the account and everything tied to it — wallet, published stories,
          unlocks, notes, follows, all of it. There is no undo. If you just want to remove their access,{" "}
          <span className="font-medium text-[#1A1C20]">Suspend</span> instead.
        </p>

        {needsForce && (
          <div className="mt-4 flex gap-2 rounded-lg border border-[#C0392B]/25 bg-[rgba(192,57,43,0.06)] p-3 text-[12.5px] text-[#8A2E20]">
            <TriangleAlert size={16} className="mt-0.5 flex-none" />
            <span>{needsForce}</span>
          </div>
        )}

        <label className="mt-4 block text-[12px] font-medium text-[#646B73]">
          Type <span className="font-mono font-semibold text-[#1A1C20]">{userEmail}</span> to confirm
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={submitting}
            placeholder={userEmail}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-[rgba(20,22,26,0.14)] px-3 py-2 text-[13px] text-[#1A1C20] disabled:opacity-50"
          />
        </label>

        {needsForce && (
          <label className="mt-3 flex items-start gap-2 text-[12px] text-[#646B73]">
            <input
              type="checkbox"
              checked={forceAcknowledged}
              onChange={(e) => setForceAcknowledged(e.target.checked)}
              disabled={submitting}
              className="mt-0.5"
            />
            <span>I understand the consequences above and want to delete anyway.</span>
          </label>
        )}

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
            onClick={handleDelete}
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-[#C0392B] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
