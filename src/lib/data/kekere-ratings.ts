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
