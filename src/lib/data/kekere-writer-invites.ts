import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderPublishingAgreementEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";
import { publicUrl } from "@/lib/urls";

const CLAIM_TOKEN_EXPIRY_DAYS = 120;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssueInviteResult =
  | { ok: true; actionUrl: string; emailed: boolean; isClaimLink: boolean; writerName: string }
  | { ok: false; error: string; status: number };

/**
 * Issues an invitation for an onboarded writer to sign their publishing
 * agreement, and — unless told not to — emails it to them.
 *
 * ## Why this is one function
 *
 * Claim tokens are stored hashed, so only ONE can ever be live: writing a new
 * hash silently kills every link issued before it, and there is no way to
 * recover an earlier raw token to re-send it. Three separate places used to
 * mint one — creating the writer, "Copy link" (which regenerated on every
 * single click), and "Send email" — with nothing tying them together.
 *
 * The result was a trap with no warning attached. Email the writer, then copy
 * the link to send on WhatsApp, and the copy silently invalidated the emailed
 * one. Whichever the writer clicked second told them the link was "invalid or
 * has already been used", and nothing on the admin's screen suggested why.
 *
 * So issuing is now a single operation that produces the token, the email and
 * the shareable URL together. Whatever the admin is holding is, by
 * construction, the same link that just landed in the writer's inbox.
 *
 * A writer who already has a real login gets no token at all — they're sent to
 * their in-app contracts page, plus a notification.
 */
export async function issueWriterInvite(params: {
  writerId: string;
  /** False for "give me a fresh link without emailing" — the deliberate,
   *  confirmed path in the admin UI, not something any click falls into. */
  sendInviteEmail?: boolean;
}): Promise<IssueInviteResult> {
  const { writerId, sendInviteEmail = true } = params;

  const writer = await prisma.user.findUnique({
    where: { id: writerId },
    select: { id: true, name: true, email: true, accountStatus: true },
  });
  if (!writer) return { ok: false, error: "Writer not found", status: 404 };

  const pendingContract = await prisma.kekereContract.findFirst({
    where: { writerId, status: "PENDING" },
    orderBy: { sentAt: "desc" },
    select: { id: true, story: { select: { title: true } } },
  });

  const isClaimLink = writer.accountStatus === "UNCLAIMED";

  // Emailing is what needs a contract to point at. Minting a link for an
  // unclaimed writer before their story is authored is legitimate — that's
  // the account-setup link — so only the email path requires one.
  if (sendInviteEmail && !pendingContract) {
    return {
      ok: false,
      error: "No pending contract to send. Author a story for this writer first.",
      status: 404,
    };
  }

  let actionUrl: string;
  if (isClaimLink) {
    const rawToken = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: writerId },
      data: {
        claimToken: hashToken(rawToken),
        claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_EXPIRY_DAYS * 86400000),
      },
    });
    actionUrl = publicUrl(`/kekere/claim/${rawToken}`);
  } else {
    // They already have a password; there's nothing to claim. Send them to
    // the contract itself and surface it in-app as well.
    actionUrl = publicUrl("/kekere/contracts");
  }

  if (!sendInviteEmail) {
    return { ok: true, actionUrl, emailed: false, isClaimLink, writerName: writer.name };
  }

  const storyTitle = pendingContract?.story?.title ?? "your story";

  if (!isClaimLink) {
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

  return { ok: true, actionUrl, emailed: true, isClaimLink, writerName: writer.name };
}
