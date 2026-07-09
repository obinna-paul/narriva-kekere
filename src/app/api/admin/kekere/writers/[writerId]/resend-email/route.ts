export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderPublishingAgreementEmail } from "@/lib/email/templates";
import { generateUnsignedContractPdf } from "@/lib/contracts/pdf";

export const POST = withAuth(async (_request, _session, { params }) => {
  const { writerId } = params as { writerId: string };

  const writer = await prisma.user.findUnique({
    where: { id: writerId },
    select: {
      id: true,
      name: true,
      email: true,
      accountStatus: true,
      claimToken: true,
    },
  });

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  if (writer.accountStatus !== "UNCLAIMED") {
    return NextResponse.json({ error: "Writer is already claimed" }, { status: 400 });
  }

  const pendingContract = await prisma.kekereContract.findFirst({
    where: { writerId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, body: true, story: { select: { title: true } } },
  });

  if (!pendingContract) {
    return NextResponse.json({ error: "No pending contract found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const claimUrl = writer.claimToken
    ? `${baseUrl}/kekere/claim/${writer.claimToken}`
    : null;

  const unsignedPdf = generateUnsignedContractPdf(pendingContract.body);
  const pdfAttachment = {
    filename: "kekere-publishing-agreement-unsigned.pdf",
    content: Buffer.from(unsignedPdf),
  };

  const storyTitle = pendingContract.story?.title ?? "your story";

  const agreementHtml = claimUrl
    ? await renderPublishingAgreementEmail({
        writerName: writer.name,
        storyTitle,
        claimUrl,
      }).catch(() => undefined)
    : undefined;

  await sendEmail({
    from: "Kekere Stories <submission@narriva.pro>",
    to: writer.email,
    subject: "Publishing agreement",
    body: `Hi ${writer.name},\n\nCongratulations — your story "${storyTitle}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nThe full publishing agreement is attached as a PDF. Take your time reading through it.\n\n${claimUrl ? `When you're ready, visit this link to review, sign, set up your account, and go live:\n${claimUrl}\n\n` : ""}Your story appears in the feed the moment you sign.\n\nWelcome to Kekere Stories.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
    html: agreementHtml,
    attachments: [pdfAttachment],
  });

  return NextResponse.json({ success: true });
}, { roles: ["ADMIN"] });
