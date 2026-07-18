/**
 * Pure streak-milestone math — no DB, no server-only imports. Shared by the
 * server-side reward-crediting logic (kekere-streaks.ts) and the client-side
 * StreakCard, so the two can never disagree on what a given streak length
 * means.
 *
 * Achievable quickly (7 days), then a real stretch (30), then a genuine
 * commitment (60) — each milestone strictly harder than the last. Past 60,
 * the same reward repeats every LOOP_DAYS so a long-running streak always
 * has something ahead of it instead of topping out.
 */

export interface StreakMilestone {
  days: number;
  reward: number;
}

const FIXED_MILESTONES: readonly StreakMilestone[] = [
  { days: 7, reward: 1 },
  { days: 30, reward: 3 },
  { days: 60, reward: 7 },
];

const LOOP_DAYS = 60;
const LOOP_REWARD = 7;

/** The milestone this exact streak length lands on, if any — the trigger for crediting a reward. */
export function milestoneAt(streak: number): StreakMilestone | null {
  const fixed = FIXED_MILESTONES.find((m) => m.days === streak);
  if (fixed) return fixed;
  return streak > LOOP_DAYS && streak % LOOP_DAYS === 0 ? { days: streak, reward: LOOP_REWARD } : null;
}

/** The next milestone strictly ahead of this streak length. */
export function nextStreakMilestone(streak: number): StreakMilestone {
  for (const m of FIXED_MILESTONES) {
    if (streak < m.days) return m;
  }
  return { days: LOOP_DAYS * (Math.floor(streak / LOOP_DAYS) + 1), reward: LOOP_REWARD };
}

function prevStreakMilestoneDays(streak: number): number {
  let prev = 0;
  for (const m of FIXED_MILESTONES) {
    if (m.days > streak) break;
    prev = m.days;
  }
  if (streak >= LOOP_DAYS) prev = Math.max(prev, LOOP_DAYS * Math.floor(streak / LOOP_DAYS));
  return prev;
}

/** Progress (0–1) from the last-cleared milestone toward the next one — drives the progress bar. */
export function streakMilestoneProgress(streak: number): { next: StreakMilestone; fraction: number } {
  const next = nextStreakMilestone(streak);
  const prev = prevStreakMilestoneDays(streak);
  const fraction = Math.max(0, Math.min(1, (streak - prev) / (next.days - prev)));
  return { next, fraction };
}
