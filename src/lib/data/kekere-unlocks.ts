import { prisma } from "@/lib/db/prisma";
import { isStoryUnlocked } from "@/lib/data/kekere-stories";

export async function getUnlockStatus(userId: string, storyId: string): Promise<boolean> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, cowrieCost: true, authorId: true },
  });
  if (!story) return false;
  return isStoryUnlocked(story, userId);
}
