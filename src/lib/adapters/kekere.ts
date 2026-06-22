/**
 * Maps real Story rows onto the MockStory shape src/components/kekere/*
 * components were built against (Phase 10), same approach as the Narriva
 * adapters in src/lib/adapters/narriva.ts.
 */
import type { StoryWithAuthor, StoryForReader } from "@/lib/data/kekere-stories";
import type { MockStory } from "@/content/mock/kekere-stories";

const NEW_WINDOW_DAYS = 14;

function isRecentlyPublished(publishedAt: Date): boolean {
  return Date.now() - publishedAt.getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** @param trending Whether this story is part of a trending-sorted result set. */
export function toFeedStoryData(story: StoryWithAuthor, trending = false): MockStory {
  const publishedAt = story.publishedAt ?? story.createdAt;

  return {
    id: story.id,
    title: story.title,
    hookLine: story.hookLine,
    authorName: story.author.name,
    authorId: story.author.id,
    genre: story.genre,
    tier: story.tier.toLowerCase() as MockStory["tier"],
    isFree: story.cowrieCost === 0,
    cowrieCost: story.cowrieCost,
    readingTimeMinutes: story.readingTime,
    completionRate: story.completionRate ?? 0,
    isNew: isRecentlyPublished(publishedAt),
    isTrending: trending,
    coverColor: story.coverColor,
    publishedAt: publishedAt.toISOString(),
    paragraphs: story.body.split("\n\n"),
  };
}

/**
 * For the reader: `story.body` here is ALREADY the right text for the
 * requester (full body if unlocked, server-truncated preview if not — see
 * getStoryForReader). The resulting paragraphs array should be rendered
 * as-is; the reader must NOT re-derive a "preview" from it client-side.
 */
export function toReaderStoryData(story: StoryForReader): MockStory {
  return { ...toFeedStoryData(story), paragraphs: story.body.split("\n\n") };
}
