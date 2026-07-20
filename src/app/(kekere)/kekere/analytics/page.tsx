import { KekereTheme } from "@/components/theme";
import { WriterAnalyticsView } from "@/components/kekere/writer-analytics-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import {
  getWriterOverview,
  getWriterEarningsSummary,
  getWriterEarningsSeries,
  getWriterFollowerSeries,
  getWriterStoryBreakdown,
} from "@/lib/data/kekere-writer-analytics";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login) — /kekere/analytics is in KEKERE_PROTECTED_PREFIXES.
export default async function KekereAnalyticsPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <KekereTheme>
        <div className="min-h-screen bg-[var(--color-bg)]" />
      </KekereTheme>
    );
  }

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
