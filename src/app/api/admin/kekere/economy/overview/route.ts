import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { reconcileEconomy } from "@/lib/economy/reconcile";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";

export const GET = withAuth(
  async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [
      reconciliation,
      topupBreakdown,
      walletAvg,
      totalUsers,
      usersWithTopup,
      usersWithMultipleTopups,
      storyUnlocks7d,
      activeUsers7d,
    ] = await Promise.all([
      reconcileEconomy(),
      prisma.transaction.groupBy({
        by: ["amountNgn"],
        where: {
          type: "TOP_UP",
          status: "COMPLETED",
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
        _sum: { amountNgn: true },
      }),
      prisma.wallet.aggregate({
        where: {
          user: { unlocks: { some: { unlockedAt: { gte: thirtyDaysAgo } } } },
        },
        _avg: { spendingBalance: true },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          wallet: { transactions: { some: { type: "TOP_UP", status: "COMPLETED" } } },
        },
      }),
      prisma.user.count({
        where: {
          wallet: {
            transactions: {
              some: { type: "TOP_UP", status: "COMPLETED" },
            },
          },
        },
      }),
      prisma.storyUnlock.count({
        where: { unlockedAt: { gte: sevenDaysAgo } },
      }),
      prisma.storyUnlock.findMany({
        where: { unlockedAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const usersWithMultipleTopupsActual = await prisma.user.count({
      where: {
        wallet: {
          transactions: {
            some: { type: "TOP_UP", status: "COMPLETED" },
          },
        },
      },
    });

    // Count users with 2+ TOP_UP transactions
    const repeatTopupUsers = await prisma.transaction.groupBy({
      by: ["walletId"],
      where: { type: "TOP_UP", status: "COMPLETED" },
      _count: true,
      having: { walletId: { _count: { gt: 1 } } },
    });

    const topupPackageBreakdown = COWRIE_TOPUP_PACKAGES.map((pkg) => {
      const match = topupBreakdown.find((t) => t.amountNgn === pkg.priceNGN);
      return {
        priceNGN: pkg.priceNGN,
        cowries: pkg.cowries + pkg.bonusCowries,
        transactionCount: match?._count ?? 0,
        totalNGN: match?._sum.amountNgn ?? 0,
      };
    });

    const activeUsers7dCount = activeUsers7d.length;

    return NextResponse.json({
      reconciliation,
      topupPackageBreakdown,
      avgSpendingBalancePerActiveUser: walletAvg._avg.spendingBalance ?? 0,
      topupConversionRate: totalUsers > 0 ? (usersWithTopup / totalUsers) : 0,
      repeatTopupRate:
        usersWithTopup > 0
          ? (usersWithMultipleTopupsActual > 0
              ? usersWithMultipleTopupsActual / usersWithTopup
              : repeatTopupUsers.length / Math.max(1, usersWithTopup))
          : 0,
      avgUnlocksPerActiveUserPerWeek:
        activeUsers7dCount > 0
          ? Math.round((storyUnlocks7d / activeUsers7dCount) * 100) / 100
          : 0,
    });
  },
  { roles: ["ADMIN"] },
);
