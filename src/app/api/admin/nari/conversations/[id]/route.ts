import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const conversation = await prisma.nariConversation.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        intel: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: conversation.id,
      sessionId: conversation.sessionId,
      userId: conversation.userId,
      userName: conversation.user?.name ?? null,
      userEmail: conversation.user?.email ?? null,
      messages: conversation.messages,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt?.toISOString() ?? null,
      durationSecs: conversation.durationSecs,
      intelligence: conversation.intel
        ? {
            id: conversation.intel.id,
            visitorName: conversation.intel.visitorName,
            visitorEmail: conversation.intel.visitorEmail,
            manuscriptTopic: conversation.intel.manuscriptTopic,
            manuscriptStatus: conversation.intel.manuscriptStatus,
            wordCount: conversation.intel.wordCount,
            servicesInterest: conversation.intel.servicesInterest,
            timelineSignal: conversation.intel.timelineSignal,
            budgetSignal: conversation.intel.budgetSignal,
            painPoints: conversation.intel.painPoints,
            competitorMentions: conversation.intel.competitorMentions,
            intentLevel: conversation.intel.intentLevel,
            extractedAt: conversation.intel.extractedAt.toISOString(),
            leadId: conversation.intel.leadId,
          }
        : null,
    });
  },
  { roles: ["ADMIN"] },
);
