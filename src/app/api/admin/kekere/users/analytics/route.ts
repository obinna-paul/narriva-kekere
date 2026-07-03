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
      readerCount,
      writerCount,
      bothCount,
      avgStoriesReadPerActiveUserPerWeek:
        wau > 0 ? Math.round((wauStoryUnlocksCount / wau) * 100) / 100 : 0,
      topReaders: topReaders.map((r) => ({
        userId: r.userId,
        displayName: obfuscate(r.userId),
        unlockCount: r._count.userId,
      })),
      topWriters: topWriters.map((w) => ({
        userId: w.user.id,
        displayName: obfuscate(w.user.name),
        earnedBalance: w.earnedBalance,
        storyCount: w.user._count.stories,
      })),
    });
  },
  { roles: ["ADMIN"] },
);
