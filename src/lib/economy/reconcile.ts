/**
 * Cowrie ledger reconciliation.
 *
 * Cowries are either "issued" into a spending wallet (top-ups, referral
 * rewards, manual admin credits) or removed from circulation. Every unlock
 * moves cowries out of a reader's spending wallet: the writer's share lands
 * in the writer's earned wallet, the platform's share becomes realized
 * platform revenue (it is never held in any wallet). Tips just move a
 * cowrie from one spending wallet to an earned wallet — net zero, so they
 * don't appear as a term below. Withdrawals remove cowries from circulation
 * entirely (paid out to a bank account).
 *
 * The identity that must hold, given the above:
 *
 *   totalIssued = totalInSpendingWallets + totalInEarnedWallets
 *                 + totalPlatformEarned + totalWithdrawnCowries
 *
 * Admin accounts are excluded from every term here — an admin's own wallet
 * is a test/free account, never a real reader or writer, and folding it into
 * "cowries in circulation" makes that figure meaningless. Its balance is
 * still reported, separately, as `totalHeldByAdmin` for transparency.
 *
 * `totalUntrackedBalance` is a second, independent check: for each wallet
 * bucket, it compares what the ledger (this wallet's own transaction rows)
 * says the balance should be against what's actually stored. A nonzero
 * value means some wallet's balance isn't backed by any transaction at all
 * — e.g. legacy data from before the spending/earned split (see the
 * 20260628111523 migration, which copied the old single `balance` column
 * straight into `spendingBalance` with no transaction to match) or a direct
 * manual DB edit. This is what should actually be investigated, not the
 * admin's own balance.
 */
import { prisma } from "@/lib/db/prisma";
import type { TransactionType, WalletField } from "@prisma/client";

export interface ReconcileResult {
  totalIssued: number;
  // Breakdown of totalIssued by source — the "no one has bought any
  // cowries" question can't be answered from totalIssued alone, since it
  // silently blends real Paystack revenue with free referral rewards and
  // manual admin corrections.
  totalFromTopUps: number;
  totalFromReferralRewards: number;
  totalFromAdminAdjustments: number; // net: admin credits minus admin debits
  totalInSpendingWallets: number;
  totalInEarnedWallets: number;
  totalSpentOnUnlocks: number;
  totalEarningsDistributed: number;
  totalPlatformEarned: number;
  totalWithdrawnCowries: number;
  // Informational only — excluded from every figure above.
  totalHeldByAdmin: number;
  // Balance not backed by any transaction row — a data-integrity signal,
  // not a "someone forgot to top up" signal.
  totalUntrackedBalance: number;
  equation: {
    left: number; // totalIssued
    right: number; // totalInSpendingWallets + totalInEarnedWallets + totalPlatformEarned + totalWithdrawnCowries
    difference: number;
  };
  balanced: boolean;
}

const RECONCILE_TOLERANCE_COWRIES = 1;

// A transaction's amountCowries is always a positive magnitude regardless of
// direction — these lists are what determine the sign of its contribution
// to a wallet bucket (same convention used by the wallet history UI).
export const CREDIT_TYPES: TransactionType[] = [
  "TOP_UP", "REFUND", "REFERRAL", "READ_REWARD", "TIP_RECEIVED",
  "REFERRAL_REWARD", "EARNINGS_CREDIT", "ADMIN_CREDIT",
];
export const DEBIT_TYPES: TransactionType[] = ["UNLOCK", "WITHDRAWAL", "TIP_SENT", "ADMIN_DEBIT"];

const NON_ADMIN_WALLET = { user: { role: { not: "ADMIN" as const } } };

async function sumTransactionAmounts(types: TransactionType[]): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { type: { in: types }, status: "COMPLETED", wallet: NON_ADMIN_WALLET },
    _sum: { amountCowries: true },
  });
  return result._sum.amountCowries?.toNumber() ?? 0;
}

/** Ledger-derived net (credits minus debits) for one wallet bucket, non-admin wallets only. */
async function ledgerNetForBucket(walletField: WalletField): Promise<number> {
  const [credit, debit] = await Promise.all([
    prisma.transaction.aggregate({
      where: { walletField, type: { in: CREDIT_TYPES }, status: "COMPLETED", wallet: NON_ADMIN_WALLET },
      _sum: { amountCowries: true },
    }),
    prisma.transaction.aggregate({
      where: { walletField, type: { in: DEBIT_TYPES }, status: "COMPLETED", wallet: NON_ADMIN_WALLET },
      _sum: { amountCowries: true },
    }),
  ]);
  return (credit._sum.amountCowries?.toNumber() ?? 0) - (debit._sum.amountCowries?.toNumber() ?? 0);
}

export async function reconcileEconomy(): Promise<ReconcileResult> {
  const [
    totalFromTopUps,
    totalFromReferralRewards,
    totalAdminCredit,
    totalAdminDebit,
    nonAdminWalletSums,
    adminWalletSums,
    totalSpentOnUnlocks,
    totalEarningsDistributed,
    platformEarningsSum,
    withdrawalSum,
    expectedSpendingNet,
    expectedEarnedNet,
  ] = await Promise.all([
    sumTransactionAmounts(["TOP_UP"]),
    sumTransactionAmounts(["REFERRAL_REWARD"]),
    sumTransactionAmounts(["ADMIN_CREDIT"]),
    sumTransactionAmounts(["ADMIN_DEBIT"]),
    prisma.wallet.aggregate({
      where: NON_ADMIN_WALLET,
      _sum: { spendingBalance: true, earnedBalance: true },
    }),
    prisma.wallet.aggregate({
      where: { user: { role: "ADMIN" } },
      _sum: { spendingBalance: true, earnedBalance: true },
    }),
    sumTransactionAmounts(["UNLOCK"]),
    sumTransactionAmounts(["EARNINGS_CREDIT"]),
    prisma.platformEarnings.aggregate({ _sum: { cowries: true } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "COMPLETED", user: { role: { not: "ADMIN" } } },
      _sum: { cowriesAmount: true },
    }),
    ledgerNetForBucket("SPENDING"),
    ledgerNetForBucket("EARNED"),
  ]);

  const totalFromAdminAdjustments = totalAdminCredit - totalAdminDebit;
  const totalIssued = totalFromTopUps + totalFromReferralRewards + totalFromAdminAdjustments;

  const totalInSpendingWallets = nonAdminWalletSums._sum.spendingBalance ?? 0;
  const totalInEarnedWallets = nonAdminWalletSums._sum.earnedBalance?.toNumber() ?? 0;
  const totalHeldByAdmin =
    (adminWalletSums._sum.spendingBalance ?? 0) + (adminWalletSums._sum.earnedBalance?.toNumber() ?? 0);
  const totalPlatformEarned = platformEarningsSum._sum.cowries?.toNumber() ?? 0;
  const totalWithdrawnCowries = withdrawalSum._sum.cowriesAmount?.toNumber() ?? 0;

  // Any gap between what's actually in a wallet bucket and what its own
  // transaction history says should be there — real activity, correctly
  // recorded, nets to zero here. A nonzero value is untracked/legacy data.
  const totalUntrackedBalance =
    (totalInSpendingWallets - expectedSpendingNet) + (totalInEarnedWallets - expectedEarnedNet);

  const left = totalIssued;
  const right = totalInSpendingWallets + totalInEarnedWallets + totalPlatformEarned + totalWithdrawnCowries;
  const difference = left - right;

  return {
    totalIssued,
    totalFromTopUps,
    totalFromReferralRewards,
    totalFromAdminAdjustments,
    totalInSpendingWallets,
    totalInEarnedWallets,
    totalSpentOnUnlocks,
    totalEarningsDistributed,
    totalPlatformEarned,
    totalWithdrawnCowries,
    totalHeldByAdmin,
    totalUntrackedBalance,
    equation: { left, right, difference },
    balanced: Math.abs(difference) <= RECONCILE_TOLERANCE_COWRIES,
  };
}
