/**
 * Single source of truth for every cowrie balance change.
 *
 * No other module should write directly to Wallet.spendingBalance or
 * Wallet.earnedBalance — route handlers and UI call into the functions
 * exported here instead. Each one is atomic: either the whole set of writes
 * (wallets, ledger rows, unlock/tip/completion records) commits, or none of
 * it does.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getSettingNumber } from "@/lib/settings/get";
import { round2 } from "@/lib/economy/round";
import {
  TIP_AMOUNT_COWRIES,
  WRITER_EARNINGS_RATE,
} from "@/content/decisions";

export type UnlockResult =
  | { success: true; cowriesSpent: number; writerShare: number; platformShare: number; balance: number; firstStoryFree?: boolean }
  | { already_unlocked: true; balance: number }
  | { insufficient_balance: true; balance: number; needed: number }
  | { error: "story_not_available" };

export type TipResult =
  | { success: true }
  | { already_tipped: true }
  | { insufficient_balance: true; balance: number }
  | { error: "not_completed" }
  | { error: "cannot_tip_self" }
  | { error: "story_not_found" };

export type TopUpResult =
  | { success: true; newBalance: number }
  | { already_processed: true };

export type ReferralRewardResult =
  | { success: true; reward: number; referrerId: string }
  | { already_rewarded: true }
  | { error: "referral_not_found" };

/** Returns true if the reader already has access: they authored it, or have an unlock record. */
async function isAlreadyUnlocked(userId: string, storyId: string, story: { authorId: string }) {
  if (story.authorId === userId) return true;
  const existing = await prisma.storyUnlock.findUnique({
    where: { userId_storyId: { userId, storyId } },
  });
  return !!existing;
}

export async function unlockStory(userId: string, storyId: string): Promise<UnlockResult> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, title: true, authorId: true, cowrieCost: true, status: true },
  });

  if (!story || story.status !== "PUBLISHED" || story.cowrieCost < 1) {
    return { error: "story_not_available" };
  }

  const existingUnlock = await prisma.storyUnlock.findUnique({
    where: { userId_storyId: { userId, storyId } },
  });

  const readerWallet = await prisma.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  if (existingUnlock) {
    return { already_unlocked: true, balance: readerWallet.spendingBalance };
  }

  // First-story-free benefit: new users get their first unlock at no cost.
  const reader = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeReadUsed: true },
  });

  if (reader && !reader.freeReadUsed) {
    const storyUnlockId = randomUUID();
    await prisma.$transaction([
      prisma.storyUnlock.create({
        data: { id: storyUnlockId, userId, storyId, unlockedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { freeReadUsed: true },
      }),
    ]);
    return {
      success: true,
      cowriesSpent: 0,
      writerShare: 0,
      platformShare: 0,
      balance: readerWallet.spendingBalance,
      firstStoryFree: true,
    };
  }

  if (readerWallet.spendingBalance < story.cowrieCost) {
    return {
      insufficient_balance: true,
      balance: readerWallet.spendingBalance,
      needed: story.cowrieCost,
    };
  }

  const writerRate = await getSettingNumber("writer_earnings_rate", WRITER_EARNINGS_RATE);
  // Exact decimal split, not floored to a whole cowrie — a 1-cowrie unlock
  // nets the writer exactly 0.70, not 0.
  const writerShare = round2(story.cowrieCost * writerRate);
  const platformShare = round2(story.cowrieCost - writerShare);

  // Ensure the writer's wallet row exists before the atomic block below —
  // this upsert moves no money, it only guarantees `writerWallet.id` is
  // known so the transaction array can reference it.
  const writerWallet = await prisma.wallet.upsert({
    where: { userId: story.authorId },
    create: { userId: story.authorId },
    update: {},
  });

  const storyUnlockId = randomUUID();
  const now = new Date();

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: readerWallet.id },
      data: { spendingBalance: { decrement: story.cowrieCost } },
    }),
    prisma.wallet.update({
      where: { id: writerWallet.id },
      data: { earnedBalance: { increment: writerShare } },
    }),
    prisma.storyUnlock.create({
      data: { id: storyUnlockId, userId, storyId, unlockedAt: now },
    }),
    prisma.transaction.create({
      data: {
        walletId: readerWallet.id,
        type: "UNLOCK",
        amountCowries: story.cowrieCost,
        walletField: "SPENDING",
        description: `Unlocked: ${story.title}`,
        status: "COMPLETED",
      },
    }),
    prisma.transaction.create({
      data: {
        walletId: writerWallet.id,
        type: "EARNINGS_CREDIT",
        amountCowries: writerShare,
        walletField: "EARNED",
        description: `Story earnings: ${story.title}`,
        status: "COMPLETED",
      },
    }),
    prisma.platformEarnings.create({
      data: { storyId, unlockId: storyUnlockId, cowries: platformShare },
    }),
  ]);

  return {
    success: true,
    cowriesSpent: story.cowrieCost,
    writerShare,
    platformShare,
    balance: readerWallet.spendingBalance - story.cowrieCost,
  };
}

export async function sendTip(readerId: string, storyId: string): Promise<TipResult> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, title: true, authorId: true },
  });
  if (!story) return { error: "story_not_found" };

  const writerId = story.authorId;
  if (readerId === writerId) return { error: "cannot_tip_self" };

  const completed = await prisma.storyCompletion.findUnique({
    where: { userId_storyId: { userId: readerId, storyId } },
  });
  if (!completed) return { error: "not_completed" };

  const existingTip = await prisma.tip.findUnique({
    where: { readerId_storyId: { readerId, storyId } },
  });
  if (existingTip) return { already_tipped: true };

  const readerWallet = await prisma.wallet.upsert({
    where: { userId: readerId },
    create: { userId: readerId },
    update: {},
  });

  const tipAmount = await getSettingNumber("tip_amount_cowries", TIP_AMOUNT_COWRIES);
  if (readerWallet.spendingBalance < tipAmount) {
    return { insufficient_balance: true, balance: readerWallet.spendingBalance };
  }

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: readerWallet.id },
      data: { spendingBalance: { decrement: tipAmount } },
    });

    const writerWallet = await tx.wallet.upsert({
      where: { userId: writerId },
      create: { userId: writerId, earnedBalance: tipAmount },
      update: { earnedBalance: { increment: tipAmount } },
    });

    await tx.tip.create({
      data: { readerId, writerId, storyId, tippedAt: new Date() },
    });

    await tx.transaction.create({
      data: {
        walletId: readerWallet.id,
        type: "TIP_SENT",
        amountCowries: tipAmount,
        walletField: "SPENDING",
        description: `Tip: ${story.title}`,
        status: "COMPLETED",
      },
    });

    await tx.transaction.create({
      data: {
        walletId: writerWallet.id,
        type: "TIP_RECEIVED",
        amountCowries: tipAmount,
        walletField: "EARNED",
        description: `Tip received: ${story.title}`,
        status: "COMPLETED",
      },
    });
  });

  return { success: true };
}

export async function creditTopUp(
  userId: string,
  cowriesTotal: number,
  paymentReference: string
): Promise<TopUpResult> {
  const existing = await prisma.transaction.findFirst({
    where: { paymentReference, type: "TOP_UP", status: "COMPLETED" },
  });
  if (existing) return { already_processed: true };

  const updatedWallet = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: { userId, spendingBalance: cowriesTotal },
      update: { spendingBalance: { increment: cowriesTotal } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "TOP_UP",
        amountCowries: cowriesTotal,
        walletField: "SPENDING",
        paymentReference,
        status: "COMPLETED",
      },
    });

    return wallet;
  });

  return { success: true, newBalance: updatedWallet.spendingBalance };
}

/**
 * Credits a referrer's 3-cowrie reward once their invitee's first unlock
 * lands. Caller (kekere-referrals.ts) is responsible for finding the
 * PENDING Referral and for any follow-up notification — this function only
 * owns the money movement and the Referral's status flip.
 */
export async function creditReferralReward(referralId: string): Promise<ReferralRewardResult> {
  const referral = await prisma.referral.findUnique({ where: { id: referralId } });
  if (!referral) return { error: "referral_not_found" };
  if (referral.status !== "PENDING") return { already_rewarded: true };

  const setting = await prisma.platformSetting.findUnique({
    where: { key: "referral_reward_cowries" },
  });
  const reward = parseInt(setting?.value ?? "3", 10);

  // Flip PENDING -> REWARDED first, conditioned on still being PENDING. If
  // a concurrent call already won that flip, count is 0 and we skip the
  // wallet credit entirely rather than double-paying the referrer.
  const wonRace = await prisma.$transaction(async (tx) => {
    const flipped = await tx.referral.updateMany({
      where: { id: referralId, status: "PENDING" },
      data: { status: "REWARDED", rewardedAt: new Date() },
    });
    if (flipped.count === 0) return false;

    const wallet = await tx.wallet.upsert({
      where: { userId: referral.referrerId },
      create: { userId: referral.referrerId, spendingBalance: reward },
      update: { spendingBalance: { increment: reward } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "REFERRAL_REWARD",
        amountCowries: reward,
        walletField: "SPENDING",
        description: "Referral reward — your invite unlocked their first story",
        status: "COMPLETED",
      },
    });

    return true;
  });

  if (!wonRace) return { already_rewarded: true };
  return { success: true, reward, referrerId: referral.referrerId };
}
