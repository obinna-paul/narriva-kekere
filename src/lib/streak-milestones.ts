/**
 * Pure streak-milestone math — no DB, no server-only imports. Shared by the
 * server-side reward-crediting logic (kekere-streaks.ts) and the client-side
 * StreakCard, so the two can never disagree on what a given streak length
 * means.
 *
 * The 7/30/60-day pattern (1/3/7 cowries) is a repeating CYCLE_DAYS-day
 * cycle, not a one-time ramp: day 60 is followed by day 67 paying the same
 * 1-cowrie reward as day 7 did, day 90 pays like day 30, day 120 pays like
 * day 60 — and so on forever. A long-running streak always has a next goal,
 * but never grows into an ever-larger payout.
 */

export interface StreakMilestone {
  days: number;
  reward: number;
}

/** Offsets within a single cycle, smallest first. */
const OFFSETS: readonly StreakMilestone[] = [
  { days: 7, reward: 1 },
  { days: 30, reward: 3 },
  { days: 60, reward: 7 },
];

const CYCLE_DAYS = 60;

function cycleMilestones(cycle: number): StreakMilestone[] {
  if (cycle < 0) return [];
  return OFFSETS.map((m) => ({ days: cycle * CYCLE_DAYS + m.days, reward: m.reward }));
}

/** The handful of milestones on either side of this streak length — enough
 * to safely find both the previous and next one regardless of where streak
 * falls relative to a cycle boundary. */
function nearbyMilestones(streak: number): StreakMilestone[] {
  const cycle = Math.floor(streak / CYCLE_DAYS);
  return [...cycleMilestones(cycle - 1), ...cycleMilestones(cycle), ...cycleMilestones(cycle + 1)];
}

/** The milestone this exact streak length lands on, if any — the trigger for crediting a reward. */
export function milestoneAt(streak: number): StreakMilestone | null {
  if (streak <= 0) return null;
  return nearbyMilestones(streak).find((m) => m.days === streak) ?? null;
}

/** The next milestone strictly ahead of this streak length. */
export function nextStreakMilestone(streak: number): StreakMilestone {
  const ahead = nearbyMilestones(streak)
    .filter((m) => m.days > streak)
    .sort((a, b) => a.days - b.days);
  return ahead[0];
}

function prevStreakMilestoneDays(streak: number): number {
  const behind = nearbyMilestones(streak)
    .filter((m) => m.days <= streak)
    .sort((a, b) => b.days - a.days);
  return behind[0]?.days ?? 0;
}

/** Progress (0–1) from the last-cleared milestone toward the next one — drives the progress bar. */
export function streakMilestoneProgress(streak: number): { next: StreakMilestone; fraction: number } {
  const next = nextStreakMilestone(streak);
  const prev = prevStreakMilestoneDays(streak);
  const fraction = Math.max(0, Math.min(1, (streak - prev) / (next.days - prev)));
  return { next, fraction };
}
