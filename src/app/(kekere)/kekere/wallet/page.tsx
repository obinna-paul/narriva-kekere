import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WalletView } from "@/components/kekere/wallet-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWalletForUser } from "@/lib/data/kekere-wallet";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function KekereWalletPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const [wallet, user] = userId
    ? await Promise.all([
        getWalletForUser(userId),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            bankAccountNumber: true,
            bankName: true,
            referralCode: true,
            referredBy: true,
          },
        }),
      ])
    : [null, null];

  const referralEarnings = wallet?.transactions
    .filter((t) => t.type === "REFERRAL")
    .reduce((sum, t) => sum + t.amountCowries, 0) ?? 0;

  const readRewardEarnings = wallet?.transactions
    .filter((t) => t.type === "READ_REWARD")
    .reduce((sum, t) => sum + t.amountCowries, 0) ?? 0;

  const tipEarnings = wallet?.transactions
    .filter((t) => t.type === "TIP" && t.amountCowries > 0)
    .reduce((sum, t) => sum + t.amountCowries, 0) ?? 0;

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <KekereNavWrapper />
        <WalletView
          balance={wallet?.balance ?? 0}
          userId={userId ?? ""}
          userEmail={session?.user?.email ?? ""}
          hasBankDetails={!!user?.bankAccountNumber && !!user?.bankName}
          referralCode={user?.referralCode ?? null}
          referralEarnings={referralEarnings}
          readRewardEarnings={readRewardEarnings}
          tipEarnings={tipEarnings}
          transactions={
            wallet?.transactions.map((tx) => ({
              id: tx.id,
              type: tx.type,
              amountCowries: tx.amountCowries,
              amountNgn: tx.amountNgn,
              description: tx.description,
              date: tx.createdAt.toISOString(),
              status: tx.status,
            })) ?? []
          }
        />
      </div>
    </KekereTheme>
  );
}