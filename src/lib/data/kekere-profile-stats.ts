import { prisma } from "@/lib/db/prisma";

// A type alias, not an interface: Prisma's generated JSON input type rejects
// interfaces here (they're structurally "open" for declaration merging),
// same reason authors.ts's equivalent field uses an inline object type.
export type SocialLink = {
  label: string;
  href: string;
};

export async function getKekereUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      bio: true,
      avatarColor: true,
      avatar: true,
      socialLinks: true,
      country: true,
    },
  });
  if (!user) return null;

  return {
    ...user,
    socialLinks: (user.socialLinks as SocialLink[] | null) ?? [],
  };
}

export interface WriterStats {
  publishedCount: number;
  /** Proxy: count of unlocks (paid or first-story-free) across this
   * writer's stories. Free-story reads aren't tracked anywhere else — there's
   * no view/impression model in the schema — so this undercounts real
   * readership. Real read-tracking is future work, not in this phase's scope. */
  totalReads: number;
  /** Whether to show the "Writing" stats section at all — true if they've
   * authored anything, published or not (not just `publishedCount > 0`). */
  hasAuthoredAnyStory: boolean;
}

export async function getWriterStats(userId: string): Promise<WriterStats> {
  const [publishedCount, anyStoryCount, totalReads] = await Promise.all([
    prisma.story.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    prisma.story.count({ where: { authorId: userId } }),
    prisma.storyUnlock.count({ where: { story: { authorId: userId } } }),
  ]);

  return {
    publishedCount,
    totalReads,
    hasAuthoredAnyStory: anyStoryCount > 0,
  };
}

export interface ReaderStats {
  /** Distinct stories this user has unlocked OR completed — a union, not
   * just unlock count, because completing a story doesn't require an
   * unlock row: the story's own author (previewing their own work) and
   * admins (isStoryUnlockedFor in kekere-stories.ts) can both read and
   * complete a story with no StoryUnlock ever created. Counting unlocks
   * alone could show fewer "stories read" than "stories completed", which
   * is a nonsensical thing to show someone. */
  storiesRead: number;
  storiesCompleted: number;
  savedCount: number;
}

export async function getReaderStats(userId: string): Promise<ReaderStats> {
  const [unlockedStoryIds, completedStoryIds, savedCount] = await Promise.all([
    prisma.storyUnlock.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.storyCompletion.findMany({ where: { userId }, select: { storyId: true } }),
    prisma.savedStory.count({ where: { userId } }),
  ]);

  const readStoryIds = new Set([
    ...unlockedStoryIds.map((u) => u.storyId),
    ...completedStoryIds.map((c) => c.storyId),
  ]);

  return { storiesRead: readStoryIds.size, storiesCompleted: completedStoryIds.length, savedCount };
}

export async function updateKekereProfile(
  userId: string,
  data: { name: string; bio: string; socialLinks?: SocialLink[]; country?: string | null },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      bio: data.bio,
      socialLinks: data.socialLinks,
      country: data.country,
    },
    select: { name: true, bio: true, socialLinks: true, country: true },
  });
}

export async function updateUserAvatar(userId: string, avatarKey: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarKey },
    select: { avatar: true },
  });
}
