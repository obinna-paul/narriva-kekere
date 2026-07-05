export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const fixTagSchema = z
  .object({
    // Prefer storyId (unambiguous). storyTitle is a convenience fallback and
    // only ever matches a PUBLISHED story.
    storyId: z.string().min(1).optional(),
    storyTitle: z.string().min(1).optional(),
    tagSlug: z.string().min(1, "Tag slug required"),
  })
  .refine((d) => d.storyId || d.storyTitle, {
    message: "Provide either storyId or storyTitle",
  });

export const POST = withAuth(
  async (request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = fixTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { storyId, storyTitle, tagSlug } = parsed.data;

    try {
      // Look up by ID when given (unambiguous); otherwise fall back to the
      // published story with a matching title.
      const story = storyId
        ? await prisma.story.findUnique({
            where: { id: storyId },
            select: { id: true, title: true },
          })
        : await prisma.story.findFirst({
            where: { title: storyTitle, status: "PUBLISHED" },
            select: { id: true, title: true },
          });

      if (!story) {
        return NextResponse.json(
          { error: `Story ${storyId ? `id "${storyId}"` : `"${storyTitle}"`} not found` },
          { status: 404 }
        );
      }

      // Find the tag
      const tag = await prisma.tag.findUnique({
        where: { slug: tagSlug },
        select: { id: true, slug: true },
      });

      if (!tag) {
        return NextResponse.json(
          { error: `Tag "${tagSlug}" not found` },
          { status: 404 }
        );
      }

      // Remove old tags
      const deleteResult = await prisma.storyTag.deleteMany({
        where: { storyId: story.id },
      });
      console.log(`Deleted ${deleteResult.count} old tags for story ${story.id}`);

      // Add new tag
      const createResult = await prisma.storyTag.create({
        data: {
          storyId: story.id,
          tagId: tag.id,
        },
      });
      console.log(`Created new StoryTag:`, createResult);

      // Verify the change
      const verify = await prisma.story.findUnique({
        where: { id: story.id },
        select: {
          tags: {
            select: { tag: { select: { slug: true } } },
          },
        },
      });
      console.log(`Verification - Story now has tags:`, verify?.tags.map(t => t.tag.slug));

      return NextResponse.json({
        success: true,
        message: `Story "${story.title}" reassigned to tag "${tag.slug}"`,
        story: { id: story.id, title: story.title },
        tag: { id: tag.id, slug: tag.slug },
        verification: { tagsAfter: verify?.tags.map(t => t.tag.slug) },
      });
    } catch (error) {
      console.error("Error fixing story tag:", error);
      return NextResponse.json(
        { error: "Failed to fix story tag", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  },
  { roles: ["ADMIN"] }
);
