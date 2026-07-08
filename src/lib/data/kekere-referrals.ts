import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { creditReferralReward } from "@/lib/economy/cowries";
import { createNotification } from "@/lib/notifications/create";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/**
 * Creates this user's ReferralCode row, retrying on the rare collision
 * against the unique `code` column.
 */
export async function ensureReferralCodeForUser(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    try {
      const row = await prisma.referralCode.create({ data: { userId, code } });
      return row.code;
    } catch (error) {
      const isCollision =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002";
      if (!isCollision) throw error;
      // Code collision — loop and try a fresh random code.
    }
  }
  throw new Error("Could not generate a unique referral code after 10 attempts");
}

/**
 * Looks up this user's referral code, creating one if they signed up before
 * the referral system existed (or otherwise never got one) — without this,
 * the code/share link silently disappears for any pre-existing account.
 */
export async function getOrCreateReferralCodeForUser(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } });
  if (existing) return existing.code;
  return ensureReferralCodeForUser(userId);
}

/**
 * Looks up a referral code and, unless it's invalid or self-referral,
 * creates a PENDING Referral linking the code owner to the new user. Never
 * throws on an invalid/self code — referral attribution is best-effort and
 * must never block registration.
 */
export async function recordReferralFromCode(code: string, referredUserId: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) return;

  const ownerCode = await prisma.referralCode.findUnique({
    where: { code: trimmed },
    select: { userId: true },
  });
  if (!ownerCode) return;
  if (ownerCode.userId === referredUserId) return; // cannot refer yourself

  await prisma.referral.upsert({
    where: { referredUserId },
    create: {
      referrerId: ownerCode.userId,
      referredUserId,
      codeUsed: trimmed,
      status: "PENDING",
    },
    update: {}, // a user can only ever be referred once — keep the first attribution
  });
}

const MIN_QUALIFYING_NGN = 500;

/**
 * Called after every successful cowrie top-up. If this was the referred
 * user's first-ever top-up of ≥ 500 NGN, credits the referrer 3 cowries,
 * flips Referral → REWARDED, and notifies the referrer.
 */
export async function triggerReferralRewardOnFirstTopUp(
  userId: string,
  paidNGN: number,
): Promise<void> {
  if (paidNGN < MIN_QUALIFYING_NGN) return;

  const topUpCount = await prisma.transaction.count({
    where: { wallet: { userId }, type: "TOP_UP", status: "COMPLETED" },
  });
  if (topUpCount !== 1) return; // only reward the very first top-up

  const referral = await prisma.referral.findFirst({
    where: { referredUserId: userId, status: "PENDING" },
  });
  if (!referral) return;

  const result = await creditReferralReward(referral.id);
  if (!("success" in result)) return;

  const [referrer, referredUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: result.referrerId }, select: { email: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  if (!referrer) return;

  await sendEmail({
    to: referrer.email,
    subject: "Someone you invited just bought cowries",
    body: `You earned ${result.reward} cowries! ${referredUser?.name ?? "Someone"} joined Kekere with your referral link and just bought cowries for the first time. Your balance has been updated.`,
  });

  await createNotification({
    userId: result.referrerId,
    type: "REFERRAL_REWARD_EARNED",
    title: "Referral reward earned",
    body: `Someone you invited just bought cowries. You've earned ${result.reward} cowries!`,
    link: "/kekere/wallet",
  });
}
