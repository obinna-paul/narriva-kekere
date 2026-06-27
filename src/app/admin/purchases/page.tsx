import { Heading } from "@/components/ui/typography";
import { DeleteButton } from "@/components/admin/delete-button";
import { listAllPurchases } from "@/lib/data/books";

export const dynamic = "force-dynamic";

export default async function AdminPurchasesPage() {
  const purchases = await listAllPurchases();

  return (
    <div>
      <Heading as="h1" size="h2">
        Book purchases ({purchases.length})
      </Heading>
      <p className="mt-2 text-sm text-[var(--color-ink)]/60">
        Non-refundable per policy — revoke is a manual goodwill action, logged for reconciliation.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Book</th>
              <th className="px-4 py-3 font-medium">Payment reference</th>
              <th className="px-4 py-3 font-medium">Purchased</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{p.userEmail}</td>
                <td className="px-4 py-3">{p.bookTitle}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{p.paymentReference}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {p.purchasedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <DeleteButton endpoint={`/api/admin/purchases/${p.id}`} confirmLabel="this purchase (revoke access)" />
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No purchases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
