export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

/**
 * One-time (repeatable) policy action: zeroes every admin account's
 * SPENDING balance only, each via a real, logged DATA_CORRECTION_DEBIT
 * transaction — never a silent balance edit. This cowrie was never
 * legitimately issued in the first place (it's untracked/free balance, not
 * a business decision), so unlike a normal ADMIN_DEBIT it's excluded from
 * totalIssued — clearing it shouldn't make "total issued" look like a huge
 * cowrie giveaway happened. Earned balance is never touched here: it's
 * real, withdrawable writer income regardless of the account's role, and
 * this endpoint has no way to tell "legitimate earnings" apart from
 * anything else in that bucket. Only spending accumulates untracked/free
 * cowries (e.g. from the old free-first-unlock benefit, now blocked for
 * admins in unlockStory), so that's the only thing this ever clears.
 */
export const POST = withAuth(
  async (_request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminWallets = await prisma.wallet.findMany({
      where: { user: { role: "ADMIN" }, spendingBalance: { not: 0 } },
      select: { id: true, userId: true, spendingBalance: true, user: { select: { name: true, email: true } } },
    });

    const cleared: Array<{ userId: string; name: string; email: string; spendingCleared: number }> = [];

    for (const wallet of adminWallets) {
      const spendingAmount = wallet.spendingBalance;

      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: { spendingBalance: 0 },
        }),
        prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: "DATA_CORRECTION_DEBIT",
            amountCowries: Math.abs(spendingAmount),
            walletField: "SPENDING",
            description: "Admin cowrie policy reset: admin accounts no longer hold spending cowries.",
            status: "COMPLETED",
          },
        }),
      ]);

      await logAdminAction(session.user.id, wallet.userId, "MANUAL_COWRIE_ADJUSTMENT", {
        reason: "Admin cowrie policy reset (spending only)",
        spendingCleared: spendingAmount,
      });

      cleared.push({
        userId: wallet.userId,
        name: wallet.user.name,
        email: wallet.user.email,
        spendingCleared: spendingAmount,
      });
    }

    return NextResponse.json({ success: true, cleared });
  },
  { roles: ["ADMIN"] },
);
