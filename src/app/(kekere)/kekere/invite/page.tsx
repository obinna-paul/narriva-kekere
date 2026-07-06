import { redirect } from "next/navigation";
import { KekereTheme } from "@/components/theme";
import { KekereNavWrapper } from "@/components/kekere/kekere-nav-wrapper";
import { ReferralSection } from "@/components/kekere/referral-section";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function KekereInvitePage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/login");

  const [referralCode, totalReferrals, rewardedReferrals, earningsAgg, referrals] = await Promise.all([
    prisma.referralCode.findUnique({ where: { userId: session.user.id } }),
    prisma.referral.count({ where: { referrerId: session.user.id } }),
    prisma.referral.count({ where: { referrerId: session.user.id, status: "REWARDED" } }),
    prisma.transaction.aggregate({
      _sum: { amountCowries: true },
      where: { wallet: { userId: session.user.id }, type: "REFERRAL_REWARD", status: "COMPLETED" },
    }),
    prisma.referral.findMany({
      where: { referrerId: session.user.id },
      include: { referredUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <KekereTheme>
      <div className="min-h-screen bg-[#F5EBDD]">
        <KekereNavWrapper />
        <ReferralSection
          stats={{
            code: referralCode?.code ?? null,
            shareUrl: referralCode ? `https://narriva.pro/kekere/invite/${referralCode.code}` : null,
            totalReferrals,
            rewardedReferrals,
            totalCowriesEarned: earningsAgg._sum.amountCowries?.toNumber() ?? 0,
            referrals: referrals.map((r) => ({
              referredAt: r.createdAt.toISOString(),
              status: r.status,
              rewardStatus: r.status === "REWARDED" ? "Reward earned" : "Joined",
              referredUserName: r.referredUser.name.slice(0, 3),
            })),
          }}
        />
      </div>
    </KekereTheme>
  );
}
