export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { ProjectTaskStatus } from "@prisma/client";

const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETE"] as const;

const statusSchema = z.object({
  status: z.enum(STATUSES),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { taskId } = params as { taskId: string };

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data: { status: parsed.data.status as ProjectTaskStatus },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  },
  { roles: ["ADMIN"] }
);
