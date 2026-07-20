export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUsersAtRiskOfBreakingStreak } from "@/lib/data/kekere-streaks";
import { getEmailRecipient } from "@/lib/notifications/email-preferences";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/send";
import { renderStreakReminderEmail } from "@/lib/email/templates";

/**
 * Daily "your streak breaks tonight" nudge — meant to run once, late in the
 * UTC day (see vercel.json), for readers who read yesterday but not yet
 * today. lastStreakReminderSentAt guards against a double-send if the cron
 * fires twice in the same day; getEmailRecipient skips anyone who's opted
 * out of these emails. Mirrors the existing expire-contracts/
 * reconcile-referrals cron routes: GET, Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const atRisk = await getUsersAtRiskOfBreakingStreak();
  if (atRisk.length === 0) {
    return NextResponse.json({ reminded: 0, atRisk: 0 });
  }

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const users = await prisma.user.findMany({
    where: { id: { in: atRisk.map((a) => a.userId) } },
    select: { id: true, lastStreakReminderSentAt: true },
  });
  const notYetRemindedToday = new Set(
    users.filter((u) => !u.lastStreakReminderSentAt || u.lastStreakReminderSentAt < todayStart).map((u) => u.id),
  );

  let reminded = 0;
  await Promise.allSettled(
    atRisk
      .filter((a) => notYetRemindedToday.has(a.userId))
      .map(async ({ userId, currentStreak }) => {
        const recipient = await getEmailRecipient(userId);
        if (!recipient) return;

        const html = await renderStreakReminderEmail({
          name: recipient.name,
          currentStreak,
          unsubscribeUrl: recipient.unsubscribeUrl,
        });
        await sendEmail({
          to: recipient.email,
          subject: `Your ${currentStreak}-day streak breaks tonight`,
          body: `You're on a ${currentStreak}-day reading streak, but you haven't read anything today yet. Finish one story before midnight UTC to keep it alive.`,
          html,
        });
        await createNotification({
          userId,
          type: "STREAK_AT_RISK",
          title: "Your streak is about to break",
          body: `You're on a ${currentStreak}-day streak — read something today to keep it going.`,
          link: "/kekere/feed",
        });
        await prisma.user.update({ where: { id: userId }, data: { lastStreakReminderSentAt: now } });
        reminded++;
      }),
  );

  return NextResponse.json({ reminded, atRisk: atRisk.length });
}
