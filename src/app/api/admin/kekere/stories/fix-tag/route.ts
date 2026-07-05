export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const fixTagSchema = z.object({
  storyTitle: z.string().min(1, "Story title required"),
  tagSlug: z.string().min(1, "Tag slug required"),
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

    const { storyTitle, tagSlug } = parsed.data;

    try {
      // Find the story
      const story = await prisma.story.findFirst({
        where: { title: storyTitle },
        select: { id: true, title: true },
      });

      if (!story) {
        return NextResponse.json(
          { error: `Story "${storyTitle}" not found` },
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
      await prisma.storyTag.deleteMany({
        where: { storyId: story.id },
      });

      // Add new tag
      await prisma.storyTag.create({
        data: {
          storyId: story.id,
          tagId: tag.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Story "${story.title}" reassigned to tag "${tag.slug}"`,
        story: { id: story.id, title: story.title },
        tag: { id: tag.id, slug: tag.slug },
      });
    } catch (error) {
      console.error("Error fixing story tag:", error);
      return NextResponse.json(
        { error: "Failed to fix story tag" },
        { status: 500 }
      );
    }
  },
  { roles: ["ADMIN"] }
);
