import { prisma } from "@/lib/db/prisma";

// ~12 weeks fits a mobile profile width well as a compact heatmap (denser
// than that starts feeling cramped on a phone; sparser loses the "graph"
// feel) — deliberately shorter than GitHub's full-year view for that reason.
const HEATMAP_WEEKS = 12;

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

export interface HeatmapDay {
  date: string; // "YYYY-MM-DD"
  active: boolean;
  /** Cells after today, used to pad the current (incomplete) week — render
   * as blank space, not as an "inactive" day. */
  isFuture: boolean;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  hasAnyActivity: boolean;
  /** Monday-aligned weeks, oldest first; each week is 7 days, Monday first. */
  heatmapWeeks: HeatmapDay[][];
}

export async function getStreakStats(userId: string): Promise<StreakStats> {
  const rows = await prisma.readingActivity.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  if (rows.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      hasAnyActivity: false,
      heatmapWeeks: buildHeatmapWeeks(new Set()),
    };
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
  let currentStreak = 0;
  let cursor = today;
  if (!activeDates.has(isoDate(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (activeDates.has(isoDate(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  return {
    currentStreak,
    longestStreak,
    hasAnyActivity: true,
    heatmapWeeks: buildHeatmapWeeks(activeDates),
  };
}

function buildHeatmapWeeks(activeDates: Set<string>): HeatmapDay[][] {
  const today = toUtcDateOnly(new Date());
  const rangeStart = addDays(today, -(HEATMAP_WEEKS * 7 - 1));
  // Align to the Monday on/before rangeStart so every week column is a full
  // Mon–Sun, matching the day-of-week row labels in the UI.
  const mondayOffset = (rangeStart.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  const alignedStart = addDays(rangeStart, -mondayOffset);

  const totalDays = Math.round((today.getTime() - alignedStart.getTime()) / 86_400_000) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  const weeks: HeatmapDay[][] = [];
  let cursor = alignedStart;
  for (let w = 0; w < totalWeeks; w++) {
    const week: HeatmapDay[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = isoDate(cursor);
      week.push({
        date: iso,
        active: activeDates.has(iso),
        isFuture: cursor > today,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}
