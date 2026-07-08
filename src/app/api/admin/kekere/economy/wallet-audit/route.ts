export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { CREDIT_TYPES, DEBIT_TYPES } from "@/lib/economy/reconcile";

const TOLERANCE_COWRIES = 1;
const MAX_ROWS = 50;

/**
 * Per-wallet version of the reconciliation check: for every wallet, compares
 * its actual spending/earned balances against what its own transaction
 * history says they should be. Surfaces exactly which accounts hold
 * untracked balance (legacy pre-ledger data, a manual DB edit, etc.) instead
 * of leaving it blended into the system-wide totals. Every wallet is
 * checked regardless of role — an admin account is no less capable of
 * holding untracked balance than anyone else.
 */
export const GET = withAuth(
  async () => {
    const [wallets, creditRows, debitRows] = await Promise.all([
      prisma.wallet.findMany({
        select: {
          id: true,
          userId: true,
          spendingBalance: true,
          earnedBalance: true,
          user: { select: { email: true, name: true } },
        },
      }),
      prisma.transaction.findMany({
        where: { type: { in: CREDIT_TYPES }, status: "COMPLETED" },
        select: { walletId: true, walletField: true, amountCowries: true },
      }),
      prisma.transaction.findMany({
        where: { type: { in: DEBIT_TYPES }, status: "COMPLETED" },
        select: { walletId: true, walletField: true, amountCowries: true },
      }),
    ]);

    // Summed as |amountCowries| per row, not a raw SQL SUM — amountCowries
    // is supposed to always be a positive magnitude, but rows written
    // before that convention existed can carry a signed value instead, and
    // a raw SUM would let a stray negative row silently cancel out real
    // ones.
    const ledgerNet = new Map<string, number>();
    for (const row of creditRows) {
      if (!row.walletField) continue;
      const key = `${row.walletId}:${row.walletField}`;
      ledgerNet.set(key, (ledgerNet.get(key) ?? 0) + Math.abs(row.amountCowries.toNumber()));
    }
    for (const row of debitRows) {
      if (!row.walletField) continue;
      const key = `${row.walletId}:${row.walletField}`;
      ledgerNet.set(key, (ledgerNet.get(key) ?? 0) - Math.abs(row.amountCowries.toNumber()));
    }

    const rows = wallets
      .map((w) => {
        const expectedSpending = ledgerNet.get(`${w.id}:SPENDING`) ?? 0;
        const expectedEarned = ledgerNet.get(`${w.id}:EARNED`) ?? 0;
        const spendingDiff = w.spendingBalance - expectedSpending;
        const earnedDiff = w.earnedBalance.toNumber() - expectedEarned;
        return {
          walletId: w.id,
          userId: w.userId,
          email: w.user.email,
          name: w.user.name,
          actualSpending: w.spendingBalance,
          expectedSpending,
          spendingDiff,
          actualEarned: w.earnedBalance.toNumber(),
          expectedEarned,
          earnedDiff,
          totalDiff: spendingDiff + earnedDiff,
        };
      })
      .filter((r) => Math.abs(r.totalDiff) > TOLERANCE_COWRIES)
      .sort((a, b) => Math.abs(b.totalDiff) - Math.abs(a.totalDiff))
      .slice(0, MAX_ROWS);

    return NextResponse.json({ rows, totalFlagged: rows.length });
  },
  { roles: ["ADMIN"] },
);
