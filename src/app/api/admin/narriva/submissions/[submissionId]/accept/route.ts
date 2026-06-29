import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";

export const POST = withAuth(
  async (request, session, { params }) => {
    const { submissionId } = params as { submissionId: string };

    const submission = await prisma.narrivaSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Submission is already accepted" },
        { status: 400 }
      );
    }

    const authorProject = await prisma.$transaction(async (tx) => {
      await tx.narrivaSubmission.update({
        where: { id: submissionId },
        data: { status: "ACCEPTED", currentStage: "SUBMITTED" },
      });

      const project = await tx.authorProject.create({
        data: {
          submissionId,
          userId: submission.userId ?? session.user.id,
          bookTitle: submission.manuscriptTitle,
          currentStage: "ASSESSMENT",
          statusNote:
            "We've accepted your manuscript and we're getting started. Welcome to Narriva.",
        },
      });

      return project;
    });

    await sendEmail({
      to: submission.authorEmail,
      subject: `Your manuscript has been accepted — ${submission.manuscriptTitle}`,
      body: `Hi ${submission.authorName},\n\nWe've accepted your manuscript "${submission.manuscriptTitle}" for publication with Narriva. An editor has been assigned to your project and work will begin shortly.\n\nYou can track your book's progress in your author portal at narriva.com/portal.\n\nWelcome to Narriva.`,
    });

    return NextResponse.json({
      success: true,
      authorProjectId: authorProject.id,
    });
  },
  { roles: ["ADMIN"] }
);
