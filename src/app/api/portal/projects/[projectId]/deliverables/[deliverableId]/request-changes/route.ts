import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { deliverableId } = params as { projectId: string; deliverableId: string };

  let body: { feedback?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const feedback = body.feedback?.trim();

  if (!feedback || feedback.length < 10) {
    return NextResponse.json(
      { error: "Feedback is required and must be at least 10 characters." },
      { status: 400 }
    );
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

  if (deliverable.status !== "FOR_REVIEW") {
    return NextResponse.json({ error: "not_for_review" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: { status: "CHANGES_REQUESTED" },
    }),
    prisma.deliverableComment.create({
      data: {
        deliverableId,
        authorId: userId,
        authorRole: "Author",
        body: feedback,
        isInternal: false,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
});
