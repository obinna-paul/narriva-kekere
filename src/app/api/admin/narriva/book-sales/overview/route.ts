import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [allPurchases, monthPurchases, weekPurchases, bestSeller] = await Promise.all([
      prisma.bookPurchase.findMany({
        include: { book: { select: { price: true } } },
      }),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: monthStart } },
        include: { book: { select: { price: true } } },
      }),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: weekStart } },
        include: { book: { select: { price: true } } },
      }),
      prisma.bookPurchase.groupBy({
        by: ["bookId"],
        where: { purchasedAt: { gte: monthStart } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      }),
    ]);

    const totalRevenueAllTime = allPurchases.reduce((s, p) => s + p.book.price, 0);
    const totalRevenueMonth = monthPurchases.reduce((s, p) => s + p.book.price, 0);
    const totalRevenueWeek = weekPurchases.reduce((s, p) => s + p.book.price, 0);
    const totalUnitsAllTime = allPurchases.length;
    const totalUnitsMonth = monthPurchases.length;

    let bestSellerInfo = null;
    if (bestSeller.length > 0) {
      const book = await prisma.book.findUnique({
        where: { id: bestSeller[0].bookId },
        select: { title: true },
      });
      bestSellerInfo = {
        bookId: bestSeller[0].bookId,
        title: book?.title ?? "Unknown",
        units: bestSeller[0]._count.id,
      };
    }

    return NextResponse.json({
      totalRevenueAllTimeNgn: Math.round(totalRevenueAllTime * 100) / 100,
      totalRevenueThisMonthNgn: Math.round(totalRevenueMonth * 100) / 100,
      totalRevenueThisWeekNgn: Math.round(totalRevenueWeek * 100) / 100,
      totalUnitsAllTime,
      totalUnitsThisMonth: totalUnitsMonth,
      avgRevenuePerSale:
        totalUnitsAllTime > 0
          ? Math.round((totalRevenueAllTime / totalUnitsAllTime) * 100) / 100
          : 0,
      bestSellerThisMonth: bestSellerInfo,
    });
  },
  { roles: ["ADMIN"] },
);
