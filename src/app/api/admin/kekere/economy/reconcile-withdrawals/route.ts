export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getSetting } from "@/lib/settings/get";
import { reconcileWithdrawalDebits } from "@/lib/economy/reconcile-withdrawals";
import { logAdminAction } from "@/lib/admin/logAction";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

/**
 * Finds every COMPLETED withdrawal whose wallet debit never actually
 * landed (see reconcile-withdrawals.ts for how that happens), and fixes
 * each one it finds. Safe to run any number of times — a withdrawal
 * already correctly recorded is left untouched, so this never double-debits.
 */
export const POST = withAuth(
  async (_request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { found, fixed } = await reconcileWithdrawalDebits();

    if (fixed.length > 0) {
      await logAdminAction(session.user.id, session.user.id, "RECONCILE_WITHDRAWAL_DEBITS", {
        fixed: fixed.map((f) => ({
          withdrawalId: f.withdrawalId,
          userEmail: f.userEmail,
          cowriesAmount: f.cowriesAmount,
          issue: f.issue,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      found: found.length,
      fixed: fixed.map((f) => ({
        userEmail: f.userEmail,
        userName: f.userName,
        cowriesAmount: f.cowriesAmount,
        issue: f.issue,
      })),
    });
  },
  { roles: ["ADMIN"] },
);
