import { prisma } from "@/lib/db/prisma";

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

/** Marks today (UTC) as a reading-activity day for this user. Idempotent —
 * safe to call on every reading-progress save without extra guarding. */
export async function recordReadingActivity(userId: string): Promise<void> {
  const today = toUtcDateOnly(new Date());
  await prisma.readingActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today },
    update: {},
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
