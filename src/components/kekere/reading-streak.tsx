import { Flame } from "lucide-react";
import type { HeatmapDay } from "@/lib/data/kekere-streaks";

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

export interface ReadingStreakProps {
  currentStreak: number;
  longestStreak: number;
  hasAnyActivity: boolean;
  heatmapWeeks: readonly HeatmapDay[][];
}

function cellClass(day: HeatmapDay): string {
  if (day.isFuture) return "bg-transparent";
  if (day.active) return "bg-[var(--color-primary)]";
  return "bg-[rgba(42,26,18,0.08)]";
}

export function ReadingStreak({
  currentStreak,
  longestStreak,
  hasAnyActivity,
  heatmapWeeks,
}: ReadingStreakProps) {
  return (
    <div className="mx-[22px] mb-6 rounded-[16px] border border-[rgba(42,26,18,0.08)] bg-white px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full"
            style={{ background: currentStreak > 0 ? "rgba(199,93,44,0.12)" : "rgba(42,26,18,0.06)" }}
          >
            <Flame
              size={19}
              className={currentStreak > 0 ? "text-[var(--color-primary)]" : "text-[var(--color-ink-muted-3)]"}
              fill={currentStreak > 0 ? "var(--color-primary)" : "none"}
            />
          </div>
          <div>
            {hasAnyActivity ? (
              <>
                <div className="font-[family-name:var(--font-display)] text-[20px] font-semibold leading-tight text-[var(--color-ink)]">
                  {currentStreak} day{currentStreak === 1 ? "" : "s"}
                </div>
                <div className="text-[12px] text-[var(--color-ink-muted-2)]">
                  {currentStreak > 0 ? "Current streak" : "Streak broken — start a new one today"}
                </div>
              </>
            ) : (
              <>
                <div className="font-[family-name:var(--font-display)] text-[16px] font-semibold leading-tight text-[var(--color-ink)]">
                  Start a reading streak
                </div>
                <div className="text-[12px] text-[var(--color-ink-muted-2)]">
                  Read something today to begin
                </div>
              </>
            )}
          </div>
        </div>
        {hasAnyActivity && longestStreak > currentStreak && (
          <div className="text-right">
            <div className="text-[15px] font-semibold text-[var(--color-ink-muted)]">{longestStreak}</div>
            <div className="text-[11px] text-[var(--color-ink-muted-3)]">Longest</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-[3px]">
        <div className="flex flex-none flex-col justify-between gap-[3px] pr-1.5 pb-[1px]">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[15px] text-[9px] leading-[15px] text-[var(--color-ink-muted-3)]">
              {label}
            </div>
          ))}
        </div>
        <div className="flex flex-1 gap-[3px]">
          {heatmapWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={day.isFuture ? undefined : day.date}
                  className={`aspect-square w-full rounded-[3px] ${cellClass(day)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
