export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { reconcilePendingReferralRewards } from "@/lib/data/kekere-referrals";

/**
 * Automatic safety net on top of the payment-time hooks in verify/webhook:
 * if a top-up somehow never reached either of them, this sweep still finds
 * and pays the referral reward on the next scheduled run. Idempotent — only
 * genuinely-unpaid rewards move money.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcilePendingReferralRewards();
  return NextResponse.json(result);
}
