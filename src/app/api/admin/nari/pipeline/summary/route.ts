export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      totalConversations,
      highIntentThisWeek,
      leadsCreatedThisMonth,
      totalLeads,
      leadsByStatus,
      convertedLeads,
    ] = await Promise.all([
      prisma.nariConversation.count({
        where: { startedAt: { gte: sevenDaysAgo } },
      }),
      prisma.nariConversationIntel.count({
        where: { intentLevel: "HIGH", extractedAt: { gte: sevenDaysAgo } },
      }),
      prisma.nariLead.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.nariLead.count(),
      prisma.nariLead.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.nariLead.count({
        where: { status: { in: ["SUBMITTED", "WON"] } },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      IN_DISCUSSION: 0,
      SUBMITTED: 0,
      WON: 0,
      LOST: 0,
    };

    leadsByStatus.forEach((l) => {
      statusCounts[l.status] = l._count;
    });

    return NextResponse.json({
      totalConversationsThisWeek: totalConversations,
      highIntentThisWeek,
      leadsCreatedThisMonth,
      conversionRate:
        totalLeads > 0
          ? Math.round((convertedLeads / totalLeads) * 1000) / 10
          : 0,
      leadsByStatus: statusCounts,
    });
  },
  { roles: ["ADMIN"] },
);
