/**
 * Maps real Story rows onto the MockStory shape src/components/kekere/*
 * components were built against (Phase 10), same approach as the Narriva
 * adapters in src/lib/adapters/narriva.ts.
 */
import type { StoryWithAuthor, StoryForReader } from "@/lib/data/kekere-stories";
import type { MockStory } from "@/content/mock/kekere-stories";
import { storyCoverUrl, userAvatarUrl } from "@/lib/storage/cloudinary-urls";

const NEW_WINDOW_DAYS = 14;

function isRecentlyPublished(publishedAt: Date): boolean {
  return Date.now() - publishedAt.getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Feed cards (StoryCard) never render `paragraphs` — they only show
 * hookLine/cover/stats — so this deliberately does NOT include the story
 * body at all. `listStories()` returns the full Prisma row regardless of
 * unlock status (it has no reason to gate, since it's a list query), so if
 * this adapter put `story.body` into the result, the public, unauthenticated
 * feed endpoint (GET /api/kekere/stories) would leak the full text of every
 * paid story to anyone — bypassing the cowrie paywall entirely. Use
 * toReaderStoryData for the one place a real (gated) body is needed.
 */
export function toFeedStoryData(story: Omit<StoryWithAuthor, "body">, trending = false): MockStory {
  const publishedAt = story.publishedAt ?? story.createdAt;

  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    hookLine: story.hookLine,
    authorName: story.author.name,
    authorId: story.author.id,
    authorAvatarColor: story.author.avatarColor,
    authorAvatarUrl: story.author.avatar ? userAvatarUrl(story.author.avatar) : null,
    authorBio: story.author.bio,
    genre: story.genre,
    tier: story.tier.toLowerCase() as MockStory["tier"],
    isFree: false,
    cowrieCost: story.cowrieCost,
    readingTimeMinutes: story.readingTime,
    completionRate: story.completionRate ?? 0,
    isNew: isRecentlyPublished(publishedAt),
    isTrending: trending,
    coverColor: story.coverColor,
    coverImageUrl: story.coverImageRef
      ? storyCoverUrl(story.coverImageRef)
      : undefined,
    publishedAt: publishedAt.toISOString(),
    isAdult: story.isAdult,
    paragraphs: [],
    bodyDoc: null,
    tags: story.tags.map((st) => st.tag.slug),
  };
}

/**
 * For the reader: `story.body` here is ALREADY the right doc for the
 * requester (full doc if unlocked, server-truncated preview doc if not —
 * see getStoryForReader). Rendered as-is by the Tiptap reader; the reader
 * must NOT re-derive a "preview" from it client-side.
 */
export function toReaderStoryData(story: StoryForReader): MockStory {
  return { ...toFeedStoryData(story), bodyDoc: story.body };
}
