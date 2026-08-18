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
import { checkRateLimit } from "@/lib/rate-limit";
import {
  TIP_AMOUNT_COWRIES,
  WRITER_EARNINGS_RATE,
  SIGNUP_BONUS_COWRIES,
  SIGNUP_BONUS_MAX_PER_IP,
  SIGNUP_BONUS_IP_WINDOW_MS,
} from "@/content/decisions";

export type UnlockResult =
  | { success: true; cowriesSpent: number; writerShare: number; platformShare: number; balance: number }
  | { already_unlocked: true; balance: number }
  | { insufficient_balance: true; balance: number; needed: number }
  | { error: "story_not_available" };

export type TipResult =
  | { success: true }
  | { insufficient_balance: true; balance: number }
  | { error: "not_completed" }
  | { error: "cannot_tip_self" }
  | { error: "story_not_found" };

export type TopUpResult =
  | { success: true; newBalance: number }
  | { already_processed: true };

export type MoveToSpendingResult =
  | { success: true; newEarnedBalance: number; newSpendingBalance: number }
  | { error: "invalid_amount" }
  | { error: "insufficient_earned_balance"; balance: number };

export type ReferralRewardResult =
  | { success: true; reward: number; referrerId: string }
  | { already_rewarded: true }
  | { error: "referral_not_found" };

export type SignupBonusResult =
  | { success: true; granted: number; balance: number }
  | { already_granted: true; balance: number };

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

/**
 * Moves whole cowries from a writer's earned (withdrawable) wallet into their
 * spending wallet. One-way and irreversible by design — there is deliberately
 * no reverse operation. Whole cowries only: the spending balance is an
 * integer (stories and tips cost whole cowries), while the earned balance can
 * carry a fraction (a 70% split), so a writer with 8.1 earned can move up to
 * 8, leaving 0.1 still withdrawable.
 *
 * Records a paired ledger entry — EARNED_TO_SPENDING_OUT (debits EARNED) and
 * EARNED_TO_SPENDING_IN (credits SPENDING) — so the transfer is net-zero for
 * the economy and every dashboard/reconciliation figure stays exact.
 */
export async function moveEarnedToSpending(userId: string, amount: number): Promise<MoveToSpendingResult> {
  if (!Number.isInteger(amount) || amount < 1) {
    return { error: "invalid_amount" };
  }

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const earnedBalance = wallet.earnedBalance.toNumber();
  if (earnedBalance < amount) {
    return { error: "insufficient_earned_balance", balance: earnedBalance };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        earnedBalance: { decrement: amount },
        spendingBalance: { increment: amount },
      },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "EARNED_TO_SPENDING_OUT",
        amountCowries: amount,
        walletField: "EARNED",
        description: "Moved to spending wallet",
        status: "COMPLETED",
      },
    });
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "EARNED_TO_SPENDING_IN",
        amountCowries: amount,
        walletField: "SPENDING",
        description: "Moved from earnings",
        status: "COMPLETED",
      },
    });

    return w;
  });

  return {
    success: true,
    newEarnedBalance: updated.earnedBalance.toNumber(),
    newSpendingBalance: updated.spendingBalance,
  };
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

/**
 * Credits every new account's one-time welcome grant into their spending
 * wallet — replaces the old free-first-unlock benefit. Unlike that benefit,
 * this is a real issuance: a SIGNUP_BONUS transaction backs the balance, so
 * it counts in totalIssued (reconcile.ts) instead of showing up as
 * untracked balance, and the writer whose story it eventually unlocks still
 * earns their normal 70% share same as any other spent cowrie.
 *
 * Idempotent via a ledger check rather than a boolean flag on User — safe
 * to call from every path that can create a wallet (fresh signup, resuming
 * an unverified signup, claiming an admin-created placeholder account)
 * without ever double-granting.
 */
export async function grantSignupBonus(userId: string): Promise<SignupBonusResult> {
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const existing = await prisma.transaction.findFirst({
    where: { walletId: wallet.id, type: "SIGNUP_BONUS" },
  });
  if (existing) return { already_granted: true, balance: wallet.spendingBalance };

  const bonus = await getSettingNumber("signup_bonus_cowries", SIGNUP_BONUS_COWRIES);

  const updated = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { id: wallet.id },
      data: { spendingBalance: { increment: bonus } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "SIGNUP_BONUS",
        amountCowries: bonus,
        walletField: "SPENDING",
        description: `Welcome bonus — ${bonus} free cowries to get started`,
        status: "COMPLETED",
      },
    });

    return w;
  });

  return { success: true, granted: bonus, balance: updated.spendingBalance };
}

export type SignupBonusEligibility =
  | SignupBonusResult
  | { withheld: "duplicate_inbox" | "ip_velocity" };

/**
 * Grants the signup bonus only if the account passes the anti-abuse gate —
 * otherwise the account keeps working normally, it just doesn't receive free
 * cowries. Called once, at email verification (grantSignupBonus itself stays
 * the low-level, always-grants primitive used by seeds/admin paths).
 *
 * Two withhold signals, both targeting the *bonus* and never the account:
 *  - duplicate_inbox: another account with the same canonical email already
 *    received a bonus — i.e. this is a +tag / dotted alias of one real inbox.
 *  - ip_velocity: too many bonuses already granted from this signup IP in the
 *    window. Deliberately a soft cap (see SIGNUP_BONUS_MAX_PER_IP) so shared
 *    carrier-NAT IPs don't lock real readers out — email is the primary gate.
 *
 * Order matters: we check for an already-granted bonus and the duplicate
 * inbox *before* consuming any IP budget, so a re-verify or a clearly-aliased
 * account never eats into a legitimately-shared IP's allowance.
 */
export async function grantSignupBonusIfEligible(userId: string): Promise<SignupBonusEligibility> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canonicalEmail: true,
      signupIp: true,
      wallet: { select: { id: true, spendingBalance: true } },
    },
  });
  if (!user) return { withheld: "duplicate_inbox" };

  // Already granted to this very account — idempotent no-op, no IP budget spent.
  if (user.wallet) {
    const existing = await prisma.transaction.findFirst({
      where: { walletId: user.wallet.id, type: "SIGNUP_BONUS" },
      select: { id: true },
    });
    if (existing) return { already_granted: true, balance: user.wallet.spendingBalance };
  }

  // One free grant per real inbox: withhold if any *other* account sharing
  // this canonical email already collected a bonus.
  if (user.canonicalEmail) {
    const dupe = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        canonicalEmail: user.canonicalEmail,
        wallet: { transactions: { some: { type: "SIGNUP_BONUS" } } },
      },
      select: { id: true },
    });
    if (dupe) return { withheld: "duplicate_inbox" };
  }

  // Soft per-IP velocity backstop. Skipped when the IP is unknown (older
  // accounts) — we never withhold on a signal we don't have.
  if (user.signupIp) {
    const rl = await checkRateLimit(`signup-bonus-ip:${user.signupIp}`, {
      limit: SIGNUP_BONUS_MAX_PER_IP,
      windowMs: SIGNUP_BONUS_IP_WINDOW_MS,
    });
    if (!rl.allowed) return { withheld: "ip_velocity" };
  }

  return grantSignupBonus(userId);
}
