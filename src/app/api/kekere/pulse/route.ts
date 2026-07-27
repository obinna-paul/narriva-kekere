export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { countPendingKemiNudges, ensureStreakSaveNudge } from "@/lib/data/kekere-kemi-nudges";

/**
 * Every counter the app's chrome polls for, in one request.
 *
 * There used to be two independent 60-second polls — the notification bell
 * and Kemi's unread dot — each doing its own session decode and its own
 * queries. That's the entire cost of a reader who is simply *present*, so it
 * is worth being mean about: one request, counts only, nothing else.
 *
 * The bell's poll in particular was fetching thirty full notification rows
 * every minute in order to render a number. The list is now loaded when the
 * drawer actually opens, which is the only moment anyone can see it.
 *
 * Signed-out visitors get zeroes rather than a 401 — the chrome renders for
 * them too, and an empty badge is the correct answer, not an error.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ unreadNotifications: 0, pendingKemiNudges: 0 });
  }
  const userId = session.user.id;

  // A lapsing streak has no event behind it to record it, so this poll — the
  // closest thing the app has to "the reader is around right now" — is where
  // it gets noticed. Short-circuits on a once-per-day marker.
  await ensureStreakSaveNudge(userId);

  const [unreadNotifications, pendingKemiNudges] = await Promise.all([
    prisma.notification.count({ where: { userId, read: false } }),
    countPendingKemiNudges(userId),
  ]);

  return NextResponse.json({ unreadNotifications, pendingKemiNudges });
}
