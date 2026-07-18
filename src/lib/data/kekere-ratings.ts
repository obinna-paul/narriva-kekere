import { prisma } from "@/lib/db/prisma";

export async function upsertStoryRating(userId: string, storyId: string, rating: number) {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return prisma.storyRating.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId, rating: clamped },
    update: { rating: clamped },
  });
}

export async function getStoryRating(userId: string, storyId: string): Promise<number | null> {
  const row = await prisma.storyRating.findUnique({
    where: { userId_storyId: { userId, storyId } },
    select: { rating: true },
  });
  return row?.rating ?? null;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

/** Average + count per story, for every published story by this writer —
 * average and count shown together (never just a total star count) so a
 * 5.0-from-2-ratings isn't mistaken for a 4.5-from-500. */
export async function getRatingSummaryByStory(storyIds: string[]): Promise<Map<string, RatingSummary>> {
  if (storyIds.length === 0) return new Map();

  const groups = await prisma.storyRating.groupBy({
    by: ["storyId"],
    where: { storyId: { in: storyIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    groups.map((g) => [g.storyId, { average: g._avg.rating, count: g._count.rating }]),
  );
}

/** Rolled up across every story this writer has published — the writer-level
 * average shown at the top of their profile. */
export async function getWriterRatingSummary(writerId: string): Promise<RatingSummary> {
  const result = await prisma.storyRating.aggregate({
    where: { story: { authorId: writerId } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { average: result._avg.rating, count: result._count.rating };
}
