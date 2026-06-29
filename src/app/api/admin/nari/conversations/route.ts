import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { IntentLevel } from "@prisma/client";

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const intentLevel = url.searchParams.get("intentLevel") as IntentLevel | null;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

    const where: { intentLevel?: IntentLevel } = {};
    if (intentLevel) {
      where.intentLevel = intentLevel;
    }

    const [conversations, total] = await Promise.all([
      prisma.nariConversation.findMany({
        where: intentLevel
          ? { intel: { intentLevel } }
          : {},
        include: {
          user: { select: { name: true } },
          intel: true,
        },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.nariConversation.count({
        where: intentLevel
          ? { intel: { intentLevel } }
          : {},
      }),
    ]);

    const result = conversations.map((c) => {
      const messages = c.messages as { role: string; content: string; timestamp: string }[];
      return {
        id: c.id,
        sessionId: c.sessionId,
        startedAt: c.startedAt.toISOString(),
        endedAt: c.endedAt?.toISOString() ?? null,
        durationSecs: c.durationSecs,
        messageCount: messages.length,
        userId: c.userId,
        userName: c.user?.name ?? null,
        intelligence: c.intel
          ? {
              id: c.intel.id,
              visitorName: c.intel.visitorName,
              visitorEmail: c.intel.visitorEmail,
              manuscriptTopic: c.intel.manuscriptTopic,
              manuscriptStatus: c.intel.manuscriptStatus,
              wordCount: c.intel.wordCount,
              servicesInterest: c.intel.servicesInterest,
              timelineSignal: c.intel.timelineSignal,
              budgetSignal: c.intel.budgetSignal,
              painPoints: c.intel.painPoints,
              competitorMentions: c.intel.competitorMentions,
              intentLevel: c.intel.intentLevel,
              extractedAt: c.intel.extractedAt.toISOString(),
              leadId: c.intel.leadId,
            }
          : null,
      };
    });

    return NextResponse.json({
      conversations: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
  { roles: ["ADMIN"] },
);
