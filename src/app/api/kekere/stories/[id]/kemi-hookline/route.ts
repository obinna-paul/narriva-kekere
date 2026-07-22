export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStoryForAuthor, StoryForbiddenError, StoryNotFoundError } from "@/lib/data/kekere-stories";
import { docToPlainText, type TiptapDoc } from "@/lib/tiptap/doc-utils";
import { suggestHookline } from "@/lib/kemi/hookline";

const RATE_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 };

/** Writer-only, own draft only — asks Kemi to suggest a hook line for a
 * story that doesn't have one yet, so picking it as a "coming soon" story
 * never gets stuck on a blank field. Read-only: never saves anything, the
 * writer decides whether to accept the suggestion via the normal story
 * PUT endpoint. */
export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const rateLimit = checkRateLimit(`kemi-hookline:${session.user.id}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  let story;
  try {
    story = await getStoryForAuthor(params.id, session.user.id);
  } catch (error) {
    if (error instanceof StoryNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof StoryForbiddenError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }

  const plainText = docToPlainText(story.body as unknown as TiptapDoc);
  const plainTextLen = plainText.trim().length;

  console.log("[kemi-hookline]", {
    storyId: params.id,
    title: story.title,
    wordCount: story.wordCount,
    plainTextLen,
    plainTextPreview: plainText.trim().slice(0, 80),
  });

  if (plainTextLen < 50) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

  const hookLine = await suggestHookline(story.title, plainText);
  if (!hookLine) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  console.log("[kemi-hookline] result:", { storyId: params.id, hookLine });

  return NextResponse.json({ hookLine });
});
