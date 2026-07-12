export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isValidTiptapDoc, ensureParagraphIds, countWords } from "@/lib/tiptap/doc-utils";
import { createPublishingContract } from "@/lib/data/kekere-contracts";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/send";
import { renderPublishingAgreementEmail } from "@/lib/email/templates";
import { buildUnsignedAgreementAttachment } from "@/lib/contracts/agreement-attachment";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";

const CLAIM_TOKEN_EXPIRY_DAYS = 120;

const schema = z.object({
  title: z.string().min(1).max(200),
  hookLine: z.string().min(1).max(300),
  body: z.record(z.string(), z.unknown()),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]),
  cowrieCost: z.number().int().min(1).max(10),
  genre: z.string().min(1),
  coverColor: z.string().default("#C75D2C"),
  coverImageRef: z.string().optional(),
  tagIds: z.array(z.string()).min(1, "Select at least one category"),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
    select: { id: true, name: true, email: true, accountStatus: true },
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

  // Two onboarding paths depending on whether this writer already has a real
  // account:
  //   UNCLAIMED (placeholder we created): they need to set a password, so we
  //     mint a claim token and email them a claim link that sets the password
  //     and signs in one step.
  //   CLAIMED (a writer who already signed up): they must NOT be sent a
  //     password-setting link (it would reset the password they already have,
  //     and the claim page only accepts UNCLAIMED accounts anyway). Instead
  //     the contract simply waits in their account \u2014 they log in, open their
  //     contracts, and sign in-app. We still email them (with the agreement
  //     PDF) and drop an in-app notification so they know to sign.
  const isPlaceholder = writer.accountStatus === "UNCLAIMED";

  const rawToken = isPlaceholder ? randomBytes(32).toString("hex") : null;
  const claimExpiresAt = isPlaceholder
    ? new Date(Date.now() + CLAIM_TOKEN_EXPIRY_DAYS * 86400000)
    : null;

  let result: { storyId: string; contractId: string; contractBody: string };
  try {
    result = await prisma.$transaction(async (tx) => {
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

      if (isPlaceholder && rawToken) {
        await tx.user.update({
          where: { id: writerId },
          data: {
            claimToken: hashToken(rawToken),
            claimTokenExpiresAt: claimExpiresAt,
          },
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
  } catch (err) {
    // Surface a real reason instead of an opaque 500 → "unknown error" in the
    // admin UI. Nothing was committed (single transaction), so it's safe to
    // let the admin retry.
    console.error("Failed to create admin-authored story:", err);
    const message =
      err instanceof Error && /template/i.test(err.message)
        ? "No publishing contract template found. Seed the publishing template first."
        : "Couldn't create the story. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://narriva.pro";

  // The story + contract are already committed above. Everything below
  // (building the PDF, sending the email, the notification) is best-effort:
  // a failure here must NOT surface as an error, or the admin would think
  // authoring failed and re-submit, creating a duplicate story. Worst case
  // the writer doesn't get the email and the admin uses "Resend".
  let emailSent = false;
  try {
    const attachment = await buildUnsignedAgreementAttachment(result.contractBody);
    const attachments = attachment ? [attachment] : undefined;

    if (isPlaceholder && rawToken) {
      // New account \u2014 claim link sets the password and signs in one step.
      const claimUrl = `${baseUrl}/kekere/claim/${rawToken}`;
      const agreementHtml = await renderPublishingAgreementEmail({
        writerName: writer.name,
        storyTitle: title,
        claimUrl,
      }).catch(() => undefined);

      await sendEmail({
        from: KEKERE_SUBMISSIONS_FROM,
        to: writer.email,
        subject: "Publishing agreement",
        body: `Hi ${writer.name},\n\nCongratulations \u2014 your story "${title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nThe full publishing agreement is attached. Take your time reading through it.\n\nWhen you're ready, visit this link to review, sign, set up your account, and go live:\n${claimUrl}\n\nYour story appears in the feed the moment you sign.\n\nWelcome to Kekere Stories.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
        html: agreementHtml,
        attachments,
      });
    } else {
      // Existing account \u2014 contract waits in the app. No password link; they
      // log in and sign from their contracts. Email + in-app notification
      // let them know it's there.
      const contractsUrl = `${baseUrl}/kekere/contracts`;
      await sendEmail({
        from: KEKERE_SUBMISSIONS_FROM,
        to: writer.email,
        subject: "Publishing agreement",
        body: `Hi ${writer.name},\n\nCongratulations \u2014 your story "${title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nThe full publishing agreement is attached. Take your time reading through it.\n\nA publishing contract is now waiting in your account. Log in, open your contracts, and sign it \u2014 your story appears in the feed the moment you sign:\n${contractsUrl}\n\nThank you,\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
        attachments,
      });

      await createNotification({
        userId: writerId,
        type: "CONTRACT_RECEIVED",
        title: `Publishing contract for "${title}"`,
        body: "Your story has been accepted! Tap to review and sign your publishing contract \u2014 it goes live the moment you sign.",
        link: "/kekere/contracts",
      });
    }
    emailSent = true;
  } catch (err) {
    console.error("Story created but the agreement email/notification failed:", err);
  }

  return NextResponse.json({
    success: true,
    emailSent,
    storyId: result.storyId,
    contractId: result.contractId,
    writerName: writer.name,
    accountStatus: writer.accountStatus,
  }, { status: 201 });
}, { roles: ["ADMIN"] });
