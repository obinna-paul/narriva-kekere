export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

const deleteSchema = z.object({
  storyId: z.string().min(1, "storyId is required"),
  // Safety flag — deleting a PUBLISHED story requires explicit confirmation.
  force: z.boolean().optional(),
});

export const POST = withAuth(
  async (request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { storyId, force } = parsed.data;

    try {
      const story = await prisma.story.findUnique({
        where: { id: storyId },
        select: { id: true, title: true, status: true },
      });

      if (!story) {
        return NextResponse.json(
          { error: `Story with id "${storyId}" not found` },
          { status: 404 }
        );
      }

      // Guard against accidentally deleting a live story.
      if (story.status === "PUBLISHED" && !force) {
        return NextResponse.json(
          {
            error: "refused_published",
            message: `"${story.title}" is PUBLISHED. Pass { "force": true } to delete it anyway.`,
            story,
          },
          { status: 409 }
        );
      }

      // Related rows cascade on delete; any linked contract's storyId is
      // set to null (onDelete: SetNull) so signed contracts are preserved.
      await prisma.story.delete({ where: { id: storyId } });

      return NextResponse.json({
        success: true,
        message: `Deleted story "${story.title}" (${story.status})`,
        deleted: story,
      });
    } catch (error) {
      console.error("Error deleting story:", error);
      return NextResponse.json(
        { error: "Failed to delete story", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  },
  { roles: ["ADMIN"] }
);
