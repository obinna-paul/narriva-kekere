"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAIRA_RATE = 50;
const MIN_WITHDRAWAL = 10;

type Step = 1 | 2 | 3;

const ERROR_MESSAGES: Record<string, string> = {
  no_bank_details: "Add verified bank details in your profile before withdrawing.",
  insufficient_earned_balance: "You don't have enough balance for this withdrawal.",
  request_already_pending: "You already have a withdrawal request in progress.",
  withdrawals_disabled: "Withdrawals are temporarily disabled. Please try again later.",
};

interface WithdrawalBankDetails {
  bankName: string;
  accountNumberLast4: string;
  accountName: string;
}

export function WithdrawalPage({
  availableBalance,
  bankDetails,
}: {
  availableBalance: number;
  bankDetails: WithdrawalBankDetails;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const nairaAmount = amount ? Math.round(parsedAmount * NAIRA_RATE) : 0;
  const remaining = Math.round((availableBalance - parsedAmount) * 100) / 100;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/kekere/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cowriesAmount: parsedAmount }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setSubmitError(ERROR_MESSAGES[data?.error] ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
      setStep(3);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[402px] px-[22px] pb-[calc(80px+env(safe-area-inset-bottom))] pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[rgba(42,26,18,0.08)]"><ArrowLeft size={16} className="text-[#8A7565]" /></button>
        <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#2A1A12]">Withdraw</h1>
      </div>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("flex h-[7px] w-[7px] rounded-full", s <= step ? "bg-[#1F8A5B]" : "bg-[rgba(42,26,18,0.12)]")} />
            {s < 3 && <div className={cn("h-px w-9", s < step ? "bg-[#1F8A5B]" : "bg-[rgba(42,26,18,0.12)]")} />}
          </div>
        ))}
      </div>

      {/* Step 1: Amount */}
      {step === 1 && (
        <div className="mt-6">
          <p className="text-[14px] text-[#8A7565]">Available: <span className="font-semibold text-[#2A1A12]">{availableBalance.toFixed(2)} cowries</span></p>
          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-medium text-[#2A1A12]">Amount (cowries)</label>
            <input
              value={amount}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d.]/g, "");
                const firstDot = next.indexOf(".");
                const cleaned = firstDot === -1 ? next : next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
                setAmount(cleaned);
              }}
              placeholder={`Min ${MIN_WITHDRAWAL} cowries`}
              className="w-full rounded-[12px] border border-[rgba(42,26,18,0.12)] bg-white px-4 py-3 text-[24px] font-[family-name:var(--font-display)] font-semibold text-[#2A1A12] outline-none placeholder:text-[#A08C7C]"
            />
          </div>
          {amount && (
            <div className="mt-4 rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4">
              <div className="text-[13px] text-[#8A7565]">You receive</div>
              <div className="font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1F8A5B]">&#8358;{nairaAmount.toLocaleString()}</div>
              <div className="mt-2 text-[12px] text-[#A08C7C]">Remaining after: {remaining.toFixed(2)} cowries</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!amount || parsedAmount < MIN_WITHDRAWAL || parsedAmount > availableBalance}
            className="mt-5 w-full rounded-[12px] bg-[#1F8A5B] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Review withdrawal
          </button>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="mt-6">
          <div className="rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white px-5 py-5">
            <div className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1F8A5B]">&#8358;{nairaAmount.toLocaleString()}</div>
            <div className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between"><span className="text-[#8A7565]">Cowries</span><span className="text-[#2A1A12] font-medium">{amount} cowries</span></div>
              <div className="flex justify-between"><span className="text-[#8A7565]">Bank</span><span className="text-[#2A1A12] font-medium">{bankDetails.bankName}</span></div>
              <div className="flex justify-between"><span className="text-[#8A7565]">Account</span><span className="text-[#2A1A12] font-medium">****{bankDetails.accountNumberLast4} &middot; {bankDetails.accountName}</span></div>
              <div className="flex justify-between"><span className="text-[#8A7565]">Remaining balance</span><span className="text-[#2A1A12] font-medium">{remaining.toFixed(2)} cowries</span></div>
            </div>
          </div>
          <Link href="/kekere/profile#bank-details" className="mt-3 block text-center text-[13px] font-semibold text-[var(--color-primary)]">
            Change bank details
          </Link>
          {submitError && <p className="mt-3 text-center text-[13px] text-[#A13A3A]">{submitError}</p>}
          <p className="mt-3 text-[12px] text-[#A08C7C] text-center">Your request will be reviewed by the admin team.</p>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="mt-4 w-full rounded-[12px] bg-[#1F8A5B] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {submitting ? "Submitting…" : "Confirm withdrawal"}
          </button>
        </div>
      )}

      {/* Step 3: Submitted */}
      {step === 3 && submitted && (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#1F8A5B]/15">
            <Check size={30} className="text-[#1F8A5B]" />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#2A1A12]">Request received</h2>
          <p className="mt-2 text-[14px] text-[#8A7565]">Your withdrawal of {amount} cowries (&#8358;{nairaAmount.toLocaleString()}) is under review.</p>
          <div className="mt-3 rounded-full bg-[#B7791F]/15 px-3 py-1 text-[12px] font-medium text-[#B7791F]">Pending review</div>
          <div className="mt-4 text-[14px] text-[#A08C7C]">Updated balance: {remaining.toFixed(2)} cowries</div>
          <button type="button" onClick={() => router.push("/kekere/wallet")} className="mt-6 rounded-[12px] bg-[#C75D2C] px-8 py-3 text-[14px] font-semibold text-white">
            Back to wallet
          </button>
        </div>
      )}
    </div>
  );
}
