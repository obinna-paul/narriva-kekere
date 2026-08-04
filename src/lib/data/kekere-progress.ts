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

/**
 * "N% finish" is meant to answer "of the readers who unlocked this, how many
 * finished it" — so the count of finishers has to be readers who actually
 * went through an unlock. The author and every ADMIN account read with full
 * access and never create a StoryUnlock row (see isStoryUnlockedFor in
 * kekere-stories.ts), but their StoryCompletion rows counted anyway — for a
 * lightly-unlocked story, an author preview plus a couple of admin QA reads
 * was enough completions-with-no-matching-unlock to push the rate past
 * 100%. Excluded here rather than just clamped, since the number is
 * supposed to measure real reader behaviour, not admin/author activity —
 * the clamp stays too, as a last-resort guard against ever displaying
 * something a percentage can't be.
 */
export async function recalculateCompletionRate(storyId: string): Promise<number | null> {
  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
  if (!story) return null;

  const [completions, unlocks] = await Promise.all([
    prisma.storyCompletion.count({
      where: { storyId, userId: { not: story.authorId }, user: { role: { not: "ADMIN" } } },
    }),
    prisma.storyUnlock.count({ where: { storyId } }),
  ]);
  const rate = unlocks > 0 ? Math.min(100, Math.round((completions / unlocks) * 100)) : 0;
  await prisma.story.update({ where: { id: storyId }, data: { completionRate: rate } });
  return rate;
}

/**
 * One-off backfill for stories published before the author/admin exclusion
 * above existed — their stored completionRate can be stuck above 100 (or
 * otherwise inflated) until someone completes them again under the new
 * logic, which for a low-traffic story might be a long time. Safe to run
 * any number of times: it's a pure recompute, not an increment.
 */
export async function recalculateAllCompletionRates(): Promise<
  { storyId: string; title: string; oldRate: number; newRate: number }[]
> {
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, completionRate: true },
  });

  const changed: { storyId: string; title: string; oldRate: number; newRate: number }[] = [];
  for (const story of stories) {
    const newRate = await recalculateCompletionRate(story.id);
    if (newRate !== null && newRate !== story.completionRate) {
      changed.push({ storyId: story.id, title: story.title, oldRate: story.completionRate ?? 0, newRate });
    }
  }
  return changed;
}
