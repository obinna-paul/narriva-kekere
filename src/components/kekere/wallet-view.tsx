"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Copy, Check, Zap, Mail, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TopUpModal } from "@/components/kekere/top-up-modal";
import { HistoryExportModal } from "@/components/kekere/history-export-modal";
import { MoveToSpendingModal } from "@/components/kekere/move-to-spending-modal";

export interface WalletTransactionView {
  id: string;
  type: "TOP_UP" | "UNLOCK" | "REFUND" | "WITHDRAWAL" | "TIP" | "REFERRAL" | "READ_REWARD" | "TIP_SENT" | "TIP_RECEIVED" | "REFERRAL_REWARD" | "EARNINGS_CREDIT" | "PLATFORM_EARNINGS" | "ADMIN_CREDIT" | "ADMIN_DEBIT" | "DATA_CORRECTION_CREDIT" | "DATA_CORRECTION_DEBIT" | "EARNED_TO_SPENDING_OUT" | "EARNED_TO_SPENDING_IN";
  amountCowries: number;
  amountNgn?: number | null;
  description: string | null;
  date: string;
  status?: "PENDING" | "COMPLETED" | "FAILED";
}

export interface WalletViewProps {
  spendingBalance: number;
  earnedBalance: number;
  userId: string;
  userEmail: string;
  isWriter: boolean;
  transactions: readonly WalletTransactionView[];
  totalTransactionCount: number;
  referralCode: string | null;
  referralEarnings: number;
  tipEarnings: number;
}

const NAIRA_RATE = 50;
const HISTORY_PAGE_SIZE = 10;

// Every transaction is stored as a positive magnitude regardless of
// direction — whether it's a debit (money leaving the wallet) or a credit
// depends entirely on the type, not the sign of amountCowries.
const DEBIT_TX_TYPES = new Set(["UNLOCK", "WITHDRAWAL", "TIP_SENT", "ADMIN_DEBIT", "DATA_CORRECTION_DEBIT", "EARNED_TO_SPENDING_OUT"]);

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
}

const TX_ICONS: Record<string, { icon: typeof ArrowDownLeft; color: string }> = {
  TOP_UP: { icon: ArrowDownLeft, color: "#1F8A5B" },
  UNLOCK: { icon: ArrowUpRight, color: "#C0392B" },
  WITHDRAWAL: { icon: ArrowUpRight, color: "#C0392B" },
  REFERRAL_REWARD: { icon: ArrowDownLeft, color: "#1F8A5B" },
  EARNINGS_CREDIT: { icon: ArrowDownLeft, color: "#1F8A5B" },
  TIP_RECEIVED: { icon: ArrowDownLeft, color: "#1F8A5B" },
  TIP_SENT: { icon: ArrowUpRight, color: "#C0392B" },
  ADMIN_CREDIT: { icon: ArrowDownLeft, color: "#1F8A5B" },
  ADMIN_DEBIT: { icon: ArrowUpRight, color: "#C0392B" },
  DATA_CORRECTION_CREDIT: { icon: ArrowDownLeft, color: "#1F8A5B" },
  DATA_CORRECTION_DEBIT: { icon: ArrowUpRight, color: "#C0392B" },
  EARNED_TO_SPENDING_OUT: { icon: ArrowUpRight, color: "#C0392B" },
  EARNED_TO_SPENDING_IN: { icon: ArrowDownLeft, color: "#1F8A5B" },
};

function TxIcon({ type }: { type: string }) {
  const def = TX_ICONS[type] ?? { icon: ArrowDownLeft, color: "#8A7565" };
  const Icon = def.icon;
  return (
    <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[12px] bg-[rgba(42,26,18,0.06)]" style={{ color: def.color }}>
      <Icon size={16} />
    </div>
  );
}

function TxLabel(type: string): string {
  const map: Record<string, string> = {
    TOP_UP: "Top-up", UNLOCK: "Story unlock", WITHDRAWAL: "Withdrawal",
    REFERRAL_REWARD: "Referral reward",
    TIP_SENT: "Tip sent", TIP_RECEIVED: "Tip received",
    EARNINGS_CREDIT: "Earnings", REFERRAL: "Referral",
    READ_REWARD: "Read reward", PLATFORM_EARNINGS: "Platform earnings",
    ADMIN_CREDIT: "Balance adjustment", ADMIN_DEBIT: "Balance adjustment",
    DATA_CORRECTION_CREDIT: "Balance correction", DATA_CORRECTION_DEBIT: "Balance correction",
    EARNED_TO_SPENDING_OUT: "Moved to spending", EARNED_TO_SPENDING_IN: "Moved from earnings",
  };
  return map[type] ?? type;
}

function getWalletForTx(type: string): string | null {
  if (["TOP_UP", "UNLOCK", "TIP_SENT", "REFERRAL_REWARD", "EARNED_TO_SPENDING_IN"].includes(type)) return "Spending";
  if (["EARNINGS_CREDIT", "WITHDRAWAL", "TIP_RECEIVED", "EARNED_TO_SPENDING_OUT"].includes(type)) return "Earned";
  return null;
}

export function WalletView({
  spendingBalance, earnedBalance, userId, userEmail, isWriter,
  transactions, totalTransactionCount, referralCode, referralEarnings, tipEarnings,
}: WalletViewProps) {
  const router = useRouter();
  const [showTopUp, setShowTopUp] = useState(false);
  const [showHistoryExport, setShowHistoryExport] = useState(false);
  const [showMoveToSpending, setShowMoveToSpending] = useState(false);
  const [copied, setCopied] = useState(false);

  const visibleTransactions = transactions.slice(0, HISTORY_PAGE_SIZE);
  const hasMoreHistory = totalTransactionCount > HISTORY_PAGE_SIZE;

  const nairaValue = earnedBalance * NAIRA_RATE;

  return (
    <div className="mx-auto max-w-[402px] px-[22px] pb-[120px] pt-6">
      <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#2A1A12] tracking-[-0.01em]">Wallet</h1>

      {/* Two-balance cards */}
      <div className="mt-5 flex flex-col gap-[14px]">
        {/* Earned balance card (writer primary) */}
        {isWriter && (
          <div className="overflow-hidden rounded-[20px] shadow-[0_6px_30px_rgba(42,26,18,0.12)]" style={{ background: "linear-gradient(135deg, #1F8A5B 0%, #176E48 100%)" }}>
            <div className="px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-white/80">Earned balance · Withdrawable</span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white">Writer</span>
              </div>
              <div className="mt-3 font-[family-name:var(--font-display)] text-[36px] font-semibold text-white tracking-[-0.01em]">
                {earnedBalance.toFixed(2)} <span className="text-[24px]">cowries</span>
              </div>
              <div className="mt-1 text-[15px] text-white/70">~&#8358;{nairaValue.toLocaleString()}</div>
              <button
                type="button"
                onClick={() => router.push("/kekere/wallet/withdraw")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-white py-3 text-[14px] font-semibold text-[#176E48] transition-opacity hover:opacity-90"
              >
                Withdraw to bank <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowMoveToSpending(true)}
                disabled={earnedBalance < 1}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-white/30 py-3 text-[14px] font-semibold text-white transition-opacity hover:bg-white/10 disabled:opacity-50"
              >
                Move to spending
              </button>
            </div>
          </div>
        )}

        {/* Spending balance card */}
        <div className="overflow-hidden rounded-[20px] bg-[#2A1A12] shadow-[0_6px_30px_rgba(42,26,18,0.12)]">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#A08C7C]">Spending balance</span>
              <span className="text-[19px] text-[#E9A56B]">&#9670;</span>
            </div>
            <div className="mt-3 font-[family-name:var(--font-display)] text-[36px] font-semibold text-white tracking-[-0.01em]">
              {spendingBalance.toLocaleString()} <span className="text-[24px] text-[#A08C7C]">cowries</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTopUp(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#C75D2C] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Zap size={15} /> Top up
            </button>
          </div>
          {/* Reader view — minimal earned row */}
          {!isWriter && (
            <div className="border-t border-white/10 px-5 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#A08C7C]">Earned balance · {earnedBalance.toFixed(2)} cowries</span>
                <span className="text-[12px] text-white/50">Publish a story to start earning</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {isWriter && (
        <div className="mt-[14px]">
          <Link href="/kekere/analytics" className="flex items-center justify-between rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4 transition-colors hover:border-[#1F8A5B]/40">
            <div className="flex items-center gap-3">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-[#1F8A5B]/10 text-[#1F8A5B]">
                <BarChart3 size={16} />
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#2A1A12]">Analytics &amp; earnings</div>
                <div className="text-[12px] text-[#8A7565]">Reads, completion, ratings &amp; your earnings ledger</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8A7565]" />
          </Link>
        </div>
      )}

      {referralCode && (
        <div className="mt-[14px]">
          <Link href="/kekere/invite" className="flex items-center justify-between rounded-[14px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4 transition-colors hover:border-[#C75D2C]/30">
            <div className="flex items-center gap-3">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-[#C75D2C]/10 text-[#C75D2C]">
                <Zap size={16} />
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#2A1A12]">Invite friends, earn cowries</div>
                <div className="text-[12px] text-[#8A7565]">{referralEarnings} cowries earned</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8A7565]" />
          </Link>
        </div>
      )}

      {/* Transaction history */}
      <div className="mt-[24px]">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#2A1A12]">History</h2>
        <div className="flex flex-col gap-[2px]">
          {transactions.length === 0 && (
            <p className="py-8 text-center text-[14px] text-[#8A7565]">No transactions yet</p>
          )}
          {visibleTransactions.map((tx) => {
            const isDebit = DEBIT_TX_TYPES.has(tx.type);
            const wallet = isWriter ? getWalletForTx(tx.type) : null;
            return (
              <div key={tx.id} className="flex items-center gap-3 rounded-[13px] px-3 py-3 transition-colors hover:bg-[rgba(42,26,18,0.03)]">
                <TxIcon type={tx.type} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[#2A1A12]">{TxLabel(tx.type)}</div>
                  <div className="flex items-center gap-2 text-[12px] text-[#8A7565]">
                    <span>{tx.description}</span>
                    {wallet && <span className="text-[#A08C7C]">· {wallet}</span>}
                    {tx.status === "PENDING" && (
                      <span className="rounded-full bg-[#B7791F]/15 px-2 py-0.5 text-[11px] font-medium text-[#B7791F]">Pending</span>
                    )}
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className={cn("text-[14px] font-semibold", isDebit ? "text-[#C0392B]" : "text-[#1F8A5B]")}>
                    {isDebit ? "-" : "+"}{tx.amountCowries}
                  </div>
                  <div className="text-[11px] text-[#A08C7C]">{new Date(tx.date).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMoreHistory && (
          <button
            type="button"
            onClick={() => setShowHistoryExport(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] border border-[rgba(42,26,18,0.10)] bg-white py-3 text-[13px] font-semibold text-[#2A1A12] transition-colors hover:border-[#C75D2C]/30"
          >
            <Mail size={14} /> Request full transaction history
          </button>
        )}
      </div>

      {/* Top-up modal */}
      {showTopUp && (
        <TopUpModal
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => { setShowTopUp(false); router.refresh(); }}
        />
      )}

      {/* Full history export modal */}
      {showHistoryExport && (
        <HistoryExportModal
          userEmail={userEmail}
          onClose={() => setShowHistoryExport(false)}
        />
      )}

      {/* Move earned → spending modal */}
      {showMoveToSpending && (
        <MoveToSpendingModal
          earnedBalance={earnedBalance}
          onClose={() => setShowMoveToSpending(false)}
          onSuccess={() => { setShowMoveToSpending(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
