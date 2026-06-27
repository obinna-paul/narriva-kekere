import { Check } from "lucide-react";
import type { NarrivaSubmissionStage } from "@prisma/client";

const STAGES: { value: NarrivaSubmissionStage; label: string }[] = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "EDITORIAL", label: "Editorial" },
  { value: "DESIGN", label: "Design" },
  { value: "PRODUCTION", label: "Production" },
  { value: "LAUNCHED", label: "Launched" },
];

export interface SubmissionStageTrackerProps {
  currentStage: NarrivaSubmissionStage;
}

/** Post-acceptance timeline — shown once a submission's status is ACCEPTED.
 * A connecting line fills in blue up to the current stage; circles show a
 * checkmark for completed stages, the stage number for the current/upcoming
 * ones. */
export function SubmissionStageTracker({ currentStage }: SubmissionStageTrackerProps) {
  const currentIndex = STAGES.findIndex((s) => s.value === currentStage);
  const fillPct = (currentIndex / (STAGES.length - 1)) * 84; // line spans the inner 84% (8%–92%)

  return (
    <div className="relative mb-2">
      <div className="absolute left-[8%] right-[8%] top-[13px] h-0.5 bg-[var(--color-ink)]/10" />
      <div
        className="absolute left-[8%] top-[13px] h-0.5 bg-[var(--color-primary)]"
        style={{ width: `${fillPct}%` }}
      />
      <ol className="relative grid grid-cols-5">
        {STAGES.map((stage, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isUpcoming = i > currentIndex;

          return (
            <li key={stage.value} className="text-center">
              <span
                aria-hidden="true"
                className="mx-auto mb-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold"
                style={{
                  backgroundColor: isComplete || isCurrent ? "var(--color-bg)" : "var(--color-bg)",
                  borderColor: isUpcoming ? "rgba(22,22,22,0.12)" : "var(--color-primary)",
                  color: isComplete ? "var(--color-bg)" : isCurrent ? "var(--color-primary)" : "var(--color-muted-3)",
                  background: isComplete ? "var(--color-primary)" : "var(--color-bg)",
                }}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className="text-[13.5px] font-semibold"
                style={{ color: isUpcoming ? "var(--color-muted-3)" : "var(--color-ink)" }}
              >
                {stage.label}
                {isCurrent && <span className="sr-only"> (current stage)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
