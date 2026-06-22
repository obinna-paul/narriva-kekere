import { KekereTheme } from "@/components/theme";
import { KekereNav } from "@/components/kekere/kekere-nav";
import { WalletView } from "@/components/kekere/wallet-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWalletForUser } from "@/lib/data/kekere-wallet";

export const dynamic = "force-dynamic";

// Auth protection lives in src/middleware.ts (redirects logged-out visitors
// to /login); this still reads the session to know whose wallet to fetch.
export default async function KekereWalletPage() {
  const session = await getCurrentSession();
  const wallet = session?.user?.id ? await getWalletForUser(session.user.id) : null;

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNav />
        <WalletView
          balance={wallet?.balance ?? 0}
          transactions={
            wallet?.transactions.map((tx) => ({
              id: tx.id,
              type: tx.type,
              amountCowries: tx.amountCowries,
              description: tx.description,
              date: tx.createdAt.toISOString(),
            })) ?? []
          }
        />
      </div>
    </KekereTheme>
  );
}
