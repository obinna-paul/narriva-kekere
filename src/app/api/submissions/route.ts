export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentSession, withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { createSubmission, listSubmissions } from "@/lib/data/submissions";
import { manuscriptFileSchema, submissionFormSchema } from "@/lib/validation/submissions";
import { uploadManuscript } from "@/lib/storage/r2";
import { sendEmail } from "@/lib/email/send";
import { getFeatureFlag } from "@/lib/settings/get";
import type { NarrivaSubmissionStatus } from "@prisma/client";

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") as NarrivaSubmissionStatus | null) ?? undefined;
    const submissions = await listSubmissions({ status });
    return NextResponse.json({ submissions });
  },
  { roles: ["ADMIN"] }
);

export async function POST(request: Request) {
  const submissionsEnabled = await getFeatureFlag("manuscript_submissions", true);
  if (!submissionsEnabled) {
    return NextResponse.json(
      { error: "manuscript_submissions_disabled", message: "This feature is temporarily unavailable." },
      { status: 403 },
    );
  }

  const formData = await request.formData();

  const fields = {
    authorName: formData.get("authorName"),
    authorEmail: formData.get("authorEmail"),
    manuscriptTitle: formData.get("manuscriptTitle"),
    synopsis: formData.get("synopsis"),
    targetAudience: formData.get("targetAudience"),
    genre: formData.get("genre"),
    manuscriptStage: formData.get("manuscriptStage"),
    supportNeeded: formData.getAll("supportNeeded"),
    guidelinesAccepted: formData.get("guidelinesAccepted") === "true",
  };

  const parsedFields = submissionFormSchema.safeParse(fields);
  if (!parsedFields.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsedFields.error.flatten() },
      { status: 400 }
    );
  }

  const fileEntry = formData.get("manuscript");
  const parsedFile = manuscriptFileSchema.safeParse(fileEntry);
  if (!parsedFile.success) {
    return NextResponse.json(
      { error: "Invalid manuscript file", details: parsedFile.error.flatten() },
      { status: 400 }
    );
  }

  const session = await getCurrentSession();
  const file = parsedFile.data;
  const buffer = Buffer.from(await file.arrayBuffer());

  let manuscriptRef: string;
  try {
    manuscriptRef = await uploadManuscript(buffer, file.name, file.type);
  } catch (error) {
    console.error("Manuscript upload to R2 failed:", error);
    return NextResponse.json(
      { error: "Couldn't upload the manuscript. Please try again." },
      { status: 502 }
    );
  }

  const { authorName, authorEmail, manuscriptTitle, synopsis, targetAudience, genre, manuscriptStage, supportNeeded } =
    parsedFields.data;

  const submission = await createSubmission({
    authorName,
    authorEmail,
    userId: session?.user?.id,
    manuscriptTitle,
    manuscriptRef,
    synopsis,
    targetAudience,
    genre,
    manuscriptStage,
    supportNeeded,
  });

  // Guest submissions aren't auto-linked if the same email later registers
  // an account — see the linkSubmissionToUser TODO in src/lib/data/submissions.ts
  // for the manual admin path used until that's built.
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { termsAcceptedAt: new Date() },
    });
  }

  await sendEmail({
    to: authorEmail,
    subject: "We've received your manuscript",
    body: `Hi ${authorName}, thanks for submitting "${manuscriptTitle}" to Narriva. An editor will read the whole thing — we'll be in touch.`,
  });

  return NextResponse.json({ submission }, { status: 201 });
}
