export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { ProjectStage } from "@prisma/client";

const STAGE_META: Record<ProjectStage, { description: string; estimatedWeeks: string | null }> = {
  ASSESSMENT: {
    description: "We are reviewing your manuscript and assessing what it needs.",
    estimatedWeeks: "1–2 weeks",
  },
  EDITORIAL: {
    description: "Your manuscript is in active editorial development.",
    estimatedWeeks: "4–8 weeks",
  },
  DESIGN: {
    description: "Cover and interior design are being developed.",
    estimatedWeeks: "3–5 weeks",
  },
  PRODUCTION: {
    description: "Your book is being prepared for publication.",
    estimatedWeeks: "2–3 weeks",
  },
  LAUNCHED: {
    description: "Your book is live in the Narriva bookstore.",
    estimatedWeeks: null,
  },
};

export const GET = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { projectId } = params as { projectId: string };

  const project = await prisma.authorProject.findUnique({
    where: { id: projectId },
    include: { submission: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: project.id,
    bookTitle: project.bookTitle,
    coverImageRef: project.coverImageRef,
    currentStage: project.currentStage,
    statusNote: project.statusNote,
    expectedPubDate: project.expectedPubDate?.toISOString() ?? null,
    isbn: project.isbn,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    submission: {
      manuscriptTitle: project.submission.manuscriptTitle,
      submittedAt: project.submission.submittedAt.toISOString(),
    },
    currentStageMeta: STAGE_META[project.currentStage],
  });
});
