import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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

/** Post-acceptance timeline — shown once a submission's status is ACCEPTED. */
export function SubmissionStageTracker({ currentStage }: SubmissionStageTrackerProps) {
  const currentIndex = STAGES.findIndex((s) => s.value === currentStage);

  return (
    <ol className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      {STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <li key={stage.value} className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center">
            <span
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-medium",
                isComplete && "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-bg)]",
                isCurrent && "border-[var(--color-primary)] text-[var(--color-primary)]",
                !isComplete && !isCurrent && "border-[var(--color-ink)]/20 text-[var(--color-ink)]/40"
              )}
            >
              {isComplete ? <Check className="h-5 w-5" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                isCurrent ? "text-[var(--color-primary)]" : "text-[var(--color-ink)]/70"
              )}
            >
              {stage.label}
              {isCurrent && <span className="sr-only"> (current stage)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
