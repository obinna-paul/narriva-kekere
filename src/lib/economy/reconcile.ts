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
 * Every wallet counts here, regardless of the account's role — an admin who
 * writes and publishes stories earns exactly as real a cowrie as anyone
 * else, and hiding it behind a role check made the dashboard actively wrong
 * (see the incident where a real 8.1-cowrie writer balance on the admin
 * account went missing from "Writer wallets"). What must never happen is an
 * admin account quietly holding *untracked* free cowries — that's caught by
 * `totalUntrackedBalance` below, and prevented going forward by disabling
 * the free-first-unlock benefit for ADMIN accounts entirely (see
 * unlockStory in cowries.ts).
 *
 * `totalUntrackedBalance` compares, per wallet bucket, what the ledger (this
 * wallet's own transaction rows) says the balance should be against what's
 * actually stored. A nonzero value means some wallet's balance isn't backed
 * by any transaction at all — e.g. legacy data from before the
 * spending/earned split (see the 20260628111523 migration, which copied the
 * old single `balance` column straight into `spendingBalance` with no
 * transaction to match) or a direct manual DB edit.
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

async function sumTransactionAmounts(types: TransactionType[]): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { type: { in: types }, status: "COMPLETED" },
    _sum: { amountCowries: true },
  });
  return result._sum.amountCowries?.toNumber() ?? 0;
}

/** Ledger-derived net (credits minus debits) for one wallet bucket. */
async function ledgerNetForBucket(walletField: WalletField): Promise<number> {
  const [credit, debit] = await Promise.all([
    prisma.transaction.aggregate({
      where: { walletField, type: { in: CREDIT_TYPES }, status: "COMPLETED" },
      _sum: { amountCowries: true },
    }),
    prisma.transaction.aggregate({
      where: { walletField, type: { in: DEBIT_TYPES }, status: "COMPLETED" },
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
    walletSums,
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
      _sum: { spendingBalance: true, earnedBalance: true },
    }),
    sumTransactionAmounts(["UNLOCK"]),
    sumTransactionAmounts(["EARNINGS_CREDIT"]),
    prisma.platformEarnings.aggregate({ _sum: { cowries: true } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "COMPLETED" },
      _sum: { cowriesAmount: true },
    }),
    ledgerNetForBucket("SPENDING"),
    ledgerNetForBucket("EARNED"),
  ]);

  const totalFromAdminAdjustments = totalAdminCredit - totalAdminDebit;
  const totalIssued = totalFromTopUps + totalFromReferralRewards + totalFromAdminAdjustments;

  const totalInSpendingWallets = walletSums._sum.spendingBalance ?? 0;
  const totalInEarnedWallets = walletSums._sum.earnedBalance?.toNumber() ?? 0;
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
    totalUntrackedBalance,
    equation: { left, right, difference },
    balanced: Math.abs(difference) <= RECONCILE_TOLERANCE_COWRIES,
  };
}
