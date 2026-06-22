"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { WalletBalance } from "@/components/kekere/wallet-balance";
import { cn } from "@/lib/utils/cn";

export interface WalletTransactionView {
  id: string;
  type: "TOP_UP" | "UNLOCK" | "REFUND" | "WITHDRAWAL";
  amountCowries: number;
  description: string | null;
  date: string;
}

export interface WalletViewProps {
  balance: number;
  transactions: readonly WalletTransactionView[];
}

/**
 * Top-up is intentionally NOT wired to actually credit cowries here — real
 * top-up requires real payment processing (Paystack, Phase 14). Wiring a
 * "Top up" button that just adds cowries with no payment behind it would be
 * worse than not having one. The balance/history below are fully real.
 */
export function WalletView({ balance, transactions }: WalletViewProps) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-28 sm:px-8 md:pb-12">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="mt-5">
        <WalletBalance balance={balance} />
        <p className="mt-3 text-center text-sm text-[var(--color-ink)]/50">
          Top-ups are coming soon — real payment processing lands in Phase 14.
        </p>
      </div>

      <h2 className="mt-8 text-lg font-bold">Transaction history</h2>
      <div className="mt-3 flex flex-col gap-2">
        {transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-ink)]/50">
            No transactions yet.
          </p>
        )}
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-xl border border-[var(--color-ink)]/10 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  tx.amountCowries > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/60"
                )}
              >
                {tx.amountCowries > 0 ? (
                  <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium">{tx.description ?? tx.type}</p>
                <p className="text-xs text-[var(--color-ink)]/50">
                  {new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "font-semibold",
                tx.amountCowries > 0 ? "text-emerald-700" : "text-[var(--color-ink)]/70"
              )}
            >
              {tx.amountCowries > 0 ? "+" : ""}
              {tx.amountCowries}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
