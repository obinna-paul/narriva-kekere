import { SubmissionStageTracker } from "@/components/narriva/submission-stage-tracker";
import { CommunicationLog } from "@/components/narriva/communication-log";
import type { NarrivaSubmissionStage, SubmissionUpdate } from "@prisma/client";

const STAGE_LABEL: Record<NarrivaSubmissionStage, string> = {
  SUBMITTED: "Submitted",
  EDITORIAL: "Editorial",
  DESIGN: "Design",
  PRODUCTION: "Production",
  LAUNCHED: "Launched",
};

export interface AcceptedSubmissionCardProps {
  title: string;
  currentStage: NarrivaSubmissionStage;
  /** The most recent reviewer note, shown as the "what's happening now"
   * line — the schema has one note field shared across the submission's
   * life, not a separate one per stage. */
  reviewerNotes: string | null;
  updates: readonly SubmissionUpdate[];
}

export function AcceptedSubmissionCard({
  title,
  currentStage,
  reviewerNotes,
  updates,
}: AcceptedSubmissionCardProps) {
  return (
    <div>
      <div className="rounded-lg border border-[var(--color-ink)]/10 bg-white px-[38px] py-9">
        <div className="mb-[34px] flex flex-wrap items-center gap-3.5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
            {title}
          </h2>
          <span className="rounded-full bg-[var(--color-primary)]/[0.08] px-3 py-[5px] text-xs font-semibold text-[var(--color-primary)]">
            In production
          </span>
        </div>

        <SubmissionStageTracker currentStage={currentStage} />

        <div className="mt-7 rounded-md bg-[var(--color-bg-alt)] px-6 py-5">
          <div className="mb-1.5 text-[13px] font-semibold text-[var(--color-primary)]">
            Now: {STAGE_LABEL[currentStage]}
          </div>
          <p className="text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
            {reviewerNotes ?? `Your book is in the ${STAGE_LABEL[currentStage].toLowerCase()} stage — we'll update you here as it moves.`}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <CommunicationLog updates={updates} />
      </div>
    </div>
  );
}
