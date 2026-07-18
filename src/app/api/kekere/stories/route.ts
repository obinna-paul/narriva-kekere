export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import type { StoryTier } from "@prisma/client";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { createStory, listStories } from "@/lib/data/kekere-stories";
import { toFeedStoryData } from "@/lib/adapters/kekere";
import { getFeatureFlag } from "@/lib/settings/get";
import { isValidTiptapDoc, ensureParagraphIds, countWords, type TiptapDoc } from "@/lib/tiptap/doc-utils";

const WORDS_PER_MINUTE = 200;

function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tier = (url.searchParams.get("tier") as StoryTier | null) ?? undefined;
  const genre = url.searchParams.get("genre") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const sort = url.searchParams.get("sort") === "trending" ? "trending" : "recent";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");

  // Public feed only — status is never accepted from the query string, so
  // there's no way to ask this endpoint for drafts.
  const result = await listStories({
    tier,
    genre,
    search,
    sort,
    page,
    pageSize,
    status: "PUBLISHED",
  });

  // The feed page (and any other client) consumes this over HTTP, so it
  // never goes through the server-side adapter the way SSR pages
  // (homepage, /profile, /library) do — adapt here instead, otherwise raw
  // Prisma field names (readingTime, cowrieCost) leak out where the UI
  // expects the MockStory shape (readingTimeMinutes, isFree, isNew, ...).
  const stories = result.stories.map((story) => toFeedStoryData(story, sort === "trending"));
  return NextResponse.json({ ...result, stories });
}

const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  hookLine: z.string().min(1).max(300),
  body: z.any().refine(isValidTiptapDoc, "body must be a valid Tiptap document"),
  genre: z.string().optional(),
  tier: z.enum(["STANDARD", "FEATURED", "CHAMPION"]).optional(),
  cowrieCost: z.number().int().min(0).optional(),
  isSerialized: z.boolean().optional(),
  chapters: z.any().optional(),
});

// Any authenticated user can start writing — the default role (READER)
// already satisfies "WRITER or READER," so there's nothing to gate beyond
// being logged in. We DO auto-upgrade READER → WRITER on first story
// creation rather than leaving the role purely informational: it costs
// nothing here (these endpoints check authorship, not role, for
// permissions) and keeps the role meaningful for whatever reads it later.
export const POST = withAuth(async (request, session) => {
  const submissionsEnabled = await getFeatureFlag("story_submissions", true);
  if (!submissionsEnabled) {
    return NextResponse.json(
      { error: "story_submissions_disabled", message: "This feature is temporarily unavailable." },
      { status: 403 },
    );
  }

  const requestBody = await request.json();
  const parsed = createStorySchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Tier is an editorial/curatorial decision — Featured and Champion both
  // drive the daily "Editor's Pick" rotation, and Champion additionally
  // drives Winner's Circle placement, so writers can't set it themselves
  // at all, only an admin can.
  if (parsed.data.tier !== undefined && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only an admin can set a story's tier." },
      { status: 403 }
    );
  }

  // Never save a paragraph without an id — paragraph comments/reactions
  // (later phases) key off it, and pasted content may not carry one.
  const body = ensureParagraphIds(parsed.data.body as TiptapDoc);
  const wordCount = countWords(body);

  const story = await createStory(session.user.id, {
    ...parsed.data,
    body,
    wordCount,
    readingTime: estimateReadingTime(wordCount),
  });

  if (session.user.role === "READER") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "WRITER" } });
  }

  return NextResponse.json({ story }, { status: 201 });
});
