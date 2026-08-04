export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { recalculateAllCompletionRates } from "@/lib/data/kekere-progress";
import { logAdminAction } from "@/lib/admin/logAction";

/**
 * Recomputes completionRate for every published story from the current
 * StoryCompletion/StoryUnlock rows (see recalculateCompletionRate in
 * kekere-progress.ts). Backfill for stories whose stored rate was inflated
 * by author/admin reads before that exclusion existed — a pure recompute,
 * so safe to run any number of times.
 */
export const POST = withAuth(
  async (_request, session) => {
    const changed = await recalculateAllCompletionRates();

    if (changed.length > 0) {
      await logAdminAction(session.user.id, session.user.id, "RECALCULATE_COMPLETION_RATES", {
        changed: changed.map((c) => ({ storyId: c.storyId, title: c.title, oldRate: c.oldRate, newRate: c.newRate })),
      });
    }

    return NextResponse.json({ success: true, changed });
  },
  { roles: ["ADMIN"] },
);
