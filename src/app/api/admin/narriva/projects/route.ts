import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const projects = await prisma.authorProject.findMany({
      include: {
        user: { select: { name: true } },
        deliverables: {
          select: { id: true, status: true },
        },
      },
      orderBy: { updatedAt: "asc" },
    });

    const result = projects.map((p) => {
      const pendingAuthorActions = p.deliverables.filter(
        (d) => d.status === "FOR_REVIEW"
      ).length;
      const pendingAdminActions = p.deliverables.filter(
        (d) => d.status === "CHANGES_REQUESTED"
      ).length;

      const daysInCurrentStage = Math.floor(
        (Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: p.id,
        bookTitle: p.bookTitle,
        userId: p.userId,
        authorName: p.user.name,
        currentStage: p.currentStage,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        pendingAuthorActions,
        pendingAdminActions,
        daysInCurrentStage,
      };
    });

    return NextResponse.json({ projects: result });
  },
  { roles: ["ADMIN"] }
);
