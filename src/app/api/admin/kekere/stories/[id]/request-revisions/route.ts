export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderRevisionsRequestedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";

const revisionsSchema = z.object({
  moderationNotes: z.string().min(20, "Moderation notes must be at least 20 characters."),
  internalNote: z.string().optional(),
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

    const parsed = revisionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { moderationNotes, internalNote } = parsed.data;

    await prisma.story.update({
      where: { id },
      data: { status: "REVISIONS_REQUESTED", moderationNotes },
    });

    if (internalNote) {
      console.log(
        `[admin] Story ${id} revision request internal note: ${internalNote}`,
      );
    }

    const html = await renderRevisionsRequestedEmail({
      writerName: story.author.name,
      storyTitle: story.title,
      editorNotes: moderationNotes,
      storyId: id,
    }).catch(() => undefined);
    await sendEmail({
      to: story.author.email,
      subject: `Revisions requested for "${story.title}" — Kekere Stories`,
      body: `Hi ${story.author.name},\n\nAn editor has reviewed your story "${story.title}" and requested revisions:\n\n${moderationNotes}\n\nPlease log in to Kekere Stories, update your story, and resubmit.`,
      html,
    });

    await createNotification({
      userId: story.authorId,
      type: "STORY_REVISIONS_REQUESTED",
      title: "Revisions requested for your story",
      body: `Our editor has reviewed "${story.title}" and has some feedback. Tap to see what needs to change.`,
      link: `/kekere/write?id=${story.id}`,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
