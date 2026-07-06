export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      trendingStories,
      genreUnlocks,
      writerEarnings,
    ] = await Promise.all([
      // Top unlocked stories in last 7 days vs previous 7 days
      prisma.storyUnlock.groupBy({
        by: ["storyId"],
        where: { unlockedAt: { gte: sevenDaysAgo } },
        _count: true,
        orderBy: { _count: { storyId: "desc" } },
        take: 10,
      }),
      // Unlocks by genre last 30 days
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: thirtyDaysAgo } },
        include: { story: { select: { genre: true } } },
      }),
      // Rising writers — biggest earned-balance growth
      prisma.wallet.findMany({
        where: {
          earnedBalance: { gt: 0 },
          user: { stories: { some: { status: "PUBLISHED" } } },
        },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { earnedBalance: "desc" },
        take: 5,
      }),
    ]);

    const storyIds = trendingStories.map((t) => t.storyId);
    const stories = await prisma.story.findMany({
      where: { id: { in: storyIds } },
      select: { id: true, title: true, author: { select: { name: true, slug: true } } },
    });
    const storyMap = new Map(stories.map((s) => [s.id, s]));

    // Previous period unlock counts for trend % calc
    const prevCounts = await prisma.storyUnlock.groupBy({
      by: ["storyId"],
      where: { storyId: { in: storyIds }, unlockedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      _count: true,
    });
    const prevMap = new Map(prevCounts.map((p) => [p.storyId, p._count]));

    // Genre aggregation
    const genreMap = new Map<string, number>();
    for (const u of genreUnlocks) {
      const g = u.story.genre ?? "Other";
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
    }
    const totalGenreUnlocks = genreUnlocks.length;
    const genres = Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({
        label,
        count,
        pct: totalGenreUnlocks > 0 ? Math.round((count / totalGenreUnlocks) * 100) : 0,
      }));

    const trending = trendingStories
      .map((t) => {
        const s = storyMap.get(t.storyId);
        if (!s) return null;
        const prev = prevMap.get(t.storyId) ?? 0;
        const trend =
          prev === 0
            ? t._count > 0
              ? 100
              : 0
            : Math.round(((t._count - prev) / prev) * 100);
        return {
          storyId: t.storyId,
          title: s.title,
          authorName: s.author.name,
          authorSlug: s.author.slug,
          unlocks: t._count,
          trendPct: trend,
        };
      })
      .filter(Boolean);

    const risingWriters = writerEarnings.map((w, i) => ({
      rank: i + 1,
      userId: w.user.id,
      name: w.user.name,
      earnedCowries: w.earnedBalance.toNumber(),
    }));

    return NextResponse.json({ trending, genres, risingWriters });
  },
  { roles: ["ADMIN"] }
);
