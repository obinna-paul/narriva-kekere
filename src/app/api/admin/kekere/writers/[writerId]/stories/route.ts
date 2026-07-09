export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isValidTiptapDoc, ensureParagraphIds, countWords } from "@/lib/tiptap/doc-utils";
import { createPublishingContract } from "@/lib/data/kekere-contracts";
import { sendEmail } from "@/lib/email/send";
import { renderPublishingAgreementEmail } from "@/lib/email/templates";
import { generateUnsignedContractPdf } from "@/lib/contracts/pdf";

const schema = z.object({
  title: z.string().min(1).max(200),
  hookLine: z.string().min(1).max(300),
  body: z.record(z.unknown()),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]),
  cowrieCost: z.number().int().min(1).max(10),
  genre: z.string().min(1),
  coverColor: z.string().default("#C75D2C"),
  coverImageRef: z.string().optional(),
  tagIds: z.array(z.string()).min(1, "Select at least one category"),
});

export const POST = withAuth(async (request, session, { params }) => {
  const { writerId } = params as { writerId: string };
  const adminId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, hookLine, body: tiptapDoc, tier, cowrieCost, genre, coverColor, coverImageRef, tagIds } = parsed.data;

  const writer = await prisma.user.findUnique({
    where: { id: writerId },
    select: { id: true, name: true, email: true, accountStatus: true, claimToken: true, claimTokenExpiresAt: true },
  });

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  if (!isValidTiptapDoc(tiptapDoc)) {
    return NextResponse.json({ error: "Invalid story content format" }, { status: 400 });
  }

  const bodyWithIds = ensureParagraphIds(tiptapDoc);
  const wordCount = countWords(bodyWithIds);
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const { contractId, contractBody } = await prisma.$transaction(async (tx) => {
    const story = await tx.story.create({
      data: {
        authorId: writerId,
        title,
        hookLine,
        body: bodyWithIds as never,
        wordCount,
        readingTime,
        genre,
        coverColor,
        coverImageRef: coverImageRef ?? null,
        tier,
        cowrieCost,
        status: "PENDING_CONTRACT",
        isDraft: false,
        sourceType: "ADMIN_AUTHORED",
        authoredByAdminId: adminId,
      },
    });

    if (tagIds.length > 0) {
      await tx.storyTag.createMany({
        data: tagIds.map((tagId) => ({ storyId: story.id, tagId })),
        skipDuplicates: true,
      });
    }

    const contract = await createPublishingContract({
      storyId: story.id,
      writerId,
      storyTitle: title,
      writerName: writer.name,
      cowrieCost,
      genre,
    }, tx);

    return { storyId: story.id, contractId: contract.contractId, contractBody: contract.contractBody };
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const claimUrl = writer.claimToken
    ? `${baseUrl}/kekere/claim/${writer.claimToken}` : null;

  const unsignedPdf = generateUnsignedContractPdf(contractBody);
  const pdfAttachment = {
    filename: `kekere-publishing-agreement-unsigned.pdf`,
    content: Buffer.from(unsignedPdf),
  };

  const agreementHtml = claimUrl
    ? await renderPublishingAgreementEmail({
        writerName: writer.name,
        storyTitle: title,
        claimUrl,
      }).catch(() => undefined)
    : undefined;

  await sendEmail({
    from: "Kekere Stories <submission@narriva.pro>",
    to: writer.email,
    subject: "Publishing agreement",
    body: `Hi ${writer.name},\n\nCongratulations — your story "${title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nThe full publishing agreement is attached as a PDF. Take your time reading through it.\n\n${claimUrl ? `When you're ready, visit this link to review, sign, set up your account, and go live:\n${claimUrl}\n\n` : ""}Your story appears in the feed the moment you sign.\n\nWelcome to Kekere Stories.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
    html: agreementHtml,
    attachments: [pdfAttachment],
  });

  return NextResponse.json({
    success: true,
    storyId: contractId,
    contractId,
    writerName: writer.name,
  }, { status: 201 });
}, { roles: ["ADMIN"] });
