import type { StoryTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getRatingSummaryByStory, getWriterRatingSummary, type RatingSummary } from "@/lib/data/kekere-ratings";

export interface PublicWriterProfile {
  id: string;
  name: string;
  bio: string | null;
  country: string | null;
  avatarColor: string | null;
  avatar: string | null;
  socialLinks: { label: string; href: string }[];
  memberSince: Date;
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

export async function getPublicWriterProfile(userId: string): Promise<PublicWriterProfileResult> {
  const [user, publishedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, bio: true, country: true, avatarColor: true, avatar: true, socialLinks: true, createdAt: true },
    }),
    prisma.story.count({ where: { authorId: userId, status: "PUBLISHED" } }),
  ]);

  if (!user) return { kind: "not_found" };
  if (publishedCount === 0) return { kind: "not_a_writer", name: user.name };

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
