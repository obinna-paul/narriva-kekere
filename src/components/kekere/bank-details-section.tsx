"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export interface BankDetailsProp {
  bankName: string;
  bankCode: string;
  accountNumberLast4: string;
  accountName: string;
  verifiedAt: Date | string | null;
}

interface Bank {
  name: string;
  code: string;
}

export function BankDetailsSection({ bankDetails }: { bankDetails: BankDetailsProp | null }) {
  const [editing, setEditing] = useState(!bankDetails);
  const [saved, setSaved] = useState(bankDetails);
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [bankQuery, setBankQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || banks || banksError) return;
    fetch("/api/kekere/banks")
      .then((res) => res.json())
      .then((data) => {
        if (data.banks) setBanks(data.banks);
        else setBanksError(data.error ?? "Could not load bank list");
      })
      .catch(() => setBanksError("Could not load bank list. Check your connection and reopen this section."));
  }, [editing, banks, banksError]);

  const filteredBanks = bankQuery
    ? (banks ?? []).filter((b) => b.name.toLowerCase().includes(bankQuery.toLowerCase()))
    : banks ?? [];

  async function handleVerify() {
    if (!selectedBank || accountNumber.length !== 10) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/kekere/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName: selectedBank.name, bankCode: selectedBank.code, accountNumber }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setVerifyError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (!data.verified) {
        setVerifyError(data.warning ?? "We could not verify this account. Please double-check your details.");
        return;
      }
      setSaved({
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumberLast4: accountNumber.slice(-4),
        accountName: data.accountName ?? "",
        verifiedAt: new Date().toISOString(),
      });
      setEditing(false);
      setSelectedBank(null);
      setAccountNumber("");
      setBankQuery("");
    } catch {
      setVerifyError("Network error. Please check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div id="bank-details" className="border-t border-[rgba(42,26,18,0.1)] px-[22px] pb-[22px] pt-[22px] scroll-mt-6">
      <p className="mb-[14px] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted-2)]">
        Bank details for withdrawals
      </p>

      {!editing && saved ? (
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-semibold text-[var(--color-ink)]">{saved.bankName}</span>
              {saved.verifiedAt ? (
                <span className="flex flex-none items-center gap-1 rounded-full bg-[#1F8A5B]/10 px-2 py-[2px] text-[11px] font-medium text-[#1F8A5B]">
                  <Check size={11} /> Verified
                </span>
              ) : (
                <span className="flex-none rounded-full bg-[#B7791F]/10 px-2 py-[2px] text-[11px] font-medium text-[#B7791F]">
                  Not verified
                </span>
              )}
            </div>
            <div className="mt-1 truncate text-[13px] text-[var(--color-ink-muted-2)]">
              {saved.accountName || "Unknown account holder"} &middot; ****{saved.accountNumberLast4}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-none text-[13.5px] font-semibold text-[var(--color-primary)]"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-[14px]">
          <div>
            <label htmlFor="bank-search" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
              Bank
            </label>
            <input
              id="bank-search"
              value={selectedBank ? selectedBank.name : bankQuery}
              onChange={(e) => {
                setSelectedBank(null);
                setBankQuery(e.target.value);
              }}
              placeholder={banksError ? "Bank list unavailable" : banks ? "Search for your bank" : "Loading banks…"}
              disabled={!!banksError || !banks}
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:opacity-60"
              style={{ fontFamily: "inherit" }}
            />
            {bankQuery && !selectedBank && filteredBanks.length > 0 && (
              <div className="mt-1 max-h-[180px] overflow-y-auto rounded-[10px] border border-[rgba(42,26,18,0.12)] bg-white">
                {filteredBanks.slice(0, 30).map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => {
                      setSelectedBank(b);
                      setBankQuery("");
                    }}
                    className="block w-full px-[15px] py-[10px] text-left text-[14px] text-[var(--color-ink)] hover:bg-[rgba(199,93,44,0.06)]"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
            {banksError && <p className="mt-[6px] text-[12.5px] text-[#A13A3A]">{banksError}</p>}
          </div>

          <div>
            <label htmlFor="bank-account-number" className="mb-[7px] block text-[13px] font-semibold text-[#4A372C]">
              Account number
            </label>
            <input
              id="bank-account-number"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="0123456789"
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-[15px] py-[13px] text-[15px] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              style={{ fontFamily: "inherit" }}
            />
          </div>

          {verifyError && <p className="text-[12.5px] text-[#A13A3A]">{verifyError}</p>}

          <div className="flex gap-[10px]">
            {saved && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setVerifyError(null);
                }}
                className="flex-none rounded-[10px] border border-[rgba(42,26,18,0.16)] px-4 py-[12px] text-[14px] font-semibold text-[var(--color-ink-muted)]"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleVerify}
              disabled={!selectedBank || accountNumber.length !== 10 || verifying}
              className="flex-1 rounded-[10px] bg-[#C75D2C] py-[12px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? "Verifying…" : "Verify account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
