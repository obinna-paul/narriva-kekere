import { prisma } from "@/lib/db/prisma";

export async function markStoryComplete(userId: string, storyId: string) {
  return prisma.storyCompletion.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId },
    update: {},
  });
}
