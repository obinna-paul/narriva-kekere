"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAIRA_RATE = 50;
const MIN_WITHDRAWAL = 10;

type Step = 1 | 2 | 3 | 4;

export function WithdrawalPage({ availableBalance, hasBankDetails }: { availableBalance: number; hasBankDetails: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(hasBankDetails ? 2 : 1);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verified, setVerified] = useState(hasBankDetails);
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const nairaAmount = amount ? Math.round(parsedAmount * NAIRA_RATE) : 0;
  const remaining = Math.round((availableBalance - parsedAmount) * 100) / 100;

  async function handleVerify() {
    if (!bankName || accountNumber.length !== 10) return;
    try {
      const res = await fetch("/api/kekere/bank-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankName, accountNumber }) });
      if (res.ok) {
        const data = await res.json();
        setAccountName(data.accountName ?? "Account verified");
        setVerified(true);
        setStep(2);
      }
    } catch {}
  }

  async function handleSubmit() {
    try {
      const res = await fetch("/api/kekere/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cowriesAmount: parsedAmount }) });
      if (res.ok) {
        setSubmitted(true);
        setStep(4);
      }
    } catch {}
  }

  return (
    <div className="mx-auto max-w-[402px] px-[22px] pb-[80px] pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[rgba(42,26,18,0.08)]"><ArrowLeft size={16} className="text-[#8A7565]" /></button>
        <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold text-[#2A1A12]">Withdraw</h1>
      </div>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("flex h-[7px] w-[7px] rounded-full", s <= step ? "bg-[#1F8A5B]" : "bg-[rgba(42,26,18,0.12)]")} />
            {s < 4 && <div className={cn("h-px w-9", s < step ? "bg-[#1F8A5B]" : "bg-[rgba(42,26,18,0.12)]")} />}
          </div>
        ))}
      </div>

      {/* Step 1: Bank Details */}
      {step === 1 && (
        <div className="mt-6">
          <p className="text-[14px] text-[#8A7565]">Enter your bank details to receive withdrawals.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#2A1A12]">Bank name</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Access Bank" className="w-full rounded-[12px] border border-[rgba(42,26,18,0.12)] bg-white px-4 py-3 text-[14px] text-[#2A1A12] outline-none placeholder:text-[#A08C7C]" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#2A1A12]">Account number</label>
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.slice(0, 10))} placeholder="10-digit NUBAN" maxLength={10} className="w-full rounded-[12px] border border-[rgba(42,26,18,0.12)] bg-white px-4 py-3 text-[14px] text-[#2A1A12] outline-none placeholder:text-[#A08C7C]" />
            </div>
            {accountName && (
              <div className="flex items-center gap-2 rounded-[12px] bg-[#1F8A5B]/10 px-4 py-3">
                <Check size={16} className="text-[#1F8A5B]" />
                <span className="text-[13px] font-medium text-[#1F8A5B]">Account verified · {accountName}</span>
              </div>
            )}
            <button type="button" onClick={handleVerify} disabled={!bankName || accountNumber.length !== 10} className="w-full rounded-[12px] bg-[#C75D2C] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
              Verify account
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Amount */}
      {step === 2 && (
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
            onClick={() => setStep(3)}
            disabled={!amount || parsedAmount < MIN_WITHDRAWAL || parsedAmount > availableBalance}
            className="mt-5 w-full rounded-[12px] bg-[#1F8A5B] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Review withdrawal
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="mt-6">
          <div className="rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white px-5 py-5">
            <div className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1F8A5B]">&#8358;{nairaAmount.toLocaleString()}</div>
            <div className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between"><span className="text-[#8A7565]">Cowries</span><span className="text-[#2A1A12] font-medium">{amount} cowries</span></div>
              <div className="flex justify-between"><span className="text-[#8A7565]">Bank</span><span className="text-[#2A1A12] font-medium">{bankName}</span></div>
              <div className="flex justify-between"><span className="text-[#8A7565]">Account</span><span className="text-[#2A1A12] font-medium">****{accountNumber.slice(-3)}</span></div>
              <div className="flex justify-between"><span className="text-[#8A7565]">Remaining balance</span><span className="text-[#2A1A12] font-medium">{remaining.toFixed(2)} cowries</span></div>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-[#A08C7C] text-center">Your request will be reviewed by the admin team.</p>
          <button type="button" onClick={handleSubmit} className="mt-4 w-full rounded-[12px] bg-[#1F8A5B] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90">
            Confirm withdrawal
          </button>
        </div>
      )}

      {/* Step 4: Submitted */}
      {step === 4 && submitted && (
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
