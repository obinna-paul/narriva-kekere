import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, getCurrentSession } from "@/lib/auth/middleware";
import {
  StoryForbiddenError,
  StoryIllegalStateError,
  StoryNotFoundError,
  deleteStory,
  getStoryForAuthor,
  getStoryForReader,
  updateStory,
} from "@/lib/data/kekere-stories";

/**
 * Serves two different audiences through one endpoint: a public/logged-in
 * reader (getStoryForReader — PUBLISHED only, body gated by unlock status),
 * and the story's own author re-fetching their draft to keep editing it
 * (getStoryForAuthor — any status, full body, no gating, since it's theirs).
 * Falls through to the author path only when the reader path comes back
 * empty, so a stranger can never use this to peek at someone else's draft.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const readerStory = await getStoryForReader(params.id, session?.user?.id);
  if (readerStory) {
    return NextResponse.json({ story: readerStory });
  }

  if (session?.user?.id) {
    try {
      const authorStory = await getStoryForAuthor(params.id, session.user.id);
      return NextResponse.json({ story: { ...authorStory, unlocked: true } });
    } catch {
      // Not theirs (or doesn't exist) — fall through to the generic 404.
    }
  }

  return NextResponse.json({ error: "Story not found" }, { status: 404 });
}

const updateStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  hookLine: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  genre: z.string().optional(),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]).optional(),
  cowrieCost: z.number().int().min(0).optional(),
  readingTime: z.number().int().min(1).optional(),
  isSerialized: z.boolean().optional(),
  chapters: z.any().optional(),
});

function handleStoryError(error: unknown) {
  if (error instanceof StoryNotFoundError) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (error instanceof StoryForbiddenError) {
    return NextResponse.json({ error: "Not your story" }, { status: 403 });
  }
  if (error instanceof StoryIllegalStateError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  throw error;
}

export const PUT = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = updateStorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const story = await updateStory(params.id, session.user.id, parsed.data);
      return NextResponse.json({ story });
    } catch (error) {
      return handleStoryError(error);
    }
  }
);

export const DELETE = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    try {
      await deleteStory(params.id, session.user.id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return handleStoryError(error);
    }
  }
);
