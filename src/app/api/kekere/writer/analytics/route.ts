export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getWriterOverview,
  getWriterEarningsSummary,
  getWriterEarningsSeries,
  getWriterFollowerSeries,
  getWriterStoryBreakdown,
} from "@/lib/data/kekere-writer-analytics";

export const GET = withAuth(async (_request, session) => {
  const writerId = session.user.id;

  const [overview, earnings, earningsSeries, followerSeries, stories] = await Promise.all([
    getWriterOverview(writerId),
    getWriterEarningsSummary(writerId),
    getWriterEarningsSeries(writerId, 30),
    getWriterFollowerSeries(writerId, 30),
    getWriterStoryBreakdown(writerId),
  ]);

  return NextResponse.json({ overview, earnings, earningsSeries, followerSeries, stories });
});
