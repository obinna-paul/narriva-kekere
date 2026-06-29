/**
 * Cowrie ledger reconciliation.
 *
 * Cowries are either "issued" into a spending wallet (top-ups, completion
 * bonuses, referral rewards), spent on unlocks (split into a writer's
 * EARNINGS_CREDIT and the platform's PlatformEarnings cut), moved between
 * spending and earned wallets via tips (a transfer, not new issuance), or
 * withdrawn out of the system entirely. Tips net out of the equation below
 * algebraically — they leave both sides of every wallet's books, they just
 * change which wallet holds them — so they aren't tracked as a separate term.
 */
import { prisma } from "@/lib/db/prisma";
import type { TransactionType } from "@prisma/client";

export interface ReconcileResult {
  totalIssued: number;
  totalInSpendingWallets: number;
  totalInEarnedWallets: number;
  totalSpentOnUnlocks: number;
  totalEarningsDistributed: number;
  totalPlatformEarned: number;
  totalWithdrawnCowries: number;
  equation: {
    left: number; // totalIssued + totalEarningsDistributed
    right: number; // totalInSpendingWallets + totalInEarnedWallets + totalSpentOnUnlocks + totalWithdrawnCowries
    difference: number;
  };
  balanced: boolean;
}

const RECONCILE_TOLERANCE_COWRIES = 10;

async function sumTransactionAmounts(types: TransactionType[]): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { type: { in: types }, status: "COMPLETED" },
    _sum: { amountCowries: true },
  });
  return result._sum.amountCowries ?? 0;
}

export async function reconcileEconomy(): Promise<ReconcileResult> {
  const [
    totalIssued,
    walletSums,
    totalSpentOnUnlocks,
    totalEarningsDistributed,
    platformEarningsSum,
    withdrawalSum,
  ] = await Promise.all([
    sumTransactionAmounts(["TOP_UP", "COMPLETION_BONUS", "REFERRAL_REWARD"]),
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
  ]);

  const totalInSpendingWallets = walletSums._sum.spendingBalance ?? 0;
  const totalInEarnedWallets = walletSums._sum.earnedBalance ?? 0;
  const totalPlatformEarned = platformEarningsSum._sum.cowries ?? 0;
  const totalWithdrawnCowries = withdrawalSum._sum.cowriesAmount ?? 0;

  const left = totalIssued + totalEarningsDistributed;
  const right =
    totalInSpendingWallets + totalInEarnedWallets + totalSpentOnUnlocks + totalWithdrawnCowries;
  const difference = left - right;

  return {
    totalIssued,
    totalInSpendingWallets,
    totalInEarnedWallets,
    totalSpentOnUnlocks,
    totalEarningsDistributed,
    totalPlatformEarned,
    totalWithdrawnCowries,
    equation: { left, right, difference },
    balanced: Math.abs(difference) <= RECONCILE_TOLERANCE_COWRIES,
  };
}
