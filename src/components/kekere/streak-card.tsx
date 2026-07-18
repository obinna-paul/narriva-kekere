import { Flame } from "lucide-react";
import { milestoneAt, streakMilestoneProgress } from "@/lib/streak-milestones";

export interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  hasAnyActivity: boolean;
  activeToday: boolean;
}

export function StreakCard({ currentStreak, longestStreak, hasAnyActivity, activeToday }: StreakCardProps) {
  const { next, fraction } = streakMilestoneProgress(currentStreak);
  const lit = currentStreak > 0;
  const justEarned = activeToday ? milestoneAt(currentStreak) : null;

  let caption: string;
  let captionIsCelebration = false;
  if (currentStreak === 0) {
    caption = hasAnyActivity ? "Read today to start a new streak" : "Finish a story to start your streak";
  } else if (!activeToday) {
    caption = "Read today to keep it alive";
  } else if (justEarned) {
    caption = `You just earned ${justEarned.reward} cowrie${justEarned.reward === 1 ? "" : "s"}! 🎉`;
    captionIsCelebration = true;
  } else {
    const remaining = next.days - currentStreak;
    caption = `${remaining} day${remaining === 1 ? "" : "s"} to earn ${next.reward} cowries`;
  }

  return (
    <div
      className="mb-6 rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-[16px]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Flame
            size={26}
            style={{ color: lit ? "var(--color-primary)" : "var(--color-ink-muted-3)", opacity: lit && !activeToday ? 0.55 : 1 }}
            fill={lit && activeToday ? "currentColor" : "none"}
            strokeWidth={lit ? 2 : 1.75}
          />
          <div className="flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-display)] text-[26px] font-semibold leading-none text-[var(--color-ink)]">
              {currentStreak}
            </span>
            <span className="text-[13px] font-medium text-[var(--color-ink-muted-2)]">
              day{currentStreak === 1 ? "" : "s"} streak
            </span>
          </div>
        </div>
        {longestStreak > 0 && (
          <span className="whitespace-nowrap rounded-full bg-[var(--color-primary-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary-light)]">
            Best {longestStreak}
          </span>
        )}
      </div>

      <div className="mt-3 h-[6px] w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      <p
        className="mt-2 text-[12px]"
        style={{ color: captionIsCelebration ? "var(--color-success)" : "var(--color-ink-muted-2)", fontWeight: captionIsCelebration ? 600 : 400 }}
      >
        {caption}
      </p>
    </div>
  );
}
