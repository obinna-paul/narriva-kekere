export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderStoryRejectedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";

const rejectSchema = z.object({
  moderationNotes: z.string().min(1, "Moderation notes are required."),
  internalReason: z.string().min(1, "Internal reason is required."),
  plagiarismFlagged: z.boolean().optional().default(false),
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

    if (story.status !== "SUBMITTED" && story.status !== "REVISIONS_REQUESTED") {
      return NextResponse.json({ error: "Only submitted stories can be rejected from the review queue" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { moderationNotes, internalReason, plagiarismFlagged } = parsed.data;

    console.log(
      `[admin] Story ${id} rejected — internal reason: ${internalReason}`,
    );

    await prisma.story.update({
      where: { id },
      data: {
        status: "REJECTED",
        moderationNotes,
        plagiarismFlagged,
      },
    });

    const html = await renderStoryRejectedEmail({
      writerName: story.author.name,
      storyTitle: story.title,
      editorFeedback: moderationNotes,
    }).catch(() => undefined);
    await sendEmail({
      to: story.author.email,
      subject: `Editor feedback on "${story.title}" — Kekere Stories`,
      body: `Hi ${story.author.name},\n\nAfter reviewing your story "${story.title}", we've decided not to publish it at this time.\n\n${moderationNotes}`,
      from: KEKERE_SUBMISSIONS_FROM,
      html,
    });

    await createNotification({
      userId: story.authorId,
      type: "STORY_REJECTED",
      title: "Story not accepted this time",
      body: `"${story.title}" wasn't the right fit for us right now. We've sent you feedback by email.`,
      link: `/kekere/write?id=${story.id}`,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
