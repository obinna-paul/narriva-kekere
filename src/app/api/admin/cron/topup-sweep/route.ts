export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { reconcileRecentTopUps } from "@/lib/economy/reconcile-topups";

/**
 * Frequent, narrow-window companion to the nightly maintenance cron's
 * 72-hour deep sweep (src/app/api/admin/cron/maintenance/route.ts) — that
 * one stays as the ultimate backstop, this one exists so a reader whose
 * top-up missed both the client verify and the webhook doesn't have to wait
 * up to 24 hours for it to self-correct. sinceHours is generously wider
 * than the actual run interval (a few hours vs. 15 minutes) purely as
 * slack against a missed run or deploy, not because it needs to be — every
 * credit is idempotent and keyed on the Paystack reference, so overlapping
 * windows just mean most rows are already-credited no-ops.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcileRecentTopUps({ sinceHours: 3 });
  return NextResponse.json(result);
}
