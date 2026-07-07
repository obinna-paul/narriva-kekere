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
      deletionRequestedAt: true,
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
  /** Proxy: count of this user's own unlocks. Free stories they've read
   * without unlocking aren't tracked — same caveat as WriterStats.totalReads. */
  storiesRead: number;
  storiesCompleted: number;
  savedCount: number;
}

export async function getReaderStats(userId: string): Promise<ReaderStats> {
  const [storiesRead, storiesCompleted, savedCount] = await Promise.all([
    prisma.storyUnlock.count({ where: { userId } }),
    prisma.storyCompletion.count({ where: { userId } }),
    prisma.savedStory.count({ where: { userId } }),
  ]);

  return { storiesRead, storiesCompleted, savedCount };
}

export async function updateKekereProfile(
  userId: string,
  data: { name: string; bio: string; socialLinks?: SocialLink[] },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      bio: data.bio,
      socialLinks: data.socialLinks,
    },
    select: { name: true, bio: true, socialLinks: true },
  });
}

export async function updateUserAvatar(userId: string, avatarKey: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarKey },
    select: { avatar: true },
  });
}
