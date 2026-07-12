import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderReferralRewardEmail } from "@/lib/email/templates";
import { creditReferralReward } from "@/lib/economy/cowries";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_GENERAL_FROM } from "@/lib/constants";

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

  const existing = await prisma.referral.findUnique({ where: { referredUserId } });
  if (existing) return; // a user can only ever be referred once — keep the first attribution

  const [, referredUser] = await Promise.all([
    prisma.referral.create({
      data: {
        referrerId: ownerCode.userId,
        referredUserId,
        codeUsed: trimmed,
        status: "PENDING",
      },
    }),
    prisma.user.findUnique({ where: { id: referredUserId }, select: { name: true } }),
  ]);

  await createNotification({
    userId: ownerCode.userId,
    type: "REFERRAL_JOINED",
    title: "Someone joined using your invite",
    body: `${referredUser?.name ?? "Someone"} signed up with your Kekere link. You'll earn 3 cowries once they buy their first cowries.`,
    link: "/kekere/invite",
  });
}

const MIN_QUALIFYING_NGN = 500;

/**
 * Pays a referrer their reward for one PENDING referral and notifies them.
 * Idempotent: creditReferralReward atomically flips PENDING → REWARDED and
 * only moves money on the call that wins that flip, so this is safe to call
 * from every code path (fast-path verify, webhook, and the reconcile sweep)
 * without ever double-paying. Returns true only on the call that actually
 * paid. Notification/email failures never undo a paid reward.
 */
async function payReferralReward(referralId: string, referredUserId: string): Promise<boolean> {
  const result = await creditReferralReward(referralId);
  if (!("success" in result)) return false;

  const [referrer, referredUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: result.referrerId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: referredUserId }, select: { name: true } }),
  ]);

  if (referrer) {
    const inviteeName = referredUser?.name ?? "Someone";
    const html = await renderReferralRewardEmail({
      referrerName: referrer.name,
      reward: result.reward,
      inviteeName,
    }).catch(() => undefined);
    await sendEmail({
      to: referrer.email,
      subject: "Someone you invited just bought cowries",
      body: `You earned ${result.reward} cowries! ${inviteeName} joined Kekere with your referral link and just bought cowries for the first time. Your balance has been updated.`,
      from: KEKERE_GENERAL_FROM,
      html,
    }).catch(() => {});
  }

  await createNotification({
    userId: result.referrerId,
    type: "REFERRAL_REWARD_EARNED",
    title: "Referral reward earned",
    body: `Someone you invited just bought cowries. You've earned ${result.reward} cowries!`,
    link: "/kekere/wallet",
  }).catch(() => {});

  return true;
}

/**
 * Called after a referred user's cowrie top-up. Pays the referrer's reward if
 * the invitee has actually topped up and the referral is still PENDING.
 *
 * IMPORTANT: callers must `await` this. It used to only fire on the *first*
 * top-up (topUpCount === 1); combined with the callers firing it
 * fire-and-forget and only when creditTopUp returned a fresh "success", a
 * dropped serverless promise meant the reward was never paid and never
 * retried. Now it fires whenever the invitee has any completed top-up and the
 * referral is still pending, so a later top-up (or the webhook re-running)
 * self-heals a missed reward. Idempotent via payReferralReward.
 */
export async function triggerReferralRewardOnFirstTopUp(
  userId: string,
  paidNGN: number,
): Promise<void> {
  if (paidNGN < MIN_QUALIFYING_NGN) return;

  const topUpCount = await prisma.transaction.count({
    where: { wallet: { userId }, type: "TOP_UP", status: "COMPLETED" },
  });
  if (topUpCount < 1) return; // must have an on-record top-up

  const referral = await prisma.referral.findFirst({
    where: { referredUserId: userId, status: "PENDING" },
  });
  if (!referral) return;

  await payReferralReward(referral.id, userId);
}

/**
 * Recovery sweep: pays every PENDING referral whose invitee has already made
 * a qualifying top-up but whose reward was missed (e.g. dropped by the old
 * un-awaited call, or credited by the webhook while the reward step was
 * skipped). Idempotent and safe to run any number of times.
 */
export async function reconcilePendingReferralRewards(): Promise<{ checked: number; rewarded: number }> {
  const pending = await prisma.referral.findMany({
    where: { status: "PENDING" },
    select: { id: true, referredUserId: true },
  });

  let rewarded = 0;
  for (const referral of pending) {
    const topUps = await prisma.transaction.count({
      where: { wallet: { userId: referral.referredUserId }, type: "TOP_UP", status: "COMPLETED" },
    });
    if (topUps < 1) continue; // invitee hasn't paid yet — legitimately still pending

    const paid = await payReferralReward(referral.id, referral.referredUserId);
    if (paid) rewarded++;
  }

  return { checked: pending.length, rewarded };
}
