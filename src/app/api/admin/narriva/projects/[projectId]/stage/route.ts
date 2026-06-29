import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { ProjectStage } from "@prisma/client";

const STAGES = ["ASSESSMENT", "EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"] as const;

const stageSchema = z.object({
  stage: z.enum(STAGES),
  note: z.string().min(1, "Stage change note is required."),
  statusNote: z.string().optional(),
});

export const PUT = withAuth(
  async (request, session, { params }) => {
    const { projectId } = params as { projectId: string };

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = stageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { stage, note, statusNote } = parsed.data;

    const project = await prisma.authorProject.findUnique({
      where: { id: projectId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updateData: { currentStage: ProjectStage; statusNote?: string } = {
      currentStage: stage as ProjectStage,
    };

    if (statusNote !== undefined) {
      updateData.statusNote = statusNote;
    }

    const [updated] = await prisma.$transaction([
      prisma.authorProject.update({
        where: { id: projectId },
        data: updateData,
      }),
      prisma.projectMessage.create({
        data: {
          projectId,
          authorId: session.user.id,
          authorRole: "Admin",
          body: note,
          isInternal: false,
        },
      }),
    ]);

    return NextResponse.json({
      id: updated.id,
      bookTitle: updated.bookTitle,
      currentStage: updated.currentStage,
      statusNote: updated.statusNote,
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
  { roles: ["ADMIN"] }
);
