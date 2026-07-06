export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      dauUnlocks,
      dauAuthors,
      wauUnlocks,
      wauAuthors,
      mauUnlocks,
      mauAuthors,
      readerCount,
      writerCount,
      bothCount,
      wauStoryUnlocksCount,
      topReaders,
      topWriters,
    ] = await Promise.all([
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: today, lt: tomorrow } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.story.findMany({
        where: { createdAt: { gte: today, lt: tomorrow } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.story.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.story.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.user.count({
        where: { unlocks: { some: {} } },
      }),
      prisma.user.count({
        where: { stories: { some: {} } },
      }),
      prisma.user.count({
        where: { unlocks: { some: {} }, stories: { some: {} } },
      }),
      prisma.storyUnlock.count({
        where: { unlockedAt: { gte: sevenDaysAgo } },
      }),
      prisma.storyUnlock.groupBy({
        by: ["userId"],
        where: { unlockedAt: { gte: thirtyDaysAgo } },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
      prisma.wallet.findMany({
        where: { earnedBalance: { gt: 0 } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              _count: { select: { stories: true } },
            },
          },
        },
        orderBy: { earnedBalance: "desc" },
        take: 10,
      }),
    ]);

    const topReaderUsers = await prisma.user.findMany({
      where: { id: { in: topReaders.map((r) => r.userId) } },
      select: { id: true, name: true },
    });
    const topReaderNames = new Map(topReaderUsers.map((u) => [u.id, u.name]));

    // Genre breakdown — unique readers per genre over the last 30 days.
    const genreUnlocks = await prisma.storyUnlock.findMany({
      where: { unlockedAt: { gte: thirtyDaysAgo } },
      select: { userId: true, story: { select: { genre: true } } },
    });
    const genreReaderSets = new Map<string, Set<string>>();
    for (const u of genreUnlocks) {
      const genre = u.story.genre;
      if (!genreReaderSets.has(genre)) genreReaderSets.set(genre, new Set());
      genreReaderSets.get(genre)!.add(u.userId);
    }
    const topGenres = Array.from(genreReaderSets.entries())
      .map(([genre, readers]) => ({ genre, readers: readers.size }))
      .sort((a, b) => b.readers - a.readers)
      .slice(0, 6);

    // Week-1 retention by signup cohort — for each of the last 6 completed
    // weeks, what fraction of that week's new signups unlocked a story
    // during their following week.
    const WEEK_MS = 7 * 86400000;
    const cohortWeekStarts = Array.from({ length: 6 }, (_, i) => new Date(today.getTime() - (i + 2) * WEEK_MS));
    const cohortRetention = (
      await Promise.all(
        cohortWeekStarts.map(async (weekStart) => {
          const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
          const followingWeekEnd = new Date(weekEnd.getTime() + WEEK_MS);

          const cohortUsers = await prisma.user.findMany({
            where: { createdAt: { gte: weekStart, lt: weekEnd } },
            select: { id: true },
          });
          const total = cohortUsers.length;
          if (total === 0) return null;

          const retained = await prisma.storyUnlock.findMany({
            where: {
              userId: { in: cohortUsers.map((u) => u.id) },
              unlockedAt: { gte: weekEnd, lt: followingWeekEnd },
            },
            select: { userId: true },
            distinct: ["userId"],
          });

          return {
            week: weekStart.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
            retained: retained.length,
            total,
          };
        })
      )
    )
      .filter((c): c is { week: string; retained: number; total: number } => c !== null)
      .reverse();

    const dauSet = new Set([...dauUnlocks.map((u) => u.userId), ...dauAuthors.map((a) => a.authorId)]);
    const wauSet = new Set([...wauUnlocks.map((u) => u.userId), ...wauAuthors.map((a) => a.authorId)]);
    const mauSet = new Set([...mauUnlocks.map((u) => u.userId), ...mauAuthors.map((a) => a.authorId)]);

    const dau = dauSet.size;
    const wau = wauSet.size;
    const mau = mauSet.size;

    function obfuscate(name: string): string {
      return name.length > 5 ? `${name.slice(0, 5)}***` : `${name.slice(0, 1)}***`;
    }

    return NextResponse.json({
      dau,
      wau,
      mau,
      dauMauRatio: mau > 0 ? Math.round((dau / mau) * 1000) / 1000 : 0,
      dauWauRatio: wau > 0 ? Math.round((dau / wau) * 1000) / 1000 : 0,
      wauMauRatio: mau > 0 ? Math.round((wau / mau) * 1000) / 1000 : 0,
      readerCount,
      writerCount,
      bothCount,
      avgStoriesReadPerActiveUserPerWeek:
        wau > 0 ? Math.round((wauStoryUnlocksCount / wau) * 100) / 100 : 0,
      topGenres,
      cohortRetention,
      topReaders: topReaders.map((r) => ({
        userId: r.userId,
        displayName: obfuscate(topReaderNames.get(r.userId) ?? r.userId),
        unlockCount: r._count.userId,
      })),
      topWriters: topWriters.map((w) => ({
        userId: w.user.id,
        displayName: obfuscate(w.user.name),
        earnedBalance: w.earnedBalance.toNumber(),
        storyCount: w.user._count.stories,
      })),
    });
  },
  { roles: ["ADMIN"] },
);
