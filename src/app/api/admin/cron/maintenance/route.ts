export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sweepExpiredRateLimits } from "@/lib/rate-limit";
import { reconcileRecentTopUps } from "@/lib/economy/reconcile-topups";

/** Kemi conversations are retired after three hours of silence (see the
 *  conversation route) but the rows were kept forever, each holding an
 *  unbounded JSON array of every message in that session. Nothing reads a
 *  retired transcript — the client is handed a fresh sessionId — so they're
 *  pure storage growth, and the reset-every-3-hours behaviour means the row
 *  count climbs faster than session count would suggest. A month is long
 *  enough to investigate a support question and short enough to bound. */
const KEMI_CONVERSATION_RETENTION_DAYS = 30;

/** Delivered nudges have already become messages in a transcript; the row
 *  itself is only a delivery record. */
const KEMI_NUDGE_RETENTION_DAYS = 30;

/**
 * Nightly housekeeping. Everything here is safe to run repeatedly, safe to
 * miss, and touches only data nothing reads — so a failed run is a
 * non-event, not an incident.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationCutoff = new Date(Date.now() - KEMI_CONVERSATION_RETENTION_DAYS * 86400000);
  const nudgeCutoff = new Date(Date.now() - KEMI_NUDGE_RETENTION_DAYS * 86400000);

  const [conversations, nudges, rateLimits] = await Promise.all([
    prisma.kemiConversation.deleteMany({ where: { lastMessageAt: { lt: conversationCutoff } } }),
    prisma.kemiNudge.deleteMany({ where: { deliveredAt: { not: null, lt: nudgeCutoff } } }),
    sweepExpiredRateLimits(),
  ]);

  // Daily backstop that closes the loop on the payment guarantee: any settled
  // top-up the client verify and the webhook both missed gets credited here on
  // the next run. Idempotent (keyed on the Paystack reference), so this only
  // ever fills genuine gaps. Isolated in its own try/catch — a Paystack outage
  // must not turn nightly housekeeping into a failed cron.
  let topUps: { credited: number; alreadyCredited: number; skipped: number } | { error: string };
  try {
    const swept = await reconcileRecentTopUps({ sinceHours: 72 });
    topUps = { credited: swept.credited, alreadyCredited: swept.alreadyCredited, skipped: swept.skipped };
  } catch (e) {
    topUps = { error: e instanceof Error ? e.message : "top-up reconcile failed" };
  }

  return NextResponse.json({
    kemiConversationsDeleted: conversations.count,
    kemiNudgesDeleted: nudges.count,
    rateLimitWindowsDeleted: rateLimits,
    topUps,
  });
}
