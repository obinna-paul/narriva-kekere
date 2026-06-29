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

/**
 * Called after a successful story unlock. If this was the reader's first
 * ever unlock and they were referred by someone, credits the referrer's 3
 * cowries, flips the Referral to REWARDED, and emails the referrer. No-op
 * for every later unlock (status is no longer PENDING) and for unreferred
 * readers.
 */
export async function triggerReferralRewardOnFirstUnlock(userId: string): Promise<void> {
  const unlockCount = await prisma.storyUnlock.count({ where: { userId } });
  if (unlockCount !== 1) return;

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
    subject: "Someone you invited just unlocked their first story",
    body: `You earned ${result.reward} cowries because ${referredUser?.name ?? "someone"} joined Kekere using your referral link and just unlocked their first story. Your spending balance has been updated.`,
  });

  await createNotification({
    userId: result.referrerId,
    type: "REFERRAL_REWARD_EARNED",
    title: "Referral reward earned",
    body: "Someone you invited just unlocked their first story. You've earned 3 cowries.",
    link: "/kekere/wallet",
  });
}
