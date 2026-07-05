import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { MockCompetition } from "@/content/mock/kekere-competitions";

const STATUS_STYLES: Record<MockCompetition["status"], string> = {
  DRAFT: "bg-[var(--color-ink)]/10 text-[var(--color-ink-muted)]",
  OPEN: "bg-[#C75D2C] text-white",
  JUDGING: "bg-[rgba(31,75,75,0.14)] text-[#1F4B4B]",
  CLOSED: "bg-[rgba(42,26,18,0.08)] text-[#8A7565]",
  COMPLETE: "bg-[#2A1A12] text-white",
};

const STATUS_LABELS: Record<MockCompetition["status"], string> = {
  DRAFT: "Draft",
  OPEN: "OPEN",
  JUDGING: "JUDGING",
  CLOSED: "CLOSED",
  COMPLETE: "COMPLETE",
};

export interface CompetitionCardProps {
  competition: MockCompetition;
  daysLeft?: number;
}

export function CompetitionCard({ competition, daysLeft }: CompetitionCardProps) {
  const isOpen = competition.status === "OPEN";

  return (
    <Link
      href={`/kekere/competitions/${competition.slug}`}
      className="group block rounded-[18px] border border-[rgba(42,26,18,0.1)] bg-white p-6 shadow-[0_10px_26px_-16px_rgba(42,26,18,0.3)] transition-colors hover:border-[var(--color-primary)]"
    >
      <div className="mb-[14px] flex items-center justify-between gap-3">
        <span
          className={cn(
            "rounded-[20px] px-3 py-[5px] text-[11px] font-semibold tracking-[0.03em]",
            STATUS_STYLES[competition.status],
          )}
        >
          {STATUS_LABELS[competition.status]}
        </span>
        {isOpen && daysLeft !== undefined && daysLeft > 0 && (
          <span className="text-[12.5px] font-semibold text-[var(--color-primary)]">
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left
          </span>
        )}
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-[23px] font-semibold leading-[1.16] text-[var(--color-ink)]">
        {competition.title}
      </h2>

      <p className="mt-[10px] text-[14.5px] leading-[1.55] text-[var(--color-ink-muted)]">
        {competition.theme}
      </p>

      <div className="mt-4 border-t border-[rgba(42,26,18,0.08)] pt-4">
        <p className="text-[13px] text-[var(--color-ink-muted-2)]">
          {competition.prizeDescription}
        </p>
        <span className="mt-4 block w-full rounded-[10px] bg-[var(--color-primary)] py-[11px] text-center text-[13.5px] font-semibold text-white transition-colors group-hover:bg-[var(--color-primary-light)]">
          See competition →
        </span>
      </div>
    </Link>
  );
}
