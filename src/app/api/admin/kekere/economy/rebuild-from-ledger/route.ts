export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

/**
 * One-time data-cleanup: makes the whole economy reflect the truth of the
 * transaction ledger, and nothing else.
 *
 * 1. Deletes every manual-adjustment / data-correction transaction
 *    (ADMIN_CREDIT/DEBIT, DATA_CORRECTION_CREDIT/DEBIT) and any row that
 *    violates the positive-magnitude invariant (amountCowries <= 0). None of
 *    these represent real user purchases, earnings, or spending — they're the
 *    accumulated noise from earlier correction attempts and legacy data.
 * 2. Recomputes every wallet's spending & earned balance directly from its
 *    remaining (clean) transactions. Any balance that was never backed by a
 *    real transaction (a phantom/free balance) becomes 0 automatically.
 *
 * After this runs, stored balances exactly equal the real ledger, so
 * "untracked balance" is 0 and every dashboard figure reflects only genuine
 * top-ups, unlocks, tips, and earnings. Enum values are compared via ::text
 * so the query is safe even on a database where the newest migration hasn't
 * been applied yet.
 */
const DELETE_NOISE_SQL = `
  DELETE FROM "Transaction"
  WHERE type::text IN (
    'ADMIN_CREDIT', 'ADMIN_DEBIT',
    'DATA_CORRECTION_CREDIT', 'DATA_CORRECTION_DEBIT'
  )
  OR "amountCowries" <= 0
`;

const REBUILD_BALANCES_SQL = `
  UPDATE "Wallet" w SET
    "spendingBalance" = COALESCE(l.spending, 0)::int,
    "earnedBalance"   = COALESCE(l.earned, 0)
  FROM (
    SELECT wal.id AS wallet_id,
      SUM(CASE
        WHEN t."walletField" = 'SPENDING'
         AND t.type::text IN ('TOP_UP','REFUND','REFERRAL','READ_REWARD','REFERRAL_REWARD','EARNED_TO_SPENDING_IN')
          THEN t."amountCowries"
        WHEN t."walletField" = 'SPENDING'
         AND t.type::text IN ('UNLOCK','WITHDRAWAL','TIP_SENT')
          THEN -t."amountCowries"
        ELSE 0 END) AS spending,
      SUM(CASE
        WHEN t."walletField" = 'EARNED'
         AND t.type::text IN ('EARNINGS_CREDIT','TIP_RECEIVED','REFUND')
          THEN t."amountCowries"
        WHEN t."walletField" = 'EARNED'
         AND t.type::text IN ('WITHDRAWAL','EARNED_TO_SPENDING_OUT')
          THEN -t."amountCowries"
        ELSE 0 END) AS earned
    FROM "Wallet" wal
    LEFT JOIN "Transaction" t
      ON t."walletId" = wal.id AND t.status = 'COMPLETED'
    GROUP BY wal.id
  ) l
  WHERE l.wallet_id = w.id
`;

export const POST = withAuth(
  async (_request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const before = await prisma.wallet.findMany({
      select: {
        id: true,
        spendingBalance: true,
        earnedBalance: true,
        user: { select: { email: true, name: true } },
      },
    });

    const deletedNoise = await prisma.$transaction(async (tx) => {
      const deleted = await tx.$executeRawUnsafe(DELETE_NOISE_SQL);
      await tx.$executeRawUnsafe(REBUILD_BALANCES_SQL);
      return deleted;
    });

    const after = await prisma.wallet.findMany({
      select: {
        id: true,
        spendingBalance: true,
        earnedBalance: true,
      },
    });
    const afterById = new Map(after.map((w) => [w.id, w]));

    const changed = before
      .map((b) => {
        const a = afterById.get(b.id);
        return {
          email: b.user.email,
          name: b.user.name,
          spendingBefore: b.spendingBalance,
          spendingAfter: a?.spendingBalance ?? b.spendingBalance,
          earnedBefore: b.earnedBalance.toNumber(),
          earnedAfter: a?.earnedBalance.toNumber() ?? b.earnedBalance.toNumber(),
        };
      })
      .filter(
        (c) => c.spendingBefore !== c.spendingAfter || c.earnedBefore !== c.earnedAfter
      );

    await logAdminAction(session.user.id, session.user.id, "MANUAL_COWRIE_ADJUSTMENT", {
      reason: "Economy rebuilt from transaction ledger (one-time cleanup)",
      transactionsDeleted: deletedNoise,
      walletsChanged: changed.length,
    });

    return NextResponse.json({
      success: true,
      transactionsDeleted: deletedNoise,
      walletsChanged: changed.length,
      changed,
    });
  },
  { roles: ["ADMIN"] },
);
