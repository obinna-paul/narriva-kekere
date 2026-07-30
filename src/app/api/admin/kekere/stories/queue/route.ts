export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { StoryStatus } from "@prisma/client";

export const GET = withAuth(
  async (request) => {
    const tab = new URL(request.url).searchParams.get("tab") ?? "submitted";

    const statusFilter: StoryStatus[] = tab === "publishing"
      ? ["ACCEPTED", "CHANGES_PROPOSED"]
      : ["SUBMITTED", "REVISIONS_REQUESTED"];
    const stories = await prisma.story.findMany({
      where: { status: { in: statusFilter } },
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

    const storyIds = stories.map((s) => s.id);
    const commentStats = await prisma.editorialComment.groupBy({
      by: ["storyId"],
      where: { storyId: { in: storyIds }, status: "OPEN" },
      _count: true,
    });
    const openCommentCountByStory = new Map(commentStats.map((c) => [c.storyId, c._count]));

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
          genre: s.genre,
          tier: s.tier,
          wordCount: s.wordCount,
          cowrieCost: s.cowrieCost,
          moderationNotes: s.moderationNotes ?? null,
          submittedAt: s.submittedAt?.toISOString() ?? null,
          daysWaiting: s.submittedAt
            ? Math.floor((now - s.submittedAt.getTime()) / 86400000)
            : null,
          status: s.status,
          // For a story sitting in CHANGES_PROPOSED this is when it went to
          // the writer: the status change was the last write, and nothing
          // touches the row again until they respond. Used only to show how
          // long it has been waiting, so a proxy is worth more than a new
          // column and the migration to go with it.
          lastActivityAt: s.updatedAt.toISOString(),
          previousPublishedCount: stats.publishedCount,
          previousRejectionCount: stats.rejectedCount,
          plagiarismFlagged: s.plagiarismFlagged,
          // Whether an admin has opened this exact version of the story —
          // cleared back to false at every point it becomes newly actionable
          // (submitted, resubmitted, writer sends edits back, contract
          // signed) so it never falsely reads as "already seen".
          opened: s.lastOpenedByAdminAt != null,
          // A working copy exists in the To Be Published editor that hasn't
          // been sent to the writer yet.
          hasEdits: s.editLastSavedAt != null,
          openCommentCount: openCommentCountByStory.get(s.id) ?? 0,
        };
      }),
    });
  },
  { roles: ["ADMIN"] },
);
