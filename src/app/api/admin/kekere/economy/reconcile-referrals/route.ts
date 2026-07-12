export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";
import { reconcilePendingReferralRewards } from "@/lib/data/kekere-referrals";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

/**
 * Pays out every referral reward that should already have been earned — a
 * PENDING referral whose invitee has since made a qualifying top-up — but was
 * missed by the old top-up hook (which fired fire-and-forget and only on a
 * fresh credit). Idempotent: only genuinely-unpaid rewards move money.
 */
export const POST = withAuth(
  async (_request, session) => {
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await reconcilePendingReferralRewards();

    await logAdminAction(session.user.id, session.user.id, "MANUAL_COWRIE_ADJUSTMENT", {
      reason: "Reconciled missed referral rewards",
      referralsChecked: result.checked,
      referralsRewarded: result.rewarded,
    });

    return NextResponse.json({ success: true, ...result });
  },
  { roles: ["ADMIN"] },
);
