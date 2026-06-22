import { prisma } from "@/lib/db/prisma";
import { isStoryUnlocked } from "@/lib/data/kekere-stories";

export class InsufficientBalanceError extends Error {
  constructor(public readonly required: number, public readonly balance: number) {
    super(`Insufficient balance: need ${required}, have ${balance}`);
    this.name = "InsufficientBalanceError";
  }
}

export class StoryNotAvailableError extends Error {
  constructor() {
    super("Story not found or not published");
    this.name = "StoryNotAvailableError";
  }
}

export async function getUnlockStatus(userId: string, storyId: string): Promise<boolean> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, cowrieCost: true, authorId: true },
  });
  if (!story) return false;
  return isStoryUnlocked(story, userId);
}

export interface UnlockResult {
  alreadyUnlocked: boolean;
  balance: number;
}

/**
 * Wallet decrement + StoryUnlock + Transaction all happen inside one
 * prisma.$transaction — if any step fails, all of it rolls back, so a
 * balance can never be deducted without the unlock record existing (or
 * vice versa).
 */
export async function unlockStory(userId: string, storyId: string): Promise<UnlockResult> {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.findUnique({ where: { id: storyId } });
    if (!story || story.status !== "PUBLISHED") {
      throw new StoryNotAvailableError();
    }

    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet not found for user");

    if (story.cowrieCost === 0 || story.authorId === userId) {
      return { alreadyUnlocked: true, balance: wallet.balance };
    }

    const existing = await tx.storyUnlock.findUnique({
      where: { userId_storyId: { userId, storyId } },
    });
    if (existing) {
      return { alreadyUnlocked: true, balance: wallet.balance };
    }

    if (wallet.balance < story.cowrieCost) {
      throw new InsufficientBalanceError(story.cowrieCost, wallet.balance);
    }

    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: story.cowrieCost } },
    });

    await tx.storyUnlock.create({ data: { userId, storyId } });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "UNLOCK",
        amountCowries: -story.cowrieCost,
        status: "COMPLETED",
        description: `Unlocked "${story.title}"`,
      },
    });

    return { alreadyUnlocked: false, balance: updatedWallet.balance };
  });
}
