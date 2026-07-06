export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { searchStories } from "@/lib/data/kekere-stories";
import { toFeedStoryData } from "@/lib/adapters/kekere";

// Public, unauthenticated typeahead suggestions — same visibility as the
// public feed (PUBLISHED stories only, enforced inside searchStories).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const results = await searchStories(q);
  return NextResponse.json({ stories: results.map((story) => toFeedStoryData(story)) });
}
