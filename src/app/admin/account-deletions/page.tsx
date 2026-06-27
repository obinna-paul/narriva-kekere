import { Heading } from "@/components/ui/typography";
import { DeleteButton } from "@/components/admin/delete-button";
import { listPendingAccountDeletions } from "@/lib/data/users";

export const dynamic = "force-dynamic";

export default async function AdminAccountDeletionsPage() {
  const pending = await listPendingAccountDeletions();

  return (
    <div>
      <Heading as="h1" size="h2">
        Account deletion requests ({pending.length})
      </Heading>
      <p className="mt-2 text-sm text-[var(--color-ink)]/60">
        Marking a request as processed clears it from this queue and logs the action —
        it does not run the actual data-purge job. Run that separately within 30 days of
        the request date.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Requested</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {u.deletionRequestedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <DeleteButton
                    endpoint={`/api/admin/account-deletions/${u.id}`}
                    confirmLabel={`processing for ${u.email} (mark complete)`}
                  />
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
