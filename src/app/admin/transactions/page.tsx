import { Heading } from "@/components/ui/typography";
import { cn } from "@/lib/utils/cn";
import { listAllTransactions } from "@/lib/data/kekere-wallet";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function AdminTransactionsPage() {
  const transactions = await listAllTransactions();

  return (
    <div>
      <Heading as="h1" size="h2">
        Kekere wallet transactions ({transactions.length})
      </Heading>
      <p className="mt-2 text-sm text-[var(--color-ink)]/60">
        Cowrie top-ups and unlocks, for manual reconciliation against Paystack.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-ink)]/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-ink)]/10 bg-[var(--color-ink)]/[0.03]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Cowries</th>
              <th className="px-4 py-3 font-medium">NGN</th>
              <th className="px-4 py-3 font-medium">Payment reference</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-[var(--color-ink)]/10 last:border-0">
                <td className="px-4 py-3">{t.userEmail}</td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
                      STATUS_STYLES[t.status]
                    )}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3">{t.amountCowries}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {t.amountNgn ? `₦${t.amountNgn.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">{t.paymentReference ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/70">
                  {t.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[var(--color-ink)]/50">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
