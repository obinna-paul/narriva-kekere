import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const POST = withAuth(async (request, session, { params }) => {
  const userId = session.user.id;
  const { deliverableId } = params as { projectId: string; deliverableId: string };

  const deliverable = await prisma.projectDeliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: { select: { userId: true, bookTitle: true } },
    },
  });

  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  if (deliverable.project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (deliverable.status === "APPROVED") {
    return NextResponse.json({ error: "already_approved" }, { status: 400 });
  }

  if (deliverable.status !== "FOR_REVIEW") {
    return NextResponse.json({ error: "not_for_review" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: { status: "APPROVED" },
    }),
    prisma.deliverableComment.create({
      data: {
        deliverableId,
        authorId: userId,
        authorRole: "Author",
        body: "Approved this version.",
        isInternal: false,
        isKeyDecision: true,
      },
    }),
  ]);

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `Author approved a deliverable — ${deliverable.project.bookTitle}`,
    body: `Deliverable: ${deliverable.label}\nProject: ${deliverable.project.bookTitle}\nAuthor approved this version. Log in to the admin panel to review.`,
  });

  return NextResponse.json({ success: true });
});
