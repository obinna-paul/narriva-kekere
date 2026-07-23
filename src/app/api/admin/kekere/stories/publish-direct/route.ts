export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { renderContractBody } from "@/lib/contracts/render";
import { sendEmail } from "@/lib/email/send";
import { renderStoryAcceptedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { plainTextToDoc } from "@/lib/tiptap/doc-utils";
import { countWords } from "@/lib/tiptap/doc-utils";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";

const schema = z.object({
  writerId: z.string().min(1),
  title: z.string().min(1),
  hookLine: z.string().min(1),
  genre: z.string().min(1),
  cowrieCost: z.number().int().min(1).max(100),
  tier: z.enum(["STANDARD", "FEATURED", "CHAMPION"]).default("STANDARD"),
  readingTime: z.number().int().min(1),
  /** Plain-text story body — blank lines separate paragraphs. */
  body: z.string().min(1),
  /** Tag slugs to attach (must exist in Tag table). */
  tags: z.array(z.string()).default([]),
  coverColor: z.string().default("#C75D2C"),
  /** Versioned Cloudinary public_id e.g. "v1783123848/kekere-covers/abc123" */
  coverImageRef: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).default(14),
});

export const POST = withAuth(
  async (request) => {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      writerId,
      title,
      hookLine,
      genre,
      cowrieCost,
      tier,
      readingTime,
      body: bodyText,
      tags,
      coverColor,
      coverImageRef,
      expiresInDays,
    } = parsed.data;

    const writer = await prisma.user.findUnique({
      where: { id: writerId },
      select: { name: true, email: true, createdByAdminId: true },
    });

    if (!writer) {
      return NextResponse.json({ error: "Writer not found" }, { status: 404 });
    }

    // This route creates a story for an arbitrary existing writerId, so the
    // signer isn't necessarily onboarded/admin-created — only writers with
    // createdByAdminId set skip the ACCEPTED "to be published" queue and go
    // straight to PUBLISHED on signing (see signContractAndPublishStory in
    // kekere-contracts.ts). Checked the same way here so the copy sent below
    // always matches what actually happens when this writer signs.
    const isOnboarded = writer.createdByAdminId != null;

    const template = await prisma.kekereContractTemplate.findFirst({
      where: { contractType: "PUBLISHING" },
      orderBy: { createdAt: "desc" },
    });

    if (!template) {
      return NextResponse.json(
        { error: "No publishing contract template found. Run the seed to create one." },
        { status: 500 },
      );
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const variables: Record<string, string> = {
      story_title: title,
      writer_name: writer.name,
      cowrie_cost: String(cowrieCost),
      genre,
      date: dateStr,
    };

    const rendered = renderContractBody(template.body, variables, template.variables);

    if (rendered.missing) {
      return NextResponse.json(
        { error: "contract_template_missing_vars", missing: rendered.missing },
        { status: 500 },
      );
    }

    const bodyDoc = plainTextToDoc(bodyText);
    const wordCount = countWords(bodyDoc);

    // Find tag records (skip unknown slugs silently)
    const tagRecords = tags.length > 0
      ? await prisma.tag.findMany({ where: { slug: { in: tags } }, select: { id: true, slug: true } })
      : [];

    const expiresAt = new Date(now.getTime() + expiresInDays * 86400000);

    // Create story + contract in a transaction
    const { story, contract } = await prisma.$transaction(async (tx) => {
      const story = await tx.story.create({
        data: {
          authorId: writerId,
          title,
          hookLine,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: bodyDoc as any,
          wordCount,
          genre,
          coverColor,
          coverImageRef: coverImageRef ?? null,
          tier,
          cowrieCost,
          readingTime,
          status: "PENDING_CONTRACT",
          isDraft: false,
          tags: tagRecords.length > 0
            ? { create: tagRecords.map((t) => ({ tagId: t.id })) }
            : undefined,
        },
      });

      const contract = await tx.kekereContract.create({
        data: {
          templateId: template.id,
          writerId,
          storyId: story.id,
          body: rendered.rendered!,
          status: "PENDING",
          expiresAt,
          sentAt: now,
        },
      });

      return { story, contract };
    });

    // /kekere/contracts is the real, only contracts-inbox page — there is no
    // /kekere/profile/contracts route.
    const contractUrl = `${process.env.NEXTAUTH_URL ?? "https://narriva.pro"}/kekere/contracts`;
    const acceptedHtml = await renderStoryAcceptedEmail({
      writerName: writer.name,
      storyTitle: title,
      cowrieCost,
      expiresInDays,
      contractUrl,
      isLive: isOnboarded,
    }).catch(() => undefined);
    const signInstruction = isOnboarded
      ? "Your story goes live the moment you sign."
      : "Signing moves your story into our publishing queue, where our editors prepare it for release.";
    await sendEmail({
      to: writer.email,
      subject: `"${title}" has been accepted for publishing — Kekere Stories`,
      body: `Hi ${writer.name},\n\nGreat news — your story "${title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nHere are the publishing terms:\n• Price to readers: ${cowrieCost} cowrie${cowrieCost !== 1 ? "s" : ""}\n• Your earnings: 70% of every sale\n\nA publishing contract is waiting for you in the app. Open Kekere Stories, check your notifications, and sign it with one tap. ${signInstruction}\n\nThe contract offer expires in ${expiresInDays} days — please sign before then.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
      from: KEKERE_SUBMISSIONS_FROM,
      html: acceptedHtml,
    });

    await createNotification({
      userId: writerId,
      type: "CONTRACT_RECEIVED",
      title: `Publishing contract for "${title}"`,
      body: isOnboarded
        ? "Kekere Stories has sent you a publishing contract. Tap to review and sign — your story goes live the moment you sign."
        : "Kekere Stories has sent you a publishing contract. Tap to review and sign — signing moves your story into our publishing queue.",
      link: "/kekere/contracts",
    });

    return NextResponse.json({
      success: true,
      story: { id: story.id, title, status: "PENDING_CONTRACT" },
      contract: { id: contract.id, expiresAt: expiresAt.toISOString() },
    });
  },
  { roles: ["ADMIN"] },
);
