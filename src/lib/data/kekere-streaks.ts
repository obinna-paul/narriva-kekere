import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/notifications/create";
import { milestoneAt, type StreakMilestone } from "@/lib/streak-milestones";

function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function computeCurrentStreakTx(
  tx: Prisma.TransactionClient,
  userId: string,
  today: Date,
): Promise<number> {
  const rows = await tx.readingActivity.findMany({
    where: { userId },
    select: { date: true },
  });
  const activeDates = new Set(rows.map((r) => isoDate(r.date)));

  // today is guaranteed active here — the caller only reaches this after
  // inserting (or confirming) today's row — so no "step back a day" branch
  // is needed the way getStreakStats needs one.
  let currentStreak = 0;
  let cursor = today;
  while (activeDates.has(isoDate(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  return currentStreak;
}

/**
 * Marks today (UTC) as a reading-activity day for this user, and — if that
 * newly-completed day lands exactly on a streak milestone — credits the
 * cowrie reward and notifies them. Idempotent (a second call the same day
 * is a no-op) and never throws: this is a best-effort bonus layered on top
 * of a story completion, not part of that completion's critical path, so a
 * failure here must never break the caller. Called only from the story
 * "complete" route, and only for a first-ever completion of a given story —
 * so the streak reflects finishing unique stories, not scrolling or
 * re-reading (see that route for the gating).
 */
export async function recordReadingActivity(userId: string): Promise<void> {
  try {
    const today = toUtcDateOnly(new Date());

    const rewarded = await prisma.$transaction(async (tx) => {
      const existing = await tx.readingActivity.findUnique({
        where: { userId_date: { userId, date: today } },
      });
      if (existing) return null; // already recorded today — no new day, no new milestone possible

      await tx.readingActivity.create({ data: { userId, date: today } });

      const streak = await computeCurrentStreakTx(tx, userId, today);
      const milestone = milestoneAt(streak);
      if (!milestone) return null;

      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId, spendingBalance: milestone.reward },
        update: { spendingBalance: { increment: milestone.reward } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "READ_REWARD",
          amountCowries: milestone.reward,
          walletField: "SPENDING",
          description: `${milestone.days}-day reading streak reward`,
          status: "COMPLETED",
        },
      });

      return milestone;
    });

    if (rewarded) {
      await notifyStreakReward(userId, rewarded);
    }
  } catch (error) {
    console.error("[kekere-streaks] recordReadingActivity failed:", error);
  }
}

async function notifyStreakReward(userId: string, milestone: StreakMilestone): Promise<void> {
  await createNotification({
    userId,
    type: "STREAK_MILESTONE_REACHED",
    title: `${milestone.days}-day streak!`,
    body: `You've read ${milestone.days} days in a row. ${milestone.reward} cowries have been added to your wallet.`,
    link: "/kekere/wallet",
  });
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  hasAnyActivity: boolean;
  /** Whether today already counts toward the streak — drives the
   * "read today to keep it alive" vs. milestone-progress caption. */
  activeToday: boolean;
}

export async function getStreakStats(userId: string): Promise<StreakStats> {
  const rows = await prisma.readingActivity.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  if (rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, hasAnyActivity: false, activeToday: false };
  }

  const activeDates = new Set(rows.map((r) => isoDate(r.date)));
  const today = toUtcDateOnly(new Date());
  const earliest = toUtcDateOnly(rows[0].date);

  // Single backward/forward walk over the account's whole activity window —
  // bounded by account lifetime in days (a few thousand at most), so this
  // stays cheap without needing SQL window functions.
  let longestStreak = 0;
  let running = 0;
  for (let d = earliest; d <= today; d = addDays(d, 1)) {
    if (activeDates.has(isoDate(d))) {
      running++;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  // Current streak: today not yet being active doesn't break it (the day
  // isn't over), but yesterday missing does — same convention as Duolingo/
  // GitHub-style streaks, so passing midnight doesn't punish someone who
  // just hasn't read yet today.
  const activeToday = activeDates.has(isoDate(today));
  let currentStreak = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (activeDates.has(isoDate(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  return { currentStreak, longestStreak, hasAnyActivity: true, activeToday };
}

export interface AtRiskReader {
  userId: string;
  currentStreak: number;
}

/**
 * Readers whose streak breaks if they don't read again before UTC
 * midnight — active yesterday, not yet active today. This is a targeted
 * two-query lookup (bounded by yesterday's + today's daily-active-reader
 * counts) rather than scanning the whole ReadingActivity table or calling
 * getStreakStats for every user, since only readers active yesterday can
 * possibly be "at risk" today. currentStreak is then computed via
 * getStreakStats only for that small at-risk subset, to show a real number
 * in the reminder.
 *
 * UTC-boundary caveat: there's no per-user timezone on the User model, so
 * "today"/"yesterday" here are UTC days, same as the rest of this file —
 * calling this once daily in the late-UTC hours (see the cron schedule) is
 * the closest approximation to "tonight" until per-user timezones exist.
 */
export async function getUsersAtRiskOfBreakingStreak(): Promise<AtRiskReader[]> {
  const today = toUtcDateOnly(new Date());
  const yesterday = addDays(today, -1);

  const [activeYesterday, activeTodayRows] = await Promise.all([
    prisma.readingActivity.findMany({ where: { date: yesterday }, select: { userId: true } }),
    prisma.readingActivity.findMany({ where: { date: today }, select: { userId: true } }),
  ]);

  const activeTodaySet = new Set(activeTodayRows.map((r) => r.userId));
  const atRiskIds = activeYesterday.map((r) => r.userId).filter((id) => !activeTodaySet.has(id));
  if (atRiskIds.length === 0) return [];

  const stats = await Promise.all(atRiskIds.map(async (userId) => ({ userId, stats: await getStreakStats(userId) })));
  return stats
    .filter((s) => s.stats.currentStreak > 0)
    .map((s) => ({ userId: s.userId, currentStreak: s.stats.currentStreak }));
}
