export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";

export const GET = withAuth(
  async (_request, session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            name: true,
            slug: true,
            createdAt: true,
          },
        },
        tags: { select: { tagId: true } },
        // At most one entry matters here — a story can only be entered into
        // a given competition once, and in practice only into one at a time.
        competitionEntries: {
          select: { competition: { select: { title: true } } },
          take: 1,
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Marks this story as "opened" for the queue list — fire-and-forget,
    // never worth failing the read over.
    void prisma.story
      .update({
        where: { id },
        data: { lastOpenedByAdminId: session.user.id, lastOpenedByAdminAt: new Date() },
      })
      .catch(() => {});

    const [publishedCount, rejectedCount, revisionsCount] = await Promise.all([
      prisma.story.count({
        where: { authorId: story.authorId, status: "PUBLISHED" },
      }),
      prisma.story.count({
        where: { authorId: story.authorId, status: "REJECTED" },
      }),
      prisma.story.count({
        where: {
          authorId: story.authorId,
          status: "REVISIONS_REQUESTED",
          id: { not: story.id },
        },
      }),
    ]);

    return NextResponse.json({
      id: story.id,
      title: story.title,
      authorName: story.author.name,
      hookLine: story.hookLine,
      body: story.body,
      genre: story.genre,
      status: story.status,
      tier: story.tier,
      wordCount: story.wordCount ?? 0,
      readingTime: story.readingTime ?? 0,
      cowrieCost: story.cowrieCost,
      coverImageRef: story.coverImageRef,
      coverPreviewUrl: story.coverImageRef ? storyCoverUrl(story.coverImageRef) : null,
      tagIds: story.tags.map((t) => t.tagId),
      completionRate: story.completionRate,
      moderationNotes: story.moderationNotes,
      editWriterNote: story.editWriterNote,
      plagiarismFlagged: story.plagiarismFlagged,
      isAdult: story.isAdult,
      isSerialized: story.isSerialized,
      submittedAt: story.submittedAt?.toISOString() ?? null,
      publishedAt: story.publishedAt?.toISOString() ?? null,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
      competitionTitle: story.competitionEntries[0]?.competition.title ?? null,
      authorProfile: {
        name: story.author.name,
        username: story.author.slug ?? story.author.name,
        joinedAt: story.author.createdAt.toISOString(),
        publishedStoriesCount: publishedCount,
        rejectionCount: rejectedCount,
        revisionRequestCount: revisionsCount,
      },
    });
  },
  { roles: ["ADMIN"] },
);
