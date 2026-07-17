export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isValidTiptapDoc, ensureParagraphIds, countWords } from "@/lib/tiptap/doc-utils";
import { createPublishingContract } from "@/lib/data/kekere-contracts";

const schema = z.object({
  title: z.string().min(1).max(200),
  hookLine: z.string().min(1).max(300),
  body: z.record(z.string(), z.unknown()),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]),
  cowrieCost: z.number().int().min(1).max(10),
  genre: z.string().min(1),
  coverColor: z.string().default("#C75D2C"),
  coverImageRef: z.string().optional(),
  tagIds: z.array(z.string()).min(1, "Select at least one tag").max(2, "Select at most two tags"),
});

// Saves an admin-authored story under a writer's account and creates the
// pending publishing contract — but sends NOTHING. The admin sends the
// publishing-agreement email separately, on demand, via the "Send email"
// action in the Onboarded Writers list. Keeping save and send apart means an
// admin can create/edit a story without the writer being pinged prematurely.
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
    select: { id: true, name: true, accountStatus: true },
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

  let result: { storyId: string; contractId: string };
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

      const contract = await createPublishingContract({
        storyId: story.id,
        writerId,
        storyTitle: title,
        writerName: writer.name,
        cowrieCost,
        genre,
      }, tx);

      return { storyId: story.id, contractId: contract.contractId };
    });
  } catch (err) {
    // Surface a real reason instead of an opaque 500 → "unknown error" in the
    // admin UI. Nothing was committed (single transaction), so it's safe to
    // let the admin retry.
    console.error("Failed to create admin-authored story:", err);
    const message =
      err instanceof Error && /template/i.test(err.message)
        ? "No publishing contract template found. Seed the publishing template first."
        : "Couldn't save the story. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    storyId: result.storyId,
    contractId: result.contractId,
    writerName: writer.name,
    accountStatus: writer.accountStatus,
  }, { status: 201 });
}, { roles: ["ADMIN"] });
