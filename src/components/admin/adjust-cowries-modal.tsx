"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type CowrieWalletType = "spending" | "earned";
export type CowrieAdjustmentKind = "business" | "correction";

export interface AdjustCowriesModalProps {
  userId: string;
  userName: string;
  initialWallet?: CowrieWalletType;
  initialAmount?: number;
  initialReason?: string;
  initialRecordOnly?: boolean;
  // "business" (default): a deliberate decision — counted in totalIssued.
  // "correction": fixing an untracked balance — excluded from totalIssued,
  // and (unlike a business adjustment) DOES resolve a wallet's "untracked
  // balance" flag once applied, since it's a real explanation for the gap
  // rather than a new, separately-tracked event. Not user-editable — fixed
  // by which part of the admin UI opened this modal.
  kind?: CowrieAdjustmentKind;
  onClose: () => void;
  onSuccess: (result: { wallet: CowrieWalletType; newBalance: number }) => void;
}

export function AdjustCowriesModal({
  userId,
  userName,
  initialWallet = "spending",
  initialAmount,
  initialReason,
  initialRecordOnly = false,
  kind = "business",
  onClose,
  onSuccess,
}: AdjustCowriesModalProps) {
  const [wallet, setWallet] = useState<CowrieWalletType>(initialWallet);
  const [amount, setAmount] = useState(initialAmount !== undefined ? String(initialAmount) : "");
  const [reason, setReason] = useState(initialReason ?? "");
  const [recordOnly, setRecordOnly] = useState(initialRecordOnly);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      setError("Enter a nonzero amount.");
      return;
    }
    if (wallet === "spending" && !Number.isInteger(numericAmount)) {
      setError("Spending-wallet adjustments must be a whole number of cowries.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/adjust-cowries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, amount: numericAmount, reason: reason.trim(), recordOnly, kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Adjustment failed");
      onSuccess({ wallet, newBalance: data.newBalance });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#1A1C20]">Adjust cowries — {userName}</h2>
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
          For correcting a real error only — not for granting favors or manufacturing activity. Every
          adjustment is logged with the reason you give below.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-[12px] font-medium text-[#646B73]">
            Wallet
            <select
              value={wallet}
              onChange={(e) => setWallet(e.target.value as CowrieWalletType)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-[rgba(20,22,26,0.14)] px-3 py-2 text-[13px] text-[#1A1C20] disabled:opacity-50"
            >
              <option value="spending">Spending</option>
              <option value="earned">Earned</option>
            </select>
          </label>

          <label className="block text-[12px] font-medium text-[#646B73]">
            Amount ({wallet === "spending" ? "whole cowries" : "up to 2 decimals"} — negative to debit)
            <input
              type="number"
              step={wallet === "spending" ? 1 : 0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
              placeholder="e.g. -50"
              className="mt-1 w-full rounded-lg border border-[rgba(20,22,26,0.14)] px-3 py-2 text-[13px] text-[#1A1C20] disabled:opacity-50"
            />
          </label>

          <label className="block text-[12px] font-medium text-[#646B73]">
            Reason (required, min 10 characters)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="Why is this adjustment happening?"
              className="mt-1 w-full rounded-lg border border-[rgba(20,22,26,0.14)] px-3 py-2 text-[13px] text-[#1A1C20] disabled:opacity-50"
            />
          </label>

          <label className="flex items-start gap-2 text-[12px] text-[#646B73]">
            <input
              type="checkbox"
              checked={recordOnly}
              onChange={(e) => setRecordOnly(e.target.checked)}
              disabled={submitting}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-[#1A1C20]">Record only — don&apos;t change the balance.</span>{" "}
              Use this when the current balance is already correct (e.g. legitimate legacy data) and you
              just need the ledger to explain it. Leave unchecked to actually move the balance to what it
              should be.
            </span>
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
            disabled={submitting}
            className="rounded-lg bg-[#1A1C20] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Applying…" : recordOnly ? "Record (no balance change)" : "Apply adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}
