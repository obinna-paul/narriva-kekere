export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(
  async (request, _session, { params }) => {
    const { projectId } = params as { projectId: string };

    const project = await prisma.authorProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let body: {
      title?: string;
      description?: string;
      assignedTo?: string;
      dueDate?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!body.assignedTo || typeof body.assignedTo !== "string" || !body.assignedTo.trim()) {
      return NextResponse.json(
        { error: "assignedTo is required." },
        { status: 400 }
      );
    }

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title,
        description: body.description?.trim() ?? null,
        assignedTo: body.assignedTo.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate?.toISOString() ?? null,
        status: task.status,
      },
    });
  },
  { roles: ["ADMIN"] }
);
