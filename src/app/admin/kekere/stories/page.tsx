import Link from "next/link";
import { Heading } from "@/components/ui/typography";
import { cn } from "@/lib/utils/cn";
import { listModerationQueue } from "@/lib/data/kekere-moderation";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800",
  REVISIONS_REQUESTED: "bg-orange-100 text-orange-800",
};

export default async function AdminKekereStoriesPage() {
  const queue = await listModerationQueue();

  return (
    <div>
      <Heading as="h1" size="h2">
        Kekere moderation queue ({queue.length})
      </Heading>
      <p className="mt-2 text-sm text-[var(--color-ink)]/60">
        Oldest submission first. Includes stories sent back for revisions, so you can
        follow up if nothing comes back.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Words</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((story) => (
              <tr key={story.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{story.title}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{story.author.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
                      STATUS_STYLES[story.status]
                    )}
                  >
                    {story.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {story.submittedAt
                    ? story.submittedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {story.body.trim().split(/\s+/).filter(Boolean).length.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/kekere/stories/${story.id}`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  Nothing waiting for review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
