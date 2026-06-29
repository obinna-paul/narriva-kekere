import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { sendEmail } from "@/lib/email/send";
import {
  getSubmissionById,
  setReviewerNotes,
  updateSubmissionStage,
  updateSubmissionStatus,
} from "@/lib/data/submissions";

const STATUSES = ["RECEIVED", "READING", "REVIEWED", "ACCEPTED", "DECLINED"] as const;
const STAGES = ["SUBMITTED", "EDITORIAL", "DESIGN", "PRODUCTION", "LAUNCHED"] as const;

export const GET = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    const submission = await getSubmissionById(params.id);
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    return NextResponse.json({ submission });
  },
  { roles: ["ADMIN"] }
);

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  reviewerNotes: z.string().optional(),
  currentStage: z.enum(STAGES).optional(),
});

export const PATCH = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let submission = await getSubmissionById(params.id);
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (parsed.data.status) {
      await updateSubmissionStatus(params.id, parsed.data.status);
    }
    if (parsed.data.currentStage) {
      await updateSubmissionStage(params.id, parsed.data.currentStage);
    }
    if (parsed.data.reviewerNotes !== undefined) {
      await setReviewerNotes(params.id, parsed.data.reviewerNotes);
    }

    submission = await getSubmissionById(params.id);

    if (parsed.data.status === "DECLINED" && submission) {
      await sendEmail({
        to: submission.authorEmail,
        subject: `Update on your manuscript submission — ${submission.manuscriptTitle}`,
        body: `Hi ${submission.authorName},\n\nThank you for submitting "${submission.manuscriptTitle}" to Narriva. After careful review, we've decided not to move forward with this manuscript at this time.\n\n${parsed.data.reviewerNotes ? `Editor's note: ${parsed.data.reviewerNotes}` : "We wish you the best with your writing."}`,
      });
    }

    return NextResponse.json({ submission });
  },
  { roles: ["ADMIN"] }
);
