import { prisma } from "@/lib/db/prisma";

export async function upsertReadingProgress(userId: string, storyId: string, scrollFraction: number) {
  const clamped = Math.max(0, Math.min(1, scrollFraction));
  return prisma.storyReadingProgress.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId, scrollFraction: clamped },
    update: { scrollFraction: clamped },
  });
}

export async function getReadingProgress(userId: string, storyId: string): Promise<number | null> {
  const row = await prisma.storyReadingProgress.findUnique({
    where: { userId_storyId: { userId, storyId } },
    select: { scrollFraction: true },
  });
  return row?.scrollFraction ?? null;
}
