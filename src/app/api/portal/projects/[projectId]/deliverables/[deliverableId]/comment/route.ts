export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { deliverableId } = params as { projectId: string; deliverableId: string };

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const commentBody = body.body?.trim();

  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  const deliverable = await prisma.projectDeliverable.findUnique({
    where: { id: deliverableId },
    include: { project: { select: { userId: true } } },
  });

  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  if (deliverable.project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.deliverableComment.create({
    data: {
      deliverableId,
      authorId: userId,
      authorRole: "Author",
      body: commentBody,
      isInternal: false,
    },
  });

  return NextResponse.json({
    success: true,
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    },
  });
});
