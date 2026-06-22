import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { cn } from "@/lib/utils/cn";
import { listSubmissions } from "@/lib/data/submissions";
import type { NarrivaSubmissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: NarrivaSubmissionStatus[] = [
  "RECEIVED",
  "READING",
  "REVIEWED",
  "ACCEPTED",
  "DECLINED",
];

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = STATUSES.includes(searchParams.status as NarrivaSubmissionStatus)
    ? (searchParams.status as NarrivaSubmissionStatus)
    : undefined;
  const submissions = await listSubmissions({ status });

  return (
    <div>
      <Heading as="h1" size="h2">
        Submissions ({submissions.length})
      </Heading>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/admin/submissions"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
            !status
              ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
              : "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/70"
          )}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/submissions?status=${s}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
              status === s
                ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                : "bg-[var(--color-ink)]/10 text-[var(--color-ink)]/70"
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Manuscript</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{submission.manuscriptTitle}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {submission.authorName}
                  <div className="text-xs text-[var(--color-ink)]/50">{submission.authorEmail}</div>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{submission.status}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {submission.submittedAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/submissions/${submission.id}`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No submissions{status ? ` with status ${status}` : ""} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
