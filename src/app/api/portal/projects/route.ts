import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (request, session) => {
  const userId = session.user.id;

  const projects = await prisma.authorProject.findMany({
    where: { userId },
    include: {
      deliverables: {
        where: { status: "FOR_REVIEW" },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = projects.map((p) => ({
    id: p.id,
    bookTitle: p.bookTitle,
    coverImageRef: p.coverImageRef,
    currentStage: p.currentStage,
    statusNote: p.statusNote,
    expectedPubDate: p.expectedPubDate?.toISOString() ?? null,
    isbn: p.isbn,
    pendingActionCount: p.deliverables.length,
  }));

  return NextResponse.json({ projects: result });
});
