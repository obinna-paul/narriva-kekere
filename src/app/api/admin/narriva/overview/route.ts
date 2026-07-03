export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      projectsByStage,
      pendingSubmissions,
      booksInStore,
      monthPurchases,
      nariHighIntentPending,
    ] = await Promise.all([
      prisma.authorProject.groupBy({
        by: ["currentStage"],
        _count: true,
      }),
      prisma.narrivaSubmission.count({
        where: { status: { in: ["RECEIVED", "READING"] } },
      }),
      prisma.book.count(),
      prisma.bookPurchase.findMany({
        where: { purchasedAt: { gte: monthStart } },
        include: { book: { select: { price: true } } },
      }),
      prisma.nariConversationIntel.count({
        where: { intentLevel: "HIGH", leadId: null },
      }),
    ]);

    const stageCounts: Record<string, number> = {
      ASSESSMENT: 0,
      EDITORIAL: 0,
      DESIGN: 0,
      PRODUCTION: 0,
      LAUNCHED: 0,
    };

    let activeProjects = 0;

    projectsByStage.forEach((p) => {
      stageCounts[p.currentStage] = p._count;
      if (p.currentStage !== "LAUNCHED") {
        activeProjects += p._count;
      }
    });

    const revenueMonth = monthPurchases.reduce((s, p) => s + p.book.price, 0);

    return NextResponse.json({
      activeProjects,
      projectsByStage: stageCounts,
      pendingSubmissions,
      booksInStore,
      salesThisMonth: {
        totalRevenueThisMonthNgn: Math.round(revenueMonth * 100) / 100,
        totalUnitsThisMonth: monthPurchases.length,
      },
      nariHighIntentPending,
    });
  },
  { roles: ["ADMIN"] },
);
