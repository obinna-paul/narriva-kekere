import { Card, CardBody } from "@/components/ui/card";
import { Heading, Body } from "@/components/ui/typography";
import type { NarrivaSubmission } from "@prisma/client";

const STATUS_COPY: Record<string, string> = {
  RECEIVED: "We've received your manuscript and it's in the queue.",
  READING:
    "An editor is currently reading your manuscript — most authors hear back within 6-8 weeks of this stage starting.",
  REVIEWED: "Your manuscript has been reviewed — check your email for next steps.",
  DECLINED:
    "This manuscript wasn't a fit for us this time. We've sent details by email — we'd still like to hear from you again.",
};

export interface SubmissionStatusCardProps {
  submission: Pick<NarrivaSubmission, "manuscriptTitle" | "submittedAt" | "status">;
}

/** Pre-acceptance status card — see SubmissionStageTracker for the
 * post-acceptance timeline shown once status is ACCEPTED. */
export function SubmissionStatusCard({ submission }: SubmissionStatusCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Heading as="h3" size="h4">
            {submission.manuscriptTitle}
          </Heading>
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-accent)]">
            {submission.status}
          </span>
        </div>
        <Body size="sm" className="mt-1 text-[var(--color-ink)]/60">
          Submitted{" "}
          {submission.submittedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Body>
        <Body size="base" className="mt-4 text-[var(--color-ink)]/80">
          {STATUS_COPY[submission.status] ?? "We're reviewing your manuscript."}
        </Body>
      </CardBody>
    </Card>
  );
}
