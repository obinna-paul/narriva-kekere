import { prisma } from "@/lib/db/prisma";

export async function getKekereUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, bio: true, avatarColor: true },
  });
}

export interface WriterStats {
  publishedCount: number;
  /** Proxy: count of unlocks (paid or first-story-free) across this
   * writer's stories. Free-story reads aren't tracked anywhere else — there's
   * no view/impression model in the schema — so this undercounts real
   * readership. Real read-tracking is future work, not in this phase's scope. */
  totalReads: number;
  /** The writer's actual EARNINGS_CREDIT + TIP_RECEIVED ledger total — not
   * a sum of cowrieCost over every unlock, since a story's first-story-free
   * unlocks spend nothing and credit nothing (see cowries.ts), so summing
   * cowrieCost over all unlocks over-counts real earnings by including them. */
  cowriesEarned: number;
  /** Whether to show the "Writing" stats section at all — true if they've
   * authored anything, published or not (not just `publishedCount > 0`). */
  hasAuthoredAnyStory: boolean;
}

export async function getWriterStats(userId: string): Promise<WriterStats> {
  const [publishedCount, anyStoryCount, totalReads, earnings] = await Promise.all([
    prisma.story.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    prisma.story.count({ where: { authorId: userId } }),
    prisma.storyUnlock.count({ where: { story: { authorId: userId } } }),
    prisma.transaction.aggregate({
      where: {
        wallet: { userId },
        type: { in: ["EARNINGS_CREDIT", "TIP_RECEIVED"] },
        status: "COMPLETED",
      },
      _sum: { amountCowries: true },
    }),
  ]);

  return {
    publishedCount,
    totalReads,
    cowriesEarned: earnings._sum.amountCowries?.toNumber() ?? 0,
    hasAuthoredAnyStory: anyStoryCount > 0,
  };
}

export interface ReaderStats {
  /** Proxy: count of this user's own unlocks. Free stories they've read
   * without unlocking aren't tracked — same caveat as WriterStats.totalReads. */
  storiesRead: number;
  savedCount: number;
}

export async function getReaderStats(userId: string): Promise<ReaderStats> {
  const [storiesRead, savedCount] = await Promise.all([
    prisma.storyUnlock.count({ where: { userId } }),
    prisma.savedStory.count({ where: { userId } }),
  ]);

  return { storiesRead, savedCount };
}

export async function updateKekereProfile(userId: string, data: { name: string; bio: string }) {
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, bio: data.bio },
    select: { name: true, bio: true },
  });
}
