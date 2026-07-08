import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WalletView } from "@/components/kekere/wallet-view";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWalletForUser, countTransactionsForUser } from "@/lib/data/kekere-wallet";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function KekereWalletPage() {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  const [wallet, user, totalTransactionCount] = userId
    ? await Promise.all([
        getWalletForUser(userId),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            referralCode: true,
            referredBy: true,
          },
        }),
        countTransactionsForUser(userId),
      ])
    : [null, null, 0];

  const referralEarnings = wallet?.transactions
    .filter((t) => t.type === "REFERRAL" || t.type === "REFERRAL_REWARD")
    .reduce((sum, t) => sum + t.amountCowries.toNumber(), 0) ?? 0;

  const tipEarnings = wallet?.transactions
    .filter((t) => t.type === "TIP" && t.amountCowries.toNumber() > 0)
    .reduce((sum, t) => sum + t.amountCowries.toNumber(), 0) ?? 0;

  const isWriter = user?.role === "WRITER" || user?.role === "ADMIN";

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <KekereNavWrapper />
        <WalletView
          spendingBalance={wallet?.spendingBalance ?? 0}
          earnedBalance={wallet?.earnedBalance.toNumber() ?? 0}
          userId={userId ?? ""}
          userEmail={session?.user?.email ?? ""}
          isWriter={isWriter}
          totalTransactionCount={totalTransactionCount}
          referralCode={user?.referralCode ?? null}
          referralEarnings={referralEarnings}
          tipEarnings={tipEarnings}
          transactions={
            wallet?.transactions
              .filter((tx) => tx.type !== "COMPLETION_BONUS")
              .map((tx) => ({
                id: tx.id,
                type: tx.type as Exclude<typeof tx.type, "COMPLETION_BONUS">,
                amountCowries: tx.amountCowries.toNumber(),
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
