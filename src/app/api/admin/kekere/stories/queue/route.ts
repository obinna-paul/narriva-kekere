export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export const GET = withAuth(
  async () => {
    const stories = await prisma.story.findMany({
      where: { status: { in: ["SUBMITTED", "REVISIONS_REQUESTED"] } },
      include: {
        author: { select: { name: true, slug: true } },
      },
      orderBy: { submittedAt: "asc" },
    });

    const authorIds = Array.from(new Set(stories.map((s) => s.authorId)));
    const authorStats = new Map<
      string,
      { publishedCount: number; rejectedCount: number }
    >();

    const stats = await prisma.story.groupBy({
      by: ["authorId", "status"],
      where: { authorId: { in: authorIds }, status: { in: ["PUBLISHED", "REJECTED"] } },
      _count: true,
    });

    stats.forEach((s) => {
      const entry = authorStats.get(s.authorId) ?? {
        publishedCount: 0,
        rejectedCount: 0,
      };
      if (s.status === "PUBLISHED") entry.publishedCount += s._count;
      if (s.status === "REJECTED") entry.rejectedCount += s._count;
      authorStats.set(s.authorId, entry);
    });

    const now = Date.now();

    return NextResponse.json({
      stories: stories.map((s) => {
        const stats = authorStats.get(s.authorId) ?? {
          publishedCount: 0,
          rejectedCount: 0,
        };

        return {
          id: s.id,
          title: s.title,
          hookLine: s.hookLine,
          authorId: s.authorId,
          authorUsername: s.author.slug ?? s.author.name,
          authorName: s.author.name,
          wordCount: s.wordCount,
          submittedAt: s.submittedAt?.toISOString() ?? null,
          daysWaiting: s.submittedAt
            ? Math.floor((now - s.submittedAt.getTime()) / 86400000)
            : null,
          status: s.status,
          previousPublishedCount: stats.publishedCount,
          previousRejectionCount: stats.rejectedCount,
          plagiarismFlagged: s.plagiarismFlagged,
        };
      }),
    });
  },
  { roles: ["ADMIN"] },
);
