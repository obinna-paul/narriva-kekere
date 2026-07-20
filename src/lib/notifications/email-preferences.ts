import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { SITE_URL } from "@/content/decisions";

export interface EmailRecipient {
  email: string;
  name: string;
  unsubscribeUrl: string;
}

/**
 * Resolves a user into an emailable recipient for the opt-in retention
 * notifications (writer-published, note reply, streak-at-risk, weekly
 * digest) — returns null if they've turned emails off, so every call site
 * can `if (!recipient) return;` instead of re-checking the flag itself.
 * Mandatory transactional mail (OTP, password reset, contracts,
 * withdrawals) doesn't go through this gate at all.
 *
 * unsubscribeToken is minted lazily on first use rather than backfilled for
 * every existing row — most users will never need one until their first
 * qualifying email goes out.
 */
export async function getEmailRecipient(userId: string): Promise<EmailRecipient | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailNotificationsEnabled: true, unsubscribeToken: true },
  });
  if (!user || !user.emailNotificationsEnabled) return null;

  let token = user.unsubscribeToken;
  if (!token) {
    token = randomBytes(24).toString("hex");
    await prisma.user.update({ where: { id: userId }, data: { unsubscribeToken: token } });
  }

  return { email: user.email, name: user.name, unsubscribeUrl: `${SITE_URL}/kekere/unsubscribe/${token}` };
}

/**
 * Batched variant of getEmailRecipient for fan-out sends (e.g. every
 * follower of a writer who just published) — one findMany instead of one
 * query per user. Only users who are opted in end up in the returned map;
 * a userId with no entry means "don't email them." Token-minting still
 * costs one update per user who's missing one, but that's a one-time cost
 * per user rather than one on every send.
 */
export async function getEmailRecipientsBatch(userIds: string[]): Promise<Map<string, EmailRecipient>> {
  if (userIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, emailNotificationsEnabled: true },
    select: { id: true, email: true, name: true, unsubscribeToken: true },
  });

  const result = new Map<string, EmailRecipient>();
  for (const user of users) {
    let token = user.unsubscribeToken;
    if (!token) {
      token = randomBytes(24).toString("hex");
      await prisma.user.update({ where: { id: user.id }, data: { unsubscribeToken: token } });
    }
    result.set(user.id, { email: user.email, name: user.name, unsubscribeUrl: `${SITE_URL}/kekere/unsubscribe/${token}` });
  }
  return result;
}

/** Flips emailNotificationsEnabled off for whoever owns this token — used by
 *  the public one-click unsubscribe page. Returns false for an unknown
 *  token so the page can show a generic "link not valid" state without
 *  leaking whether any particular token ever existed. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { unsubscribeToken: token },
    data: { emailNotificationsEnabled: false },
  });
  return result.count > 0;
}
