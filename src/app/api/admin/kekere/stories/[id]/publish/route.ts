import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";
import { generateStoryAudio } from "@/lib/audio/generate";

const publishSchema = z.object({
  cowrieCost: z.number().int().min(1).max(10),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]),
  noteToWriter: z.string().optional(),
  tagIds: z.array(z.string()).min(1, "Select at least one tag"),
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

    const { cowrieCost, tier, noteToWriter, tagIds } = parsed.data;
    const finalCost = cowrieCost;

    const moderationNotes = noteToWriter
      ? [story.moderationNotes, noteToWriter].filter(Boolean).join("\n\n")
      : story.moderationNotes;

    await prisma.$transaction([
      prisma.story.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          cowrieCost: finalCost,
          tier,
          publishedAt: new Date(),
          moderationNotes: moderationNotes || null,
          isDraft: false,
        },
      }),
      // Replace all existing tags atomically
      prisma.storyTag.deleteMany({ where: { storyId: id } }),
      prisma.storyTag.createMany({
        data: tagIds.map((tagId) => ({ storyId: id, tagId })),
        skipDuplicates: true,
      }),
    ]);

    await sendEmail({
      to: story.author.email,
      subject: "Your story has been published!",
      body: `Hi ${story.author.name},\n\nYour story "${story.title}" has been reviewed and published on Kekere Stories. It costs ${finalCost} cowries to read.\n\nView your story at: kekere.narriva.com/stories/${story.id}${noteToWriter ? `\n\nNote from the editor: ${noteToWriter}` : ""}`,
    });

    await createNotification({
      userId: story.authorId,
      type: "STORY_APPROVED",
      title: "Your story has been published!",
      body: `"${story.title}" is now live on Kekere Stories at ${finalCost} cowries.`,
      link: `/kekere/story/${story.id}`,
    });

    // Fire-and-forget — narration audio generation must not block the
    // publish response.
    generateStoryAudio(story.id).catch(console.error);

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
