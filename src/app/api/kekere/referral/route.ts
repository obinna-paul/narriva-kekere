export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (_request, session) => {
  const userId = session.user.id;

  const [referralCode, totalReferrals, rewardedReferrals, earningsAgg, referrals] = await Promise.all([
    prisma.referralCode.findUnique({ where: { userId } }),
    prisma.referral.count({ where: { referrerId: userId } }),
    prisma.referral.count({ where: { referrerId: userId, status: "REWARDED" } }),
    prisma.transaction.aggregate({
      _sum: { amountCowries: true },
      where: { wallet: { userId }, type: "REFERRAL_REWARD", status: "COMPLETED" },
    }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referredUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    code: referralCode?.code ?? null,
    shareUrl: referralCode ? `https://kekere.narriva.com/invite/${referralCode.code}` : null,
    totalReferrals,
    rewardedReferrals,
    totalCowriesEarned: earningsAgg._sum.amountCowries ?? 0,
    referrals: referrals.map((r) => ({
      referredAt: r.createdAt,
      status: r.status === "REWARDED" ? "Reward earned" : "Joined",
      rewardedAt: r.rewardedAt,
      referredUserName: r.referredUser.name.slice(0, 3),
    })),
  });
});
