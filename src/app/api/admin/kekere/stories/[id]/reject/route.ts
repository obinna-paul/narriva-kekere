export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";

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

    await sendEmail({
      to: story.author.email,
      subject: "Your story submission was not accepted",
      body: `Hi ${story.author.name},\n\nAfter reviewing your story "${story.title}", we've decided not to publish it at this time.\n\n${moderationNotes}`,
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
