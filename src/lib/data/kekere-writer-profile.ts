import type { StoryTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getRatingSummaryByStory, getWriterRatingSummary, type RatingSummary } from "@/lib/data/kekere-ratings";
import { MIN_COMING_SOON_WORD_COUNT } from "@/content/kekere-coming-soon";

export { MIN_COMING_SOON_WORD_COUNT };

export interface PublicWriterProfile {
  id: string;
  name: string;
  bio: string | null;
  country: string | null;
  avatarColor: string | null;
  avatar: string | null;
  socialLinks: { label: string; href: string }[];
  memberSince: Date;
  kekereUsername: string | null;
  comingSoon: ComingSoonStory | null;
  crossPromotionEnabled: boolean;
}

export interface ComingSoonStory {
  id: string;
  title: string;
  hookLine: string;
}

export interface EligibleDraft {
  id: string;
  title: string;
  hookLine: string;
  wordCount: number;
  updatedAt: Date;
}

/** This writer's own drafts that have enough written to feature as a
 * "coming soon" pick — powers the picker in the profile edit form. */
export async function getEligibleComingSoonDrafts(writerId: string): Promise<EligibleDraft[]> {
  return prisma.story.findMany({
    where: { authorId: writerId, status: "DRAFT", wordCount: { gte: MIN_COMING_SOON_WORD_COUNT } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, hookLine: true, wordCount: true, updatedAt: true },
  });
}

/**
 * Re-validates a writer's `currentlyWritingStoryId` at read time rather than
 * trusting the stored pointer — it's a soft reference (see the schema
 * comment), so a story that got published, deleted, or edited back below
 * the word-count bar simply stops resolving here instead of needing to be
 * proactively cleared from every place a story's status can change.
 */
export async function getValidatedComingSoonStory(writerId: string, storyId: string): Promise<ComingSoonStory | null> {
  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      authorId: writerId,
      status: "DRAFT",
      wordCount: { gte: MIN_COMING_SOON_WORD_COUNT },
    },
    select: { id: true, title: true, hookLine: true },
  });
  if (!story) return null;
  return { id: story.id, title: story.title, hookLine: story.hookLine.trim() };
}

/**
 * Two different reasons this page can come up empty, kept distinct on
 * purpose: an unknown/mistyped id is a genuine 404, but an account that
 * exists and simply hasn't published anything is a normal, expected state —
 * "no public profile," not a broken link. Being a published writer is the
 * privacy boundary here in lieu of a real per-user visibility setting: a
 * plain reader account never gets a public page, only genuine writers do.
 */
export type PublicWriterProfileResult =
  | { kind: "writer"; profile: PublicWriterProfile }
  | { kind: "not_a_writer"; name: string }
  | { kind: "not_found" };

/**
 * `identifier` is either a raw user id (every existing internal link — the
 * feed, notifications, AuthorChip, the writer's own "view your public
 * profile" fallback) or a kekereUsername (the prettier vanity URL surfaced
 * once a writer sets one). Trying both in one query keeps every old link
 * working forever without a redirect, since the two id spaces can't
 * collide: usernames are validated to a short human-legible charset,
 * nothing like a cuid.
 */
export async function getPublicWriterProfile(identifier: string): Promise<PublicWriterProfileResult> {
  const [user, publishedCount] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ id: identifier }, { kekereUsername: identifier }] },
      select: {
        id: true,
        name: true,
        bio: true,
        country: true,
        avatarColor: true,
        avatar: true,
        socialLinks: true,
        createdAt: true,
        kekereUsername: true,
        currentlyWritingStoryId: true,
        crossPromotionEnabled: true,
      },
    }),
    prisma.story.count({ where: { author: { OR: [{ id: identifier }, { kekereUsername: identifier }] }, status: "PUBLISHED" } }),
  ]);

  if (!user) return { kind: "not_found" };
  if (publishedCount === 0) return { kind: "not_a_writer", name: user.name };

  const comingSoon = user.currentlyWritingStoryId
    ? await getValidatedComingSoonStory(user.id, user.currentlyWritingStoryId)
    : null;

  return {
    kind: "writer",
    profile: {
      id: user.id,
      name: user.name,
      bio: user.bio,
      country: user.country,
      avatarColor: user.avatarColor,
      avatar: user.avatar,
      socialLinks: (user.socialLinks as { label: string; href: string }[] | null) ?? [],
      memberSince: user.createdAt,
      kekereUsername: user.kekereUsername,
      comingSoon,
      crossPromotionEnabled: user.crossPromotionEnabled,
    },
  };
}

export interface WriterProfileStory {
  id: string;
  slug: string | null;
  title: string;
  hookLine: string;
  coverColor: string;
  coverImageRef: string | null;
  readingTime: number;
  tier: StoryTier;
  publishedAt: Date;
  reads: number;
  rating: RatingSummary;
  mostPopular: boolean;
  isAdult: boolean;
}

/** This writer's published stories, most recent first — a "most popular"
 * flag (by unlock count) marks one story rather than reordering the list,
 * per the "most recent first, with a most-popular highlight" spec. */
export async function getWriterPublishedStories(userId: string): Promise<WriterProfileStory[]> {
  const stories = await prisma.story.findMany({
    where: { authorId: userId, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      hookLine: true,
      coverColor: true,
      coverImageRef: true,
      readingTime: true,
      tier: true,
      publishedAt: true,
      createdAt: true,
      isAdult: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  if (stories.length === 0) return [];

  const storyIds = stories.map((s) => s.id);
  const [unlockCounts, ratingByStory] = await Promise.all([
    prisma.storyUnlock.groupBy({ by: ["storyId"], where: { storyId: { in: storyIds } }, _count: { storyId: true } }),
    getRatingSummaryByStory(storyIds),
  ]);

  const readsByStory = new Map(unlockCounts.map((u) => [u.storyId, u._count.storyId]));
  let mostPopularId: string | null = null;
  let mostPopularReads = 0;
  readsByStory.forEach((reads, storyId) => {
    if (reads > mostPopularReads) {
      mostPopularReads = reads;
      mostPopularId = storyId;
    }
  });

  return stories.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    hookLine: s.hookLine,
    coverColor: s.coverColor,
    coverImageRef: s.coverImageRef,
    readingTime: s.readingTime,
    tier: s.tier,
    publishedAt: s.publishedAt ?? s.createdAt,
    reads: readsByStory.get(s.id) ?? 0,
    rating: ratingByStory.get(s.id) ?? { average: null, count: 0 },
    mostPopular: mostPopularReads > 0 && s.id === mostPopularId,
    isAdult: s.isAdult,
  }));
}

export interface WriterProfileStats {
  publishedCount: number;
  totalReads: number;
  rating: RatingSummary;
}

export async function getWriterProfileStats(userId: string): Promise<WriterProfileStats> {
  const [publishedCount, totalReads, rating] = await Promise.all([
    prisma.story.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    prisma.storyUnlock.count({ where: { story: { authorId: userId } } }),
    getWriterRatingSummary(userId),
  ]);

  return { publishedCount, totalReads, rating };
}

export interface WriterFollowStats {
  publishedCount: number;
  rating: RatingSummary;
}

/**
 * Published-story count + rating for many writers at once — three queries
 * total regardless of list size, rather than an N+1 per writer. Powers the
 * "Following" list on the self-profile page.
 *
 * `storyRating` can't be grouped by `story.authorId` directly (relation
 * fields aren't groupable in Prisma), so this reconstructs each writer's
 * aggregate from their per-story summaries instead of a fourth query:
 * average * count reproduces that story's rating total exactly.
 */
export async function getWriterStatsBatch(writerIds: string[]): Promise<Map<string, WriterFollowStats>> {
  if (writerIds.length === 0) return new Map();

  const [countGroups, stories] = await Promise.all([
    prisma.story.groupBy({
      by: ["authorId"],
      where: { authorId: { in: writerIds }, status: "PUBLISHED" },
      _count: { authorId: true },
    }),
    prisma.story.findMany({
      where: { authorId: { in: writerIds }, status: "PUBLISHED" },
      select: { id: true, authorId: true },
    }),
  ]);

  const ratingByStory = await getRatingSummaryByStory(stories.map((s) => s.id));
  const countByWriter = new Map(countGroups.map((g) => [g.authorId, g._count.authorId]));

  const sumByWriter = new Map<string, { total: number; count: number }>();
  for (const story of stories) {
    const r = ratingByStory.get(story.id);
    if (!r || r.average === null || r.count === 0) continue;
    const entry = sumByWriter.get(story.authorId) ?? { total: 0, count: 0 };
    entry.total += r.average * r.count;
    entry.count += r.count;
    sumByWriter.set(story.authorId, entry);
  }

  return new Map(
    writerIds.map((id) => {
      const sum = sumByWriter.get(id);
      const rating: RatingSummary =
        sum && sum.count > 0 ? { average: sum.total / sum.count, count: sum.count } : { average: null, count: 0 };
      return [id, { publishedCount: countByWriter.get(id) ?? 0, rating }];
    }),
  );
}

export interface SimilarWriter {
  id: string;
  name: string;
  avatar: string | null;
  avatarColor: string | null;
  kekereUsername: string | null;
  topStoryTitle: string;
}

/**
 * Cross-promotion candidates for the "you might also like" section — other
 * writers who've also opted in (crossPromotionEnabled), ranked by how many
 * of the same tags they write in. The candidate pool itself is already
 * small (opted-in writers with a published story), so scoring in memory
 * here matches the batching approach used elsewhere in this file rather
 * than reaching for raw SQL for a three-table join.
 */
export async function getSimilarWriters(writerId: string, limit = 3): Promise<SimilarWriter[]> {
  const myTags = await prisma.storyTag.findMany({
    where: { story: { authorId: writerId, status: "PUBLISHED" } },
    select: { tagId: true },
  });
  const myTagIds = new Set(myTags.map((t) => t.tagId));
  if (myTagIds.size === 0) return [];

  const candidates = await prisma.user.findMany({
    where: { id: { not: writerId }, crossPromotionEnabled: true, stories: { some: { status: "PUBLISHED" } } },
    select: {
      id: true,
      name: true,
      avatar: true,
      avatarColor: true,
      kekereUsername: true,
      stories: {
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: { title: true, tags: { select: { tagId: true } } },
      },
    },
  });

  const scored = candidates.map((c) => {
    const theirTagIds = new Set(c.stories.flatMap((s) => s.tags.map((t) => t.tagId)));
    let sharedTagCount = 0;
    theirTagIds.forEach((id) => {
      if (myTagIds.has(id)) sharedTagCount++;
    });
    return { candidate: c, sharedTagCount };
  });

  return scored
    .filter((s) => s.sharedTagCount > 0)
    .sort((a, b) => b.sharedTagCount - a.sharedTagCount)
    .slice(0, limit)
    .map(({ candidate: c }) => ({
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      avatarColor: c.avatarColor,
      kekereUsername: c.kekereUsername,
      topStoryTitle: c.stories[0]?.title ?? "",
    }));
}
