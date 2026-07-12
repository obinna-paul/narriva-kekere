export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderPublishingAgreementEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";

const CLAIM_TOKEN_EXPIRY_DAYS = 120;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The "Send email" action from the Onboarded Writers list. Authoring a story
 * no longer emails anyone — the admin sends the publishing-agreement email
 * from here, deliberately, once the story is saved. The email carries NO
 * attachment: it's purely a call to open the app, read the agreement, and
 * sign. The writer only receives a copy of the (signed) contract later, on
 * the "your story is live" email.
 */
export const POST = withAuth(async (_request, _session, { params }) => {
  const { writerId } = params as { writerId: string };

  const writer = await prisma.user.findUnique({
    where: { id: writerId },
    select: { id: true, name: true, email: true, accountStatus: true },
  });

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  const pendingContract = await prisma.kekereContract.findFirst({
    where: { writerId, status: "PENDING" },
    orderBy: { sentAt: "desc" },
    select: { id: true, story: { select: { title: true } } },
  });

  if (!pendingContract) {
    return NextResponse.json(
      { error: "No pending contract to send. Author a story for this writer first." },
      { status: 404 },
    );
  }

  const storyTitle = pendingContract.story?.title ?? "your story";
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";
  const isPlaceholder = writer.accountStatus === "UNCLAIMED";

  // New account → link is a claim link that lets them set a password and sign.
  // Existing account → link is their in-app contracts page (they already have
  // a login), plus an in-app notification so they see it inside the app.
  let actionUrl: string;
  if (isPlaceholder) {
    const rawToken = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: writerId },
      data: {
        claimToken: hashToken(rawToken),
        claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_EXPIRY_DAYS * 86400000),
      },
    });
    actionUrl = `${baseUrl}/kekere/claim/${rawToken}`;
  } else {
    actionUrl = `${baseUrl}/kekere/contracts`;
    await createNotification({
      userId: writerId,
      type: "CONTRACT_RECEIVED",
      title: `Publishing contract for "${storyTitle}"`,
      body: "Your story has been accepted! Tap to review and sign your publishing contract — it goes live the moment you sign.",
      link: "/kekere/contracts",
    });
  }

  const agreementHtml = await renderPublishingAgreementEmail({
    writerName: writer.name,
    storyTitle,
    claimUrl: actionUrl,
  }).catch(() => undefined);

  await sendEmail({
    from: KEKERE_SUBMISSIONS_FROM,
    to: writer.email,
    subject: "Publishing agreement",
    // No attachment — the agreement is read in the app; a copy is sent only
    // once they've signed and the story is live.
    body: `Hi ${writer.name},\n\nCongratulations — your story "${storyTitle}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nOpen Kekere Stories to review your publishing agreement and sign it — your story appears in the feed the moment you sign:\n${actionUrl}\n\nThank you,\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
    html: agreementHtml,
  });

  return NextResponse.json({ success: true });
}, { roles: ["ADMIN"] });
