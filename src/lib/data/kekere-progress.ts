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

export async function getReadingProgressBatch(
  userId: string,
  storyIds: string[],
): Promise<Record<string, number>> {
  if (storyIds.length === 0) return {};
  const rows = await prisma.storyReadingProgress.findMany({
    where: { userId, storyId: { in: storyIds } },
    select: { storyId: true, scrollFraction: true },
  });
  return Object.fromEntries(rows.map((r) => [r.storyId, r.scrollFraction]));
}

export async function recalculateCompletionRate(storyId: string): Promise<void> {
  const [completions, unlocks] = await Promise.all([
    prisma.storyCompletion.count({ where: { storyId } }),
    prisma.storyUnlock.count({ where: { storyId } }),
  ]);
  const rate = unlocks > 0 ? Math.round((completions / unlocks) * 100) : 0;
  await prisma.story.update({ where: { id: storyId }, data: { completionRate: rate } });
}
