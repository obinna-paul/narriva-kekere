import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { NariLeadStatus } from "@prisma/client";

const STATUSES = ["NEW", "CONTACTED", "IN_DISCUSSION", "SUBMITTED", "WON", "LOST"] as const;

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const lead = await prisma.nariLead.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updateData: { status?: NariLeadStatus; notes?: string } = {};
    if (parsed.data.status) {
      updateData.status = parsed.data.status as NariLeadStatus;
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }

    const updated = await prisma.nariLead.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        manuscriptTopic: updated.manuscriptTopic,
        intentLevel: updated.intentLevel,
        status: updated.status,
        notes: updated.notes,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
  { roles: ["ADMIN"] },
);
