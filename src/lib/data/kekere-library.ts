import { prisma } from "@/lib/db/prisma";
import type { StoryWithAuthor } from "@/lib/data/kekere-stories";

const authorInclude = {
  author: { select: { id: true, name: true, slug: true, avatarColor: true, avatar: true, bio: true } },
  tags: { include: { tag: true } },
} as const;

export interface UserLibrary {
  unlockedStories: StoryWithAuthor[];
  savedStories: StoryWithAuthor[];
}

export async function getUserLibrary(userId: string): Promise<UserLibrary> {
  const [unlocks, saved] = await Promise.all([
    prisma.storyUnlock.findMany({
      where: { userId },
      include: { story: { include: authorInclude } },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.savedStory.findMany({
      where: { userId },
      include: { story: { include: authorInclude } },
      orderBy: { savedAt: "desc" },
    }),
  ]);

  return {
    unlockedStories: unlocks.map((u) => u.story),
    savedStories: saved.map((s) => s.story),
  };
}

export async function saveStory(userId: string, storyId: string) {
  return prisma.savedStory.upsert({
    where: { userId_storyId: { userId, storyId } },
    update: {},
    create: { userId, storyId },
  });
}

export async function unsaveStory(userId: string, storyId: string): Promise<void> {
  await prisma.savedStory.deleteMany({ where: { userId, storyId } });
}

export async function isStorySaved(userId: string, storyId: string): Promise<boolean> {
  const saved = await prisma.savedStory.findUnique({
    where: { userId_storyId: { userId, storyId } },
  });
  return !!saved;
}

export interface ReadingHistoryItem {
  story: StoryWithAuthor;
  completed: boolean;
  completedAt: Date | null;
  scrollFraction: number;
}

export async function getReadingHistory(userId: string): Promise<ReadingHistoryItem[]> {
  const [completions, progressRows] = await Promise.all([
    prisma.storyCompletion.findMany({
      where: { userId },
      include: { story: { include: authorInclude } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.storyReadingProgress.findMany({
      where: { userId, scrollFraction: { gt: 0 } },
      include: { story: { include: authorInclude } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const completedIds = new Set(completions.map((c) => c.storyId));

  const completedItems: ReadingHistoryItem[] = completions.map((c) => ({
    story: c.story,
    completed: true,
    completedAt: c.completedAt,
    scrollFraction: 1,
  }));

  const inProgressItems: ReadingHistoryItem[] = progressRows
    .filter((p) => !completedIds.has(p.storyId))
    .map((p) => ({
      story: p.story,
      completed: false,
      completedAt: null,
      scrollFraction: p.scrollFraction,
    }));

  return [...completedItems, ...inProgressItems];
}
