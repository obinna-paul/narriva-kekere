export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

/**
 * One-time (repeatable) policy action: zeroes every admin account's
 * spending AND earned balance, each via a real, logged ADMIN_DEBIT
 * transaction — never a silent balance edit. Pairs with the free-unlock
 * block in unlockStory(): from here on, admin accounts shouldn't accumulate
 * any cowries at all, tracked or otherwise.
 */
export const POST = withAuth(
  async (_request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminWallets = await prisma.wallet.findMany({
      where: { user: { role: "ADMIN" }, OR: [{ spendingBalance: { not: 0 } }, { earnedBalance: { not: 0 } }] },
      select: { id: true, userId: true, spendingBalance: true, earnedBalance: true, user: { select: { name: true, email: true } } },
    });

    const cleared: Array<{ userId: string; name: string; email: string; spendingCleared: number; earnedCleared: number }> = [];

    for (const wallet of adminWallets) {
      const spendingAmount = wallet.spendingBalance;
      const earnedAmount = wallet.earnedBalance.toNumber();

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: { spendingBalance: 0, earnedBalance: 0 },
        }),
        ...(spendingAmount !== 0
          ? [
              prisma.transaction.create({
                data: {
                  walletId: wallet.id,
                  type: "ADMIN_DEBIT" as const,
                  amountCowries: Math.abs(spendingAmount),
                  walletField: "SPENDING" as const,
                  description: "Admin cowrie policy reset: admin accounts no longer hold spending cowries.",
                  status: "COMPLETED" as const,
                },
              }),
            ]
          : []),
        ...(earnedAmount !== 0
          ? [
              prisma.transaction.create({
                data: {
                  walletId: wallet.id,
                  type: "ADMIN_DEBIT" as const,
                  amountCowries: Math.abs(earnedAmount),
                  walletField: "EARNED" as const,
                  description: "Admin cowrie policy reset: admin accounts no longer hold earned cowries.",
                  status: "COMPLETED" as const,
                },
              }),
            ]
          : []),
      ]);

      await logAdminAction(session.user.id, wallet.userId, "MANUAL_COWRIE_ADJUSTMENT", {
        reason: "Admin cowrie policy reset",
        spendingCleared: spendingAmount,
        earnedCleared: earnedAmount,
      });

      cleared.push({
        userId: wallet.userId,
        name: wallet.user.name,
        email: wallet.user.email,
        spendingCleared: spendingAmount,
        earnedCleared: earnedAmount,
      });
    }

    return NextResponse.json({ success: true, cleared });
  },
  { roles: ["ADMIN"] },
);
