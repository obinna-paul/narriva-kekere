export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isValidTiptapDoc, ensureParagraphIds, countWords } from "@/lib/tiptap/doc-utils";

// Full admin edit surface — unlike the writer's own PUT /api/kekere/stories/[id],
// this has NO status restriction (EDITABLE_STATUSES) and no ownership check.
// An admin can edit a story's content, tags, and cover whether it's a draft,
// pending contract, or already PUBLISHED, and the change takes effect
// immediately — every reading surface queries the Story row live
// (force-dynamic, no ISR), so there's nothing to invalidate.
export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        hookLine: true,
        body: true,
        tier: true,
        cowrieCost: true,
        coverImageRef: true,
        status: true,
        genre: true,
        lastSavedAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, slug: true, label: true } } } },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: story.id,
      title: story.title,
      hookLine: story.hookLine,
      body: story.body,
      tier: story.tier,
      cowrieCost: story.cowrieCost,
      coverImageRef: story.coverImageRef,
      status: story.status,
      genre: story.genre,
      lastSavedAt: (story.lastSavedAt ?? story.updatedAt).toISOString(),
      authorId: story.author.id,
      authorName: story.author.name,
      tagIds: story.tags.map((t) => t.tag.id),
    });
  },
  { roles: ["ADMIN"] },
);

const editSchema = z.object({
  title: z.string().min(1).max(200),
  hookLine: z.string().min(1).max(300),
  body: z.record(z.string(), z.unknown()),
  tier: z.enum(["STANDARD", "FEATURED", "CHAMPION"]),
  cowrieCost: z.number().int().min(1).max(10),
  tagIds: z.array(z.string()).min(1, "Select at least one tag").max(2, "Select at most two tags"),
  // Omitted entirely = keep the existing cover; present = replace it.
  coverImageRef: z.string().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const body = await request.json().catch(() => null);
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.story.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const { title, hookLine, body: tiptapDoc, tier, cowrieCost, tagIds, coverImageRef } = parsed.data;

    if (!isValidTiptapDoc(tiptapDoc)) {
      return NextResponse.json({ error: "Invalid story content format" }, { status: 400 });
    }

    const bodyWithIds = ensureParagraphIds(tiptapDoc);
    const wordCount = countWords(bodyWithIds);
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    const updated = await prisma.$transaction(async (tx) => {
      const story = await tx.story.update({
        where: { id },
        data: {
          title,
          hookLine,
          body: bodyWithIds as never,
          wordCount,
          readingTime,
          tier,
          cowrieCost,
          lastSavedAt: new Date(),
          ...(coverImageRef ? { coverImageRef } : {}),
        },
      });

      await tx.storyTag.deleteMany({ where: { storyId: id } });
      await tx.storyTag.createMany({
        data: tagIds.map((tagId) => ({ storyId: id, tagId })),
        skipDuplicates: true,
      });

      return story;
    });

    return NextResponse.json({ success: true, story: { id: updated.id, lastSavedAt: updated.lastSavedAt } });
  },
  { roles: ["ADMIN"] },
);
