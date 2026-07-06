import { redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { WithdrawalPage } from "@/components/kekere/withdrawal-flow";
import { getCurrentSession } from "@/lib/auth/middleware";
import { getWalletForUser } from "@/lib/data/kekere-wallet";

export const dynamic = "force-dynamic";

export default async function KekereWithdrawPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");

  const wallet = await getWalletForUser(session.user.id);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <KekereNavWrapper />
        <WithdrawalPage availableBalance={wallet?.earnedBalance.toNumber() ?? 0} hasBankDetails={false} />
      </div>
    </KekereTheme>
  );
}
