import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { STORY_COWRIE_RANGE } from "@/content/decisions";
import { sendEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";
import { generateStoryAudio } from "@/lib/audio/generate";

const publishSchema = z.object({
  isFree: z.boolean(),
  cowrieCost: z.number().int().optional(),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]),
  noteToWriter: z.string().optional(),
});

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({
      where: { id },
      include: { author: { select: { name: true, email: true } } },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { isFree, cowrieCost, tier, noteToWriter } = parsed.data;

    let finalCost: number;
    if (isFree) {
      finalCost = STORY_COWRIE_RANGE.free;
    } else {
      if (
        cowrieCost === undefined ||
        cowrieCost < STORY_COWRIE_RANGE.min_paid ||
        cowrieCost > STORY_COWRIE_RANGE.max_paid
      ) {
        return NextResponse.json(
          {
            error: `cowrieCost must be between ${STORY_COWRIE_RANGE.min_paid} and ${STORY_COWRIE_RANGE.max_paid} for paid stories.`,
          },
          { status: 400 },
        );
      }
      finalCost = cowrieCost;
    }

    const moderationNotes = noteToWriter
      ? [story.moderationNotes, noteToWriter].filter(Boolean).join("\n\n")
      : story.moderationNotes;

    await prisma.story.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        cowrieCost: finalCost,
        tier,
        publishedAt: new Date(),
        moderationNotes: moderationNotes || null,
        isDraft: false,
      },
    });

    await sendEmail({
      to: story.author.email,
      subject: "Your story has been published!",
      body: `Hi ${story.author.name},\n\nYour story "${story.title}" has been reviewed and published on Kekere Stories. It costs ${isFree ? "free (0 cowries)" : `${finalCost} cowries`} to read.\n\nView your story at: kekere.narriva.com/stories/${story.id}${noteToWriter ? `\n\nNote from the editor: ${noteToWriter}` : ""}`,
    });

    await createNotification({
      userId: story.authorId,
      type: "STORY_APPROVED",
      title: "Your story has been published!",
      body: `"${story.title}" is now live on Kekere Stories` + (isFree ? " as a free read." : ` at ${finalCost} cowries.`),
      link: `/kekere/story/${story.id}`,
    });

    // Fire-and-forget — narration audio generation must not block the
    // publish response.
    generateStoryAudio(story.id).catch(console.error);

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
