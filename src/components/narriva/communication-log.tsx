import type { SubmissionUpdate } from "@prisma/client";

export interface CommunicationLogProps {
  updates: readonly SubmissionUpdate[];
}

/** Connected vertical timeline of dated updates — the editable counterpart
 * lives in src/components/admin/submission-controls.tsx. Every entry is
 * attributed to "Narriva" (the schema only stores a note + timestamp, not a
 * per-update author), so all dots share one colour rather than the
 * per-department colours the design mock used for illustrative staff names. */
export function CommunicationLog({ updates }: CommunicationLogProps) {
  if (updates.length === 0) return null;

  return (
    <div>
      <h3 className="mb-[22px] font-[family-name:var(--font-display)] text-[22px] font-medium text-[var(--color-ink)]">
        Updates from the team
      </h3>
      <div className="relative pl-[34px]">
        <div className="absolute bottom-1.5 left-[9px] top-1.5 w-px bg-[var(--color-ink)]/[0.12]" />
        {updates.map((update) => (
          <div key={update.id} className="relative pb-7 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute left-[-34px] top-[3px] h-[18px] w-[18px] rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-bg)]"
            />
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Narriva</span>
              <span className="text-[12.5px] text-[var(--color-accent-text)]">
                {update.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <p className="mt-1.5 max-w-[620px] text-[14.5px] leading-[1.6] text-[var(--color-muted)]">
              {update.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
