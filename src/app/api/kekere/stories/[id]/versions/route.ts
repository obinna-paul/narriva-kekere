import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getStoryForAuthor, StoryForbiddenError, StoryNotFoundError } from "@/lib/data/kekere-stories";
import { createVersionSnapshot, listVersions } from "@/lib/data/kekere-story-versions";

const createVersionSchema = z.object({ label: z.string().min(1).max(120).optional() });

function handleError(error: unknown) {
  if (error instanceof StoryNotFoundError) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (error instanceof StoryForbiddenError) {
    return NextResponse.json({ error: "Not your story" }, { status: 403 });
  }
  throw error;
}

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    try {
      await getStoryForAuthor(params.id, session.user.id);
    } catch (error) {
      return handleError(error);
    }

    const versions = await listVersions(params.id);
    return NextResponse.json({ versions });
  }
);

export const POST = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    try {
      await getStoryForAuthor(params.id, session.user.id);
    } catch (error) {
      return handleError(error);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const version = await createVersionSnapshot(params.id, parsed.data.label ?? "Manual save");
    return NextResponse.json(version, { status: 201 });
  }
);
