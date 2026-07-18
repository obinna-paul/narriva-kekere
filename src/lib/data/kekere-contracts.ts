import { prisma } from "@/lib/db/prisma";
import { renderContractBody } from "@/lib/contracts/render";
import { generateSignedContractPdf } from "@/lib/contracts/pdf";
import { generateSignedContractDocx } from "@/lib/contracts/docx";
import { sendEmail } from "@/lib/email/send";
import { renderContractSignedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { notifyFollowersOfPublish } from "@/lib/data/kekere-follows";
import { uploadPortalFile } from "@/lib/storage/r2";
import { SUPPORT_EMAIL, KEKERE_SUBMISSIONS_EMAIL, KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

export interface CreateContractParams {
  storyId: string;
  writerId: string;
  storyTitle: string;
  writerName: string;
  cowrieCost: number;
  genre: string;
  expiresInDays?: number;
}

export async function createPublishingContract(
  params: CreateContractParams,
  tx?: Prisma.TransactionClient,
): Promise<{ contractId: string; contractBody: string; expiresAt: Date }> {
  const db = tx ?? prisma;
  const { storyId, writerId, storyTitle, writerName, cowrieCost, genre, expiresInDays = 14 } = params;

  const template = await db.kekereContractTemplate.findFirst({
    where: { contractType: "PUBLISHING" },
    orderBy: { createdAt: "desc" },
  });

  if (!template) {
    throw new Error("No publishing contract template found. Run the seed first.");
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const rendered = renderContractBody(template.body, {
    story_title: storyTitle,
    writer_name: writerName,
    cowrie_cost: String(cowrieCost),
    genre,
    date: dateStr,
  }, template.variables);

  if (rendered.missing) {
    throw new Error(`Contract template missing variables: ${rendered.missing.join(", ")}`);
  }

  const expiresAt = new Date(now.getTime() + expiresInDays * 86400000);

  const contract = await db.kekereContract.create({
    data: {
      templateId: template.id,
      writerId,
      storyId,
      body: rendered.rendered!,
      status: "PENDING",
      expiresAt,
      sentAt: now,
    },
  });

  return { contractId: contract.id, contractBody: rendered.rendered!, expiresAt };
}

export interface SignContractParams {
  contractId: string;
  signedName: string;
  signerIp?: string;
}

export async function signContractAndPublishStory(
  params: SignContractParams,
): Promise<{ storyId: string | null; signedPdfBuffer: Buffer | null; pdfFilename: string | null }> {
  const { contractId, signedName, signerIp = "unknown" } = params;

  const contract = await prisma.kekereContract.findUnique({
    where: { id: contractId },
    include: {
      template: { select: { contractType: true } },
      writer: { select: { name: true, email: true } },
    },
  });

  if (!contract) throw new Error("Contract not found");
  if (contract.status !== "PENDING") throw new Error("Only pending contracts can be signed");

  const now = Date.now();
  if (contract.expiresAt && contract.expiresAt.getTime() < now) {
    await prisma.kekereContract.update({
      where: { id: contractId },
      data: { status: "EXPIRED" },
    });
    throw new Error("Contract has expired");
  }

  const signedAt = new Date();

  let pdfBuffer: Buffer | null = null;
  let pdfRef: string | null = null;
  let attachmentBuffer: Buffer | null = null;
  let attachmentFilename: string | null = null;

  try {
    const pdfBytes = await generateSignedContractPdf(contract.body, signedName, signedAt, signerIp);
    pdfBuffer = Buffer.from(pdfBytes);
    attachmentBuffer = pdfBuffer;
    attachmentFilename = `kekere-publishing-agreement-${contract.id}.pdf`;

    const r2Ready = !!(
      process.env.CLOUDFLARE_R2_ENDPOINT &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET
    );
    if (r2Ready) {
      try {
        pdfRef = await uploadPortalFile(pdfBuffer, `contract-${contractId}.pdf`, "application/pdf");
      } catch (err) {
        console.error("R2 upload failed (non-blocking):", err);
      }
    }
  } catch (err) {
    console.error("PDF generation failed for contract", contractId, "\u2014 falling back to .docx:", err);
    try {
      attachmentBuffer = await generateSignedContractDocx(contract.body, signedName, signedAt, signerIp);
      attachmentFilename = `kekere-publishing-agreement-${contract.id}.docx`;
    } catch (docxErr) {
      console.error("DOCX fallback also failed for contract", contractId, ":", docxErr);
    }
  }

  const linkedStoryId = contract.storyId;

  await prisma.$transaction(async (tx) => {
    await tx.kekereContract.update({
      where: { id: contractId },
      data: {
        status: "SIGNED",
        signedName,
        signedAt,
        signerIp,
        ...(pdfRef ? { signedPdfRef: pdfRef } : {}),
      },
    });

    if (linkedStoryId) {
      await tx.story.updateMany({
        where: { id: linkedStoryId, status: "PENDING_CONTRACT" },
        data: { status: "PUBLISHED", isDraft: false, publishedAt: signedAt },
      });
    }
  });

  if (linkedStoryId) {
    notifyFollowersOfPublish(linkedStoryId).catch(console.error);
  }

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
        pdfAttached: !!attachmentBuffer,
      }).catch(() => undefined)
    : undefined;

  await sendEmail({
    from: KEKERE_SUBMISSIONS_FROM,
    to: contract.writer.email,
    subject: linkedStoryId
      ? `Your story is live — "${storyTitle}" is now on Kekere Stories`
      : "Your contract is signed",
    body: linkedStoryId
      ? `Hi ${contract.writer.name},\n\nYour publishing contract has been signed and "${storyTitle}" is now live on Kekere Stories. Readers can find and unlock it right now.\n\nSee it here: ${storyUrl}\n\nThank you for publishing with Kekere Stories.\n\nThe Kekere Stories Team`
      : `Hi ${contract.writer.name},\n\nYour contract has been signed.\n\nThe Kekere Stories Team`,
    html: signedHtml,
    ...(attachmentBuffer && attachmentFilename
      ? { attachments: [{ filename: attachmentFilename, content: attachmentBuffer }] }
      : {}),
  });

  await createNotification({
    userId: contract.writerId,
    type: "STORY_APPROVED",
    title: linkedStoryId ? `"${storyTitle}" is now live!` : "Contract signed",
    body: linkedStoryId
      ? "Your story is now live on Kekere Stories. Readers can find and unlock it right now."
      : "Your contract has been signed.",
    link: linkedStoryId ? `/kekere/story/${linkedStoryId}` : "/kekere/contracts",
  });

  return { storyId: linkedStoryId, signedPdfBuffer: pdfBuffer, pdfFilename: attachmentFilename };
}

/**
 * Declines a pending contract — notifies the internal team and sends the
 * writer the same warm "sorry to see it go" note regardless of which flow
 * triggered the decline (the in-app contracts inbox for an already-claimed
 * writer, or the pre-launch claim-link page for one who never signed up).
 */
export async function declineContract(
  contractId: string,
  reason?: string,
): Promise<{ success: true } | { error: "not_found" | "not_pending" }> {
  const contract = await prisma.kekereContract.findUnique({
    where: { id: contractId },
    include: {
      template: { select: { contractType: true } },
      writer: { select: { name: true, email: true } },
      story: { select: { title: true } },
    },
  });

  if (!contract) return { error: "not_found" };
  if (contract.status !== "PENDING") return { error: "not_pending" };

  const now = new Date();

  await prisma.kekereContract.update({
    where: { id: contractId },
    data: {
      status: "DECLINED",
      declinedAt: now,
      declineReason: reason?.trim() || null,
    },
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${contract.writer.name} declined a ${contract.template.contractType} contract`,
    body: `Writer: ${contract.writer.name} (${contract.writer.email})\nContract type: ${contract.template.contractType}\nDeclined at: ${now.toISOString()}\nReason: ${reason?.trim() || "Not provided"}`,
  });

  // A warmer note than a dry "you have declined…" — this is an emotional
  // moment for a writer, so it reads like a person wrote it (plain text, no
  // bulk-mail template) and leaves the door wide open without any pressure.
  const storyLabel = contract.story?.title ? `“${contract.story.title}”` : "your story";
  await sendEmail({
    from: KEKERE_SUBMISSIONS_FROM,
    to: contract.writer.email,
    subject: `Sorry to see ${storyLabel} go`,
    body: `Hi ${contract.writer.name},\n\nAh — we were quietly hoping you'd say yes. You've declined the publishing agreement for ${storyLabel}, and that's completely your call. Your story, your rights, always.\n\nWe'll be honest: we're a little sad about it. We don't send an agreement for a story we aren't genuinely excited about, so ${storyLabel} slipping away stings just a bit on our end.\n\nBut there's zero pressure here. If you tapped decline by mistake, if you'd like to talk anything through, or if you simply change your mind next week, next month, or next year — we're one email away at ${KEKERE_SUBMISSIONS_EMAIL}. The door stays wide open.\n\nAnd if this is where we part ways for now: thank you for trusting us with your work long enough to consider it. Please keep writing. Stories like yours are exactly why Kekere exists.\n\nWarmly,\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
  });

  return { success: true };
}
