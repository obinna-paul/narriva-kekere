export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";

export const GET = withAuth(
  async (_request, _session, { params }) => {
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
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

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
