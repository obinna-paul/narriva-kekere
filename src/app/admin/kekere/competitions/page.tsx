import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listCompetitions } from "@/lib/data/kekere-competitions";

export const dynamic = "force-dynamic";

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
                <td className="px-4 py-3">{competition.title}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{competition.status}</td>
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
