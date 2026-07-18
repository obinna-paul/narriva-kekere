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
 * Public, unauthenticated-visible writer profile. Returns null unless this
 * user has at least one PUBLISHED story — that's the privacy boundary in
 * lieu of a real per-user visibility setting: a plain reader account with no
 * published work never gets a public page, only genuine writers do.
 */
export async function getPublicWriterProfile(userId: string): Promise<PublicWriterProfile | null> {
  const [user, publishedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, bio: true, country: true, avatarColor: true, avatar: true, socialLinks: true, createdAt: true },
    }),
    prisma.story.count({ where: { authorId: userId, status: "PUBLISHED" } }),
  ]);

  if (!user || publishedCount === 0) return null;

  return {
    id: user.id,
    name: user.name,
    bio: user.bio,
    country: user.country,
    avatarColor: user.avatarColor,
    avatar: user.avatar,
    socialLinks: (user.socialLinks as { label: string; href: string }[] | null) ?? [],
    memberSince: user.createdAt,
  };
}

export interface WriterProfileStory {
  id: string;
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
}

/** This writer's published stories, most recent first — a "most popular"
 * flag (by unlock count) marks one story rather than reordering the list,
 * per the "most recent first, with a most-popular highlight" spec. */
export async function getWriterPublishedStories(userId: string): Promise<WriterProfileStory[]> {
  const stories = await prisma.story.findMany({
    where: { authorId: userId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      hookLine: true,
      coverColor: true,
      coverImageRef: true,
      readingTime: true,
      tier: true,
      publishedAt: true,
      createdAt: true,
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
