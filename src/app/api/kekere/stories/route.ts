import { NextResponse } from "next/server";
import { z } from "zod";
import type { StoryTier } from "@prisma/client";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { createStory, listStories } from "@/lib/data/kekere-stories";
import { toFeedStoryData } from "@/lib/adapters/kekere";

const WORDS_PER_MINUTE = 200;

function estimateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tier = (url.searchParams.get("tier") as StoryTier | null) ?? undefined;
  const genre = url.searchParams.get("genre") ?? undefined;
  const freeOnly = url.searchParams.get("free") === "true";
  const search = url.searchParams.get("search") ?? undefined;
  const sort = url.searchParams.get("sort") === "trending" ? "trending" : "recent";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");

  // Public feed only — status is never accepted from the query string, so
  // there's no way to ask this endpoint for drafts.
  const result = await listStories({
    tier,
    genre,
    freeOnly,
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
  body: z.string().min(1),
  genre: z.string().optional(),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]).optional(),
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
  const body = await request.json();
  const parsed = createStorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const story = await createStory(session.user.id, {
    ...parsed.data,
    readingTime: estimateReadingTime(parsed.data.body),
  });

  if (session.user.role === "READER") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "WRITER" } });
  }

  return NextResponse.json({ story }, { status: 201 });
});
