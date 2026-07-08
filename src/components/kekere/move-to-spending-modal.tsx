"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MoveToSpendingModalProps {
  earnedBalance: number;
  onClose: () => void;
  onSuccess: (result: { newEarnedBalance: number; newSpendingBalance: number }) => void;
}

export function MoveToSpendingModal({ earnedBalance, onClose, onSuccess }: MoveToSpendingModalProps) {
  // Whole cowries only — the spending wallet is always a whole number.
  const maxMovable = Math.floor(earnedBalance);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMove() {
    setError(null);
    const numeric = Number(amount);
    if (!Number.isInteger(numeric) || numeric < 1) {
      setError("Enter a whole number of cowries.");
      return;
    }
    if (numeric > maxMovable) {
      setError(`You can move at most ${maxMovable} cowrie${maxMovable === 1 ? "" : "s"}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kekere/wallet/move-to-spending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numeric }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error === "insufficient_earned_balance"
            ? "You don't have that many withdrawable cowries."
            : "Couldn't move cowries. Please try again."
        );
      }
      onSuccess({ newEarnedBalance: data.newEarnedBalance, newSpendingBalance: data.newSpendingBalance });
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
          <h2 className="text-lg font-bold">Move to spending</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          Move your withdrawable cowries into your spending wallet so you can unlock stories and tip other
          writers. You have <span className="font-semibold text-[var(--color-ink)]">{earnedBalance.toFixed(2)}</span>{" "}
          withdrawable ({maxMovable} whole cowrie{maxMovable === 1 ? "" : "s"} movable).
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#B7791F]/30 bg-[#B7791F]/[0.07] px-3 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 flex-none text-[#B7791F]" />
          <p className="text-[12.5px] leading-[1.45] text-[#8a6412]">
            This can&apos;t be undone. Cowries only move one way — once they&apos;re in your spending
            wallet, you can&apos;t move them back to withdrawable or cash them out to your bank.
          </p>
        </div>

        <label className="mt-4 block text-sm font-medium text-[var(--color-ink)]">
          Cowries to move
          <input
            type="number"
            min={1}
            max={maxMovable}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting || maxMovable < 1}
            placeholder={maxMovable >= 1 ? `1 – ${maxMovable}` : "0"}
            className="mt-1 w-full rounded-[12px] border border-[rgba(42,26,18,0.14)] bg-white px-3 py-2.5 text-[15px] text-[#2A1A12] disabled:opacity-50"
          />
        </label>

        {maxMovable < 1 && (
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            You need at least 1 whole withdrawable cowrie to move.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <Button
          type="button"
          className="mt-5 w-full"
          disabled={submitting || maxMovable < 1 || amount === ""}
          onClick={handleMove}
        >
          {submitting ? "Moving…" : "Move to spending"}
        </Button>
      </div>
    </div>
  );
}
