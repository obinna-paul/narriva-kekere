import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { MockCompetition } from "@/content/mock/kekere-competitions";

const STATUS_STYLES: Record<MockCompetition["status"], string> = {
  DRAFT: "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/60",
  OPEN: "bg-emerald-100 text-emerald-800",
  JUDGING: "bg-amber-100 text-amber-800",
  CLOSED: "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/60",
  COMPLETE: "bg-sky-100 text-sky-800",
};

export interface CompetitionCardProps {
  competition: MockCompetition;
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  return (
    <Link
      href={`/kekere/competitions/${competition.slug}`}
      className="block rounded-2xl border border-[var(--color-ink)]/10 p-5 transition-colors hover:border-[var(--color-primary)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
    >
      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
          STATUS_STYLES[competition.status]
        )}
      >
        {competition.status}
      </span>
      <h3 className="mt-3 text-lg font-bold">{competition.title}</h3>
      <p className="mt-1 text-sm font-medium text-[var(--color-primary)]">{competition.theme}</p>
      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--color-ink)]/60">
        <div className="flex gap-1">
          <dt className="font-medium">Deadline:</dt>
          <dd>
            {new Date(competition.deadline).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-medium">Limit:</dt>
          <dd>{competition.wordCountLimit.toLocaleString()} words</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-[var(--color-ink)]/75">{competition.prizeDescription}</p>
    </Link>
  );
}
