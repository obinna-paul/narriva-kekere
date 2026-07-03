import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { renderContractBody } from "@/lib/contracts/render";
import { sendEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";
import { plainTextToDoc } from "@/lib/tiptap/doc-utils";
import { countWords } from "@/lib/tiptap/doc-utils";

const schema = z.object({
  writerId: z.string().min(1),
  title: z.string().min(1),
  hookLine: z.string().min(1),
  genre: z.string().min(1),
  cowrieCost: z.number().int().min(1).max(100),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]).default("STANDARD"),
  readingTime: z.number().int().min(1),
  /** Plain-text story body — blank lines separate paragraphs. */
  body: z.string().min(1),
  /** Tag slugs to attach (must exist in Tag table). */
  tags: z.array(z.string()).default([]),
  coverColor: z.string().default("#C75D2C"),
  expiresInDays: z.number().int().min(1).max(365).default(30),
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
      expiresInDays,
    } = parsed.data;

    const writer = await prisma.user.findUnique({
      where: { id: writerId },
      select: { name: true, email: true },
    });

    if (!writer) {
      return NextResponse.json({ error: "Writer not found" }, { status: 404 });
    }

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
          tier,
          cowrieCost,
          readingTime,
          // @ts-expect-error — PENDING_CONTRACT added via db push; client regenerates on restart
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
          // @ts-expect-error — storyId added via db push; client regenerates on restart
          storyId: story.id,
          body: rendered.rendered!,
          status: "PENDING",
          expiresAt,
          sentAt: now,
        },
      });

      return { story, contract };
    });

    await sendEmail({
      to: writer.email,
      subject: `Publishing contract for "${title}" — Kekere Stories`,
      body: `Hi ${writer.name},\n\nA publishing contract has been prepared for your story "${title}".\n\nCowrie price: ${cowrieCost} cowries\nYour earnings: 70% of all sales\n\nPlease log into Kekere Stories and go to your contracts inbox to review and sign. Once you sign, the story goes live immediately.\n\nThe contract expires in ${expiresInDays} days.\n\nKekere Stories`,
    });

    await createNotification({
      userId: writerId,
      type: "CONTRACT_RECEIVED",
      title: `Publishing contract for "${title}"`,
      body: "Kekere Stories has sent you a publishing contract. Tap to review and sign — your story goes live the moment you sign.",
      link: `/kekere/profile/contracts/${contract.id}`,
    });

    return NextResponse.json({
      success: true,
      story: { id: story.id, title, status: "PENDING_CONTRACT" },
      contract: { id: contract.id, expiresAt: expiresAt.toISOString() },
    });
  },
  { roles: ["ADMIN"] },
);
