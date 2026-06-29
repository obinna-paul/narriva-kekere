import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";

const unpublishSchema = z.object({
  reason: z.string().min(1, "Reason is required."),
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

    const parsed = unpublishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { reason } = parsed.data;

    await prisma.story.update({
      where: { id },
      data: { status: "DRAFT" },
    });

    await sendEmail({
      to: story.author.email,
      subject: "Your story has been unpublished",
      body: `Hi ${story.author.name},\n\nYour story "${story.title}" has been unpublished from Kekere Stories.\n\nReason: ${reason}\n\nYour story is now back in draft status. Readers who previously unlocked it retain access. You can edit and resubmit it for review.`,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] },
);
