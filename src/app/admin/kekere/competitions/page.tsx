import Link from "next/link";
import type { CompetitionStatus } from "@prisma/client";
import { Heading } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listCompetitions } from "@/lib/data/kekere-competitions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<CompetitionStatus, string> = {
  DRAFT: "bg-[rgba(20,22,26,0.07)] text-[#646B73]",
  UPCOMING: "bg-[rgba(224,138,74,0.16)] text-[#B14E22]",
  OPEN: "bg-[rgba(31,138,91,0.10)] text-[#1F8A5B]",
  JUDGING: "bg-[rgba(30,58,138,0.10)] text-[#1E3A8A]",
  CLOSED: "bg-[rgba(192,57,43,0.10)] text-[#C0392B]",
  COMPLETE: "bg-[rgba(20,22,26,0.85)] text-white",
};

const STATUS_LABELS: Record<CompetitionStatus, string> = {
  DRAFT: "Draft",
  UPCOMING: "Coming soon",
  OPEN: "Open",
  JUDGING: "Judging",
  CLOSED: "Closed",
  COMPLETE: "Complete",
};

export default async function AdminKekereCompetitionsPage() {
  const competitions = await listCompetitions();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading as="h1" size="h2">
          Kekere competitions ({competitions.length})
        </Heading>
        <Link href="/admin/kekere/competitions/new" className={cn(buttonVariants({ size: "sm" }))}>
          New competition
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitions.map((competition) => (
              <tr key={competition.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--color-ink)]">{competition.title}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", STATUS_STYLES[competition.status])}>
                    {STATUS_LABELS[competition.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {competition.deadline.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/kekere/competitions/${competition.id}`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {competitions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No competitions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
