export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/middleware";
import { countPendingKemiNudges, ensureStreakSaveNudge } from "@/lib/data/kekere-kemi-nudges";

/**
 * How many unread openers Kemi has waiting — the only thing the "Ask Kemi"
 * chip's unread dot needs to know. Kept deliberately tiny and content-free
 * because the chip polls it on the feed; the actual messages are only
 * materialised when the reader opens the chat (see the conversation route).
 *
 * Returns 0 rather than 401 for a signed-out visitor: a missing dot is the
 * correct rendering for someone with no account, not an error worth logging.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ pendingCount: 0 });

  // A lapsing streak is the one opener with no event behind it to record it,
  // so it's evaluated here — this poll is the closest thing to "the reader is
  // around right now". Cheap by construction: it short-circuits on a
  // once-per-day marker before it looks at anything else.
  await ensureStreakSaveNudge(session.user.id);

  const pendingCount = await countPendingKemiNudges(session.user.id);
  return NextResponse.json({ pendingCount });
}
