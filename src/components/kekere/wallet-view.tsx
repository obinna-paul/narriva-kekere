"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { WalletBalance } from "@/components/kekere/wallet-balance";
import { TopUpModal } from "@/components/kekere/top-up-modal";
import { cn } from "@/lib/utils/cn";

export interface WalletTransactionView {
  id: string;
  type: "TOP_UP" | "UNLOCK" | "REFUND" | "WITHDRAWAL" | "TIP" | "REFERRAL" | "READ_REWARD";
  amountCowries: number;
  amountNgn?: number | null;
  description: string | null;
  date: string;
  status?: "PENDING" | "COMPLETED" | "FAILED";
}

export interface WalletViewProps {
  balance: number;
  userId: string;
  userEmail: string;
  transactions: readonly WalletTransactionView[];
  hasBankDetails: boolean;
  referralCode: string | null;
  referralEarnings: number;
  readRewardEarnings: number;
  tipEarnings: number;
}

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
}

export function WalletView({
  balance,
  userId,
  userEmail,
  transactions,
  hasBankDetails,
  referralCode,
  referralEarnings,
  readRewardEarnings,
  tipEarnings,
}: WalletViewProps) {
  const router = useRouter();
  const [showTopUp, setShowTopUp] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleWithdraw() {
    setWithdrawing(true);
    setWithdrawError(null);
    const res = await fetch("/api/kekere/wallet/withdraw", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setWithdrawError(data.error ?? "Couldn't process withdrawal.");
      setWithdrawing(false);
      setConfirmOpen(false);
      return;
    }
    setWithdrawSuccess(true);
    setWithdrawing(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-28 sm:px-8 md:pb-12">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="mt-5">
        <WalletBalance balance={balance} onTopUpClick={() => setShowTopUp(true)} />
      </div>

      {showTopUp && (
        <TopUpModal
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => { setShowTopUp(false); router.refresh(); }}
        />
      )}

      <div className="mt-4">
        {withdrawSuccess ? (
          <p className="rounded-xl bg-[rgba(31,111,74,0.1)] px-4 py-3 text-sm text-[var(--color-success)]">
            Withdrawal request submitted. We'll transfer ?{(balance * 50).toLocaleString()} to your bank within 3–5 business days.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!hasBankDetails}
            className="w-full cursor-pointer rounded-xl border border-[rgba(42,26,18,0.14)] bg-white px-4 py-[14px] text-center text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasBankDetails
              ? balance > 0
                ? `Withdraw ${balance} cowries (?${(balance * 50).toLocaleString()})`
                : "Nothing to withdraw yet"
              : "Add your bank details in your profile to withdraw"}
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-[var(--color-ink-muted-3)]">
        Minimum withdrawal: 10 cowries (?500). Processed within 3–5 business days.
      </p>

      <section className="mt-8 rounded-2xl border border-[rgba(42,26,18,0.08)] bg-white p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          How to earn cowries
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[rgba(31,75,75,0.06)] px-4 py-4 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-accent)]">
              +{readRewardEarnings}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted-2)]">Finish paid stories</p>
          </div>
          <div className="rounded-xl bg-[rgba(199,93,44,0.06)] px-4 py-4 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-primary)]">
              +{referralEarnings}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted-2)]">Invite friends</p>
          </div>
          <div className="rounded-xl bg-[rgba(31,111,74,0.06)] px-4 py-4 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-success)]">
              +{tipEarnings}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted-2)]">Reader tips</p>
          </div>
        </div>

        {referralCode && (
          <div className="mt-5 rounded-xl bg-[rgba(199,93,44,0.04)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted-2)]">
              Your referral code
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white px-3 py-[10px] text-[17px] font-bold tracking-[0.06em] text-[var(--color-primary)]">
                {referralCode}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(referralCode, setCopied)}
                className="flex-none cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-[10px] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-ink-muted-3)]">
              Share this code. When a friend signs up with it and reads a paid story, you both earn 1 cowry.
            </p>
          </div>
        )}
      </section>

      <h2 className="mt-8 text-lg font-bold">Transaction history</h2>
      <div className="mt-3 flex flex-col gap-2">
        {transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-ink)]/50">No transactions yet.</p>
        )}
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between rounded-xl border border-[var(--color-ink)]/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", tx.amountCowries > 0 ? "bg-emerald-100 text-emerald-700" : "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/60")}>
                {tx.amountCowries > 0 ? <ArrowDownLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{tx.description ?? tx.type}</p>
                  {tx.status === "PENDING" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pending</span>}
                </div>
                <p className="text-xs text-[var(--color-ink)]/50">{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
            <span className={cn("font-semibold", tx.amountCowries > 0 ? "text-emerald-700" : "text-[var(--color-ink)]/70")}>{tx.amountCowries > 0 ? "+" : ""}{tx.amountCowries}</span>
          </div>
        ))}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,26,18,0.5)] px-6">
          {balance < 10 ? (
            <div className="w-full max-w-[340px] rounded-[20px] bg-white p-[26px] text-center shadow-[0_20px_50px_-16px_rgba(42,26,18,0.4)]">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">Oops!</h3>
              <p className="mt-3 text-sm leading-[1.55] text-[var(--color-ink-muted)]">Looks like you don't have up to 10 cowries yet. But don't worry, you can earn some cowries.</p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 cursor-pointer rounded-[10px] border border-[rgba(42,26,18,0.14)] bg-transparent px-4 py-[12px] text-sm font-semibold text-[var(--color-ink-muted)]">Back to feed</button>
                <Link href="/kekere/wallet" className="flex-1 rounded-[10px] bg-[var(--color-primary)] px-4 py-[12px] text-center text-sm font-semibold text-white">Earn cowries</Link>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[340px] rounded-[20px] bg-white p-[26px] text-center shadow-[0_20px_50px_-16px_rgba(42,26,18,0.4)]">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">Withdraw {balance} cowries?</h3>
              <p className="mt-3 text-sm leading-[1.55] text-[var(--color-ink-muted)]">?{(balance * 50).toLocaleString()} will be sent to your bank account. You can't undo this — your balance will go to zero and the transfer takes 3–5 business days.</p>
              {withdrawError && <p className="mt-3 rounded-lg bg-[rgba(193,58,58,0.08)] px-3 py-2 text-sm text-[#A13A3A]">{withdrawError}</p>}
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 cursor-pointer rounded-[10px] border border-[rgba(42,26,18,0.14)] bg-transparent px-4 py-[12px] text-sm font-semibold text-[var(--color-ink-muted)]">Cancel</button>
                <button type="button" disabled={withdrawing} onClick={handleWithdraw} className="flex-1 cursor-pointer rounded-[10px] bg-[var(--color-primary)] px-4 py-[12px] text-sm font-semibold text-white disabled:opacity-50">{withdrawing ? "Processing…" : "Confirm"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}