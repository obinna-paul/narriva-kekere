export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { generateSignedContractPdf } from "@/lib/contracts/pdf";
import { getPortalFileDownloadUrl, uploadPortalFile } from "@/lib/storage/r2";
import { sendEmail } from "@/lib/email/send";
import { renderContractSignedEmail } from "@/lib/email/templates";
import { SUPPORT_EMAIL } from "@/lib/constants";

const signSchema = z.object({
  signedName: z.string().min(1, "Signed name is required."),
});

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const POST = withAuth(async (request, session, { params }) => {
  const writerId = session.user.id;
  const { id } = params as { id: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { signedName } = parsed.data;

  const contract = await prisma.kekereContract.findUnique({
    where: { id },
    include: {
      template: { select: { contractType: true } },
      writer: { select: { name: true, email: true } },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.writerId !== writerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (contract.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending contracts can be signed." },
      { status: 400 },
    );
  }

  const now = Date.now();
  if (contract.expiresAt && contract.expiresAt.getTime() < now) {
    await prisma.kekereContract.update({
      where: { id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({ error: "contract_expired" }, { status: 400 });
  }

  const signedAt = new Date();
  const signerIp = getClientIp(request);

  // Always generate PDF for email attachment
  let pdfBuffer: Buffer | null = null;
  let pdfRef: string | null = null;
  try {
    const pdfBytes = await generateSignedContractPdf(
      contract.body,
      signedName,
      signedAt,
      signerIp,
    );
    pdfBuffer = Buffer.from(pdfBytes);

    // Try to upload to R2 for download link (optional)
    const r2Ready = !!(
      process.env.CLOUDFLARE_R2_ENDPOINT &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET
    );
    if (r2Ready) {
      try {
        pdfRef = await uploadPortalFile(pdfBuffer, `contract-${id}.pdf`, "application/pdf");
      } catch (err) {
        console.error("R2 upload failed (non-blocking):", err);
      }
    }
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate contract PDF" },
      { status: 500 }
    );
  }

  await prisma.kekereContract.update({
    where: { id },
    data: {
      status: "SIGNED",
      signedName,
      signedAt,
      signerIp,
      ...(pdfRef ? { signedPdfRef: pdfRef } : {}),
    },
  });

  // If the contract is linked to a PENDING_CONTRACT story, publish it now.
  // storyId was added via db push; cast until `prisma generate` runs on restart.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkedStoryId: string | null = (contract as any).storyId ?? null;
  if (linkedStoryId) {
    await prisma.story.updateMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { id: linkedStoryId, status: "PENDING_CONTRACT" as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { status: "PUBLISHED" as any, isDraft: false, publishedAt: signedAt },
    });
  }

  const downloadUrl = pdfRef ? await getPortalFileDownloadUrl(pdfRef).catch(() => null) : null;

  // Fetch story title for the email if this contract is linked to a story
  let storyTitle = "your story";
  if (linkedStoryId) {
    const story = await prisma.story.findUnique({ where: { id: linkedStoryId }, select: { title: true } });
    if (story) storyTitle = story.title;
  }

  const signedDateStr = signedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const storyUrl = linkedStoryId
    ? `${baseUrl}/kekere/story/${linkedStoryId}`
    : `${baseUrl}/kekere`;

  const signedHtml = linkedStoryId
    ? await renderContractSignedEmail({
        writerName: contract.writer.name,
        storyTitle,
        signedAt: signedDateStr,
        storyUrl,
      }).catch(() => undefined)
    : undefined;

  await sendEmail({
    to: contract.writer.email,
    subject: linkedStoryId
      ? `Your story is live — "${storyTitle}" is now on Kekere Stories`
      : "Your contract is signed",
    body: linkedStoryId
      ? `Hi ${contract.writer.name},\n\nYour publishing contract has been signed and "${storyTitle}" is now live on Kekere Stories. Readers can find and unlock it right now.\n\nSee it here: ${storyUrl}\n\nThank you for publishing with Kekere Stories.\n\nThe Kekere Stories Team`
      : `Hi ${contract.writer.name},\n\nYour contract has been signed.\n\nThe Kekere Stories Team`,
    html: signedHtml,
    ...(pdfBuffer ? { attachments: [{ filename: `kekere-publishing-agreement-${contract.id}.pdf`, content: pdfBuffer }] } : {}),
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${contract.writer.name} has signed a ${contract.template.contractType} contract`,
    body: `Writer: ${contract.writer.name} (${contract.writer.email})\nContract type: ${contract.template.contractType}\nSigned at: ${signedAt.toISOString()}${contract.storyId ? `\nStory ID: ${contract.storyId} — now published` : ""}`,
  });

  return NextResponse.json({ success: true, downloadUrl });
});
