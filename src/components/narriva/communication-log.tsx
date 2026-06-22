import { Heading, Body } from "@/components/ui/typography";
import type { SubmissionUpdate } from "@prisma/client";

export interface CommunicationLogProps {
  updates: readonly SubmissionUpdate[];
  reviewerNotes?: string | null;
}

/** Read-only view of an admin's dated updates for the Author Portal — the
 * editable counterpart lives in src/components/admin/submission-controls.tsx. */
export function CommunicationLog({ updates, reviewerNotes }: CommunicationLogProps) {
  if (updates.length === 0 && !reviewerNotes) return null;

  return (
    <div>
      <Heading as="h3" size="h4">
        Updates
      </Heading>
      <div className="mt-4 flex flex-col gap-3">
        {reviewerNotes && (
          <div className="rounded-md border border-[var(--color-ink)]/10 p-4">
            <Body size="sm" className="text-[var(--color-ink)]/80">
              {reviewerNotes}
            </Body>
          </div>
        )}
        {updates.map((update) => (
          <div key={update.id} className="rounded-md border border-[var(--color-ink)]/10 p-4">
            <p className="text-xs text-[var(--color-ink)]/50">
              {update.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <Body size="sm" className="mt-1 text-[var(--color-ink)]/80">
              {update.note}
            </Body>
          </div>
        ))}
      </div>
    </div>
  );
}
