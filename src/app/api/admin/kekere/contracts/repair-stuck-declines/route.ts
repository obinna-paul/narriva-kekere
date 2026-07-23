export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { repairStuckDeclinedContracts } from "@/lib/data/kekere-contracts";

/**
 * One-time backfill, triggered by hand from the admin panel: reverts any
 * story left stuck in PENDING_CONTRACT by a decline that predates the fix
 * in declineContract (which now reverts the story to DRAFT itself). Idempotent
 * — safe to hit more than once, since a story already repaired no longer
 * matches the query on a later run.
 */
export const GET = withAuth(
  async () => {
    const repaired = await repairStuckDeclinedContracts();
    return NextResponse.json({ repairedCount: repaired.length, repaired });
  },
  { roles: ["ADMIN"] },
);
