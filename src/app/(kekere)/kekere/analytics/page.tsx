import { redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { WriterAnalyticsView } from "@/components/kekere/writer-analytics-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWriterStats } from "@/lib/data/kekere-profile-stats";
import {
  getWriterOverview,
  getWriterEarningsSummary,
  getWriterEarningsSeries,
  getWriterFollowerSeries,
  getWriterStoryBreakdown,
} from "@/lib/data/kekere-writer-analytics";

export const dynamic = "force-dynamic";

// Middleware (src/middleware.ts) only guarantees the visitor is logged in —
// it can't tell a reader from a writer, because writer status isn't in the
// JWT. So the role gate lives here: analytics is meaningless to someone who
// has never authored a story (it just renders empty figures), so send a
// non-writer back to the feed rather than show them a blank dashboard.
export default async function KekereAnalyticsPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  if (!userId) redirect("/login");

  const writerStats = await getWriterStats(userId);
  if (!writerStats.hasAuthoredAnyStory) redirect("/kekere/feed");

  const [overview, earnings, earningsSeries, followerSeries, stories] = await Promise.all([
    getWriterOverview(userId),
    getWriterEarningsSummary(userId),
    getWriterEarningsSeries(userId, 30),
    getWriterFollowerSeries(userId, 30),
    getWriterStoryBreakdown(userId),
  ]);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <WriterAnalyticsView
          overview={overview}
          earnings={earnings}
          earningsSeries={earningsSeries}
          followerSeries={followerSeries}
          stories={stories}
        />
      </div>
    </KekereTheme>
  );
}
