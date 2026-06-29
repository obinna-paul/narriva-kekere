import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { IntentLevel, NariLeadStatus } from "@prisma/client";

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as NariLeadStatus | null;
    const intentLevel = url.searchParams.get("intentLevel") as IntentLevel | null;

    const where: { status?: NariLeadStatus; intentLevel?: IntentLevel } = {};
    if (status) where.status = status;
    if (intentLevel) where.intentLevel = intentLevel;

    const leads = await prisma.nariLead.findMany({
      where,
      include: {
        conversationIntels: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = leads.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      manuscriptTopic: l.manuscriptTopic,
      intentLevel: l.intentLevel,
      status: l.status,
      notes: l.notes,
      conversationCount: l.conversationIntels.length,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));

    return NextResponse.json({ leads: result });
  },
  { roles: ["ADMIN"] },
);

export const POST = withAuth(
  async (request) => {
    let body: {
      conversationId?: string;
      name?: string;
      email?: string;
      manuscriptTopic?: string;
      intentLevel?: string;
      notes?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.conversationId) {
      return NextResponse.json(
        { error: "conversationId is required." },
        { status: 400 },
      );
    }

    const intel = await prisma.nariConversationIntel.findUnique({
      where: { conversationId: body.conversationId },
    });

    if (!intel) {
      return NextResponse.json(
        { error: "No intelligence record found for this conversation." },
        { status: 404 },
      );
    }

    const intentLevels = ["HIGH", "MEDIUM", "LOW", "BROWSING"] as const;
    const intentLevel = body.intentLevel && intentLevels.includes(body.intentLevel as IntentLevel)
      ? (body.intentLevel as IntentLevel)
      : (intel.intentLevel as IntentLevel);

    const lead = await prisma.nariLead.create({
      data: {
        name: body.name?.trim() || intel.visitorName,
        email: body.email?.trim() || intel.visitorEmail,
        manuscriptTopic: body.manuscriptTopic?.trim() || intel.manuscriptTopic,
        intentLevel,
        notes: body.notes?.trim() ?? null,
      },
    });

    await prisma.nariConversationIntel.update({
      where: { conversationId: body.conversationId },
      data: { leadId: lead.id },
    });

    return NextResponse.json({ success: true, lead: { id: lead.id } });
  },
  { roles: ["ADMIN"] },
);
