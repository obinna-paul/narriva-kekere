export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { projectId } = params as { projectId: string };

  const project = await prisma.authorProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.projectMessage.findMany({
    where: { projectId, isInternal: false },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      authorId: m.authorId,
      authorName: m.author.name,
      authorRole: m.authorRole,
      body: m.body,
      isPinned: m.isPinned,
      pinnedLabel: m.pinnedLabel,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

export const POST = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { projectId } = params as { projectId: string };

  const project = await prisma.authorProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messageBody = body.body?.trim();

  if (!messageBody) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  const message = await prisma.projectMessage.create({
    data: {
      projectId,
      authorId: userId,
      authorRole: "Author",
      body: messageBody,
      isInternal: false,
    },
  });

  return NextResponse.json({
    success: true,
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    },
  });
});
