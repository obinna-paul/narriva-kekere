export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const tasks = await prisma.projectTask.findMany({
      where: { status: { not: "COMPLETE" } },
      include: {
        project: { select: { bookTitle: true } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        bookTitle: t.project.bookTitle,
        title: t.title,
        description: t.description,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate?.toISOString() ?? null,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] }
);
