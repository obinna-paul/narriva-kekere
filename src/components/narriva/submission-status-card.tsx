import type { NarrivaSubmission, NarrivaSubmissionStatus } from "@prisma/client";

interface StatusTreatment {
  label: string;
  color: string;
  bg: string;
  /** How many of the 3 stage dots are filled in — Received → Reading →
   * Assessed is the pre-acceptance pipeline this tracks. */
  activeDots: number;
}

const STATUS_TREATMENT: Record<NarrivaSubmissionStatus, StatusTreatment> = {
  RECEIVED: { label: "Received", color: "var(--color-muted-2)", bg: "rgba(22,22,22,0.05)", activeDots: 1 },
  READING: { label: "Being read", color: "var(--color-accent-text)", bg: "rgba(176,141,87,0.14)", activeDots: 2 },
  REVIEWED: { label: "Assessment ready", color: "var(--color-success)", bg: "rgba(31,111,74,0.1)", activeDots: 3 },
  // Per the editing-services positioning: a manuscript that doesn't move to
  // production isn't rejected, it's redirected — so this reads closer to
  // READING's "still with us" tone than a hard stop.
  DECLINED: { label: "Editing services", color: "var(--color-accent-text)", bg: "rgba(176,141,87,0.14)", activeDots: 3 },
  ACCEPTED: { label: "Accepted", color: "var(--color-success)", bg: "rgba(31,111,74,0.1)", activeDots: 3 },
};

const DEFAULT_NOTE: Record<NarrivaSubmissionStatus, string> = {
  RECEIVED: "We've received your manuscript and it's in the queue.",
  READING: "Your manuscript is with an editor now. We'll come back to you within six to eight weeks of submission with an assessment and a proposed plan.",
  REVIEWED: "We've read it and put together an assessment and a proposed plan. Check your email for the details.",
  DECLINED: "This manuscript isn't headed straight to production, but that's not the end of the road — check your email for how our editing services can help get it there.",
  ACCEPTED: "Accepted — now in production.",
};

export interface SubmissionStatusCardProps {
  submission: Pick<NarrivaSubmission, "manuscriptTitle" | "submittedAt" | "status" | "reviewerNotes">;
}

/** Pre-acceptance status card — see SubmissionStageTracker for the
 * post-acceptance timeline shown once status is ACCEPTED. */
export function SubmissionStatusCard({ submission }: SubmissionStatusCardProps) {
  const treatment = STATUS_TREATMENT[submission.status];
  const note = submission.reviewerNotes ?? DEFAULT_NOTE[submission.status];

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-6 rounded-lg border border-[var(--color-ink)]/10 bg-white px-[34px] py-8">
      <div>
        <div className="flex flex-wrap items-center gap-3.5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--color-ink)]">
            {submission.manuscriptTitle}
          </h2>
          <span
            className="rounded-full px-3 py-[5px] text-xs font-semibold tracking-[0.03em]"
            style={{ color: treatment.color, backgroundColor: treatment.bg }}
          >
            {treatment.label}
          </span>
        </div>
        <div className="mt-2 text-[13.5px] text-[var(--color-muted-3)]">
          Submitted{" "}
          {submission.submittedAt.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <p className="mt-4 max-w-[560px] text-[15px] leading-[1.65] text-[var(--color-muted)]">{note}</p>
      </div>

      <div className="text-right">
        <div className="mb-2 text-xs uppercase tracking-[0.1em] text-[var(--color-accent-text)]">Stage</div>
        <div className="flex justify-end gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-[9px] w-[9px] rounded-full"
              style={{
                backgroundColor:
                  i < treatment.activeDots ? "var(--color-primary)" : "rgba(22,22,22,0.12)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
