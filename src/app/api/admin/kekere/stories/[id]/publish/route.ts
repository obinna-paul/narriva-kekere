export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderStoryAcceptedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";
import { renderContractBody } from "@/lib/contracts/render";
import { Prisma } from "@prisma/client";

const publishSchema = z.object({
  cowrieCost: z.number().int().min(1).max(10),
  tier: z.enum(["STANDARD", "FEATURED", "CHAMPION"]),
  tagIds: z.array(z.string()).min(1, "Select at least one tag").max(2, "Select at most two tags"),
  /** Versioned Cloudinary ref — if omitted the existing coverImageRef is kept */
  coverImageRef: z.string().optional(),
  expiresInDays: z.number().int().min(3).max(60).default(14),
  /** Gates the reader behind an 18+ interstitial and shows the mature-content
   * badge everywhere the story is listed. Omitted means "leave as-is." */
  isAdult: z.boolean().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { cowrieCost, tier, tagIds, coverImageRef, expiresInDays, isAdult } = parsed.data;

    // Resolve contract template
    const template = await prisma.kekereContractTemplate.findFirst({
      where: { contractType: "PUBLISHING" },
      orderBy: { createdAt: "desc" },
    });
    if (!template) {
      return NextResponse.json({ error: "No publishing contract template found." }, { status: 500 });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const rendered = renderContractBody(template.body, {
      story_title: story.title,
      writer_name: story.author.name,
      cowrie_cost: String(cowrieCost),
      genre: story.genre,
      date: dateStr,
    }, template.variables);

    if (rendered.missing) {
      return NextResponse.json({ error: "contract_template_missing_vars", missing: rendered.missing }, { status: 500 });
    }

    // Promote the editorial working copy (if the admin edited it in the review
    // queue) to the live story. The working copy lived in the edited* columns,
    // leaving the writer's original body/hookLine untouched until this moment
    // — so promoting it here means the story goes to contract with the edits
    // baked in, and the original is preserved as a version snapshot below.
    const hasEditedBody = story.editedBody != null;
    const promotedHookLine = story.editedHookLine ?? story.hookLine;
    const promotedWordCount = hasEditedBody ? (story.editedWordCount ?? story.wordCount ?? 0) : (story.wordCount ?? 0);
    const promotedReadingTime = hasEditedBody
      ? (story.editedReadingTime ?? Math.max(1, Math.round(promotedWordCount / 200)))
      : story.readingTime;

    const expiresAt = new Date(now.getTime() + expiresInDays * 86400000);

    const { contract } = await prisma.$transaction(async (tx) => {
      // Preserve the writer's original submission as a permanent version
      // snapshot before the admin's edits overwrite the live body. Labeled
      // "Submitted …" so the version-retention cap never prunes it.
      if (hasEditedBody) {
        const last = await tx.storyVersion.findFirst({
          where: { storyId: id },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });
        await tx.storyVersion.create({
          data: {
            storyId: id,
            versionNumber: (last?.versionNumber ?? 0) + 1,
            content: story.body as object,
            wordCount: story.wordCount ?? 0,
            label: "Submitted — writer's original",
          },
        });
      }

      // Save the promoted content + set story to PENDING_CONTRACT, and clear
      // the working copy now that it has been promoted.
      await tx.story.update({
        where: { id },
        data: {
          cowrieCost,
          tier,
          isDraft: false,
          hookLine: promotedHookLine,
          ...(hasEditedBody
            ? { body: story.editedBody as Prisma.InputJsonValue, wordCount: promotedWordCount, readingTime: promotedReadingTime }
            : {}),
          ...(coverImageRef ? { coverImageRef } : {}),
          ...(isAdult !== undefined ? { isAdult } : {}),
          status: "PENDING_CONTRACT",
          editedBody: Prisma.DbNull,
          editedHookLine: null,
          editedWordCount: null,
          editedReadingTime: null,
          editLastSavedAt: null,
        },
      });

      // Replace tags atomically
      await tx.storyTag.deleteMany({ where: { storyId: id } });
      await tx.storyTag.createMany({
        data: tagIds.map((tagId) => ({ storyId: id, tagId })),
        skipDuplicates: true,
      });

      const contract = await tx.kekereContract.create({
        data: {
          templateId: template.id,
          writerId: story.author.id,
          storyId: id,
          body: rendered.rendered!,
          status: "PENDING",
          expiresAt,
          sentAt: now,
        },
      });

      return { contract };
    });

    // Email: acceptance notice only (PDF sent after they sign)
    const contractUrl = `${process.env.NEXTAUTH_URL ?? "https://narriva.pro"}/kekere/contracts`;
    const acceptedHtml = await renderStoryAcceptedEmail({
      writerName: story.author.name,
      storyTitle: story.title,
      cowrieCost,
      expiresInDays,
      contractUrl,
    }).catch(() => undefined);
    await sendEmail({
      to: story.author.email,
      subject: `"${story.title}" has been accepted for publishing — Kekere Stories`,
      body: `Hi ${story.author.name},\n\nGreat news — your story "${story.title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nHere are the publishing terms:\n• Price to readers: ${cowrieCost} cowrie${cowrieCost !== 1 ? "s" : ""}\n• Your earnings: 70% of every sale\n\nA publishing contract is waiting for you in the app. Open Kekere Stories, check your notifications, and sign it with one tap. Your story goes live the moment you sign.\n\nThe contract offer expires in ${expiresInDays} days — please sign before then.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
      from: KEKERE_SUBMISSIONS_FROM,
      html: acceptedHtml,
    });

    // In-app notification with link directly to the contract
    await createNotification({
      userId: story.author.id,
      type: "CONTRACT_RECEIVED",
      title: `Publishing contract for "${story.title}"`,
      body: "Your story has been accepted! Tap to review and sign your publishing contract — it goes live the moment you sign.",
      link: `/kekere/contracts`,
    });

    return NextResponse.json({
      success: true,
      contractId: contract.id,
      writerName: story.author.name,
      expiresAt: expiresAt.toISOString(),
    });
  },
  { roles: ["ADMIN"] },
);
