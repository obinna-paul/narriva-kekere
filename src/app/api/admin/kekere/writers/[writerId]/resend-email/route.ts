export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderPublishingAgreementEmail } from "@/lib/email/templates";
import { buildUnsignedAgreementAttachment } from "@/lib/contracts/agreement-attachment";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";

const CLAIM_TOKEN_EXPIRY_DAYS = 120;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const POST = withAuth(async (_request, _session, { params }) => {
  const { writerId } = params as { writerId: string };

  const writer = await prisma.user.findUnique({
    where: { id: writerId },
    select: { id: true, name: true, email: true, accountStatus: true },
  });

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  if (writer.accountStatus !== "UNCLAIMED") {
    return NextResponse.json({ error: "Writer is already claimed" }, { status: 400 });
  }

  const pendingContract = await prisma.kekereContract.findFirst({
    where: { writerId, status: "PENDING" },
    orderBy: { sentAt: "desc" },
    select: { id: true, body: true, story: { select: { title: true } } },
  });

  if (!pendingContract) {
    return NextResponse.json({ error: "No pending contract found" }, { status: 404 });
  }

  const rawToken = randomBytes(32).toString("hex");
  const newTokenHash = hashToken(rawToken);
  const claimExpiresAt = new Date(Date.now() + CLAIM_TOKEN_EXPIRY_DAYS * 86400000);

  await prisma.user.update({
    where: { id: writerId },
    data: {
      claimToken: newTokenHash,
      claimTokenExpiresAt: claimExpiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const claimUrl = `${baseUrl}/kekere/claim/${rawToken}`;

  const attachment = await buildUnsignedAgreementAttachment(pendingContract.body);

  const storyTitle = pendingContract.story?.title ?? "your story";

  const agreementHtml = await renderPublishingAgreementEmail({
    writerName: writer.name,
    storyTitle,
    claimUrl,
  }).catch(() => undefined);

  await sendEmail({
    from: KEKERE_SUBMISSIONS_FROM,
    to: writer.email,
    subject: "Publishing agreement",
    body: `Hi ${writer.name},\n\nCongratulations \u2014 your story "${storyTitle}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nThe full publishing agreement is attached. Take your time reading through it.\n\nWhen you're ready, visit this link to review, sign, set up your account, and go live:\n${claimUrl}\n\nYour story appears in the feed the moment you sign.\n\nWelcome to Kekere Stories.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
    html: agreementHtml,
    attachments: attachment ? [attachment] : undefined,
  });

  return NextResponse.json({ success: true });
}, { roles: ["ADMIN"] });
