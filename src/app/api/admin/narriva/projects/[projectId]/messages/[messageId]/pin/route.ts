export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const PUT = withAuth(
  async (request, _session, { params }) => {
    const { projectId, messageId } = params as {
      projectId: string;
      messageId: string;
    };

    let body: { pinnedLabel?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.pinnedLabel || typeof body.pinnedLabel !== "string" || !body.pinnedLabel.trim()) {
      return NextResponse.json(
        { error: "pinnedLabel is required." },
        { status: 400 }
      );
    }

    const message = await prisma.projectMessage.findUnique({
      where: { id: messageId },
      select: { projectId: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.projectId !== projectId) {
      return NextResponse.json(
        { error: "Message does not belong to this project." },
        { status: 400 }
      );
    }

    await prisma.projectMessage.update({
      where: { id: messageId },
      data: {
        isPinned: true,
        pinnedLabel: body.pinnedLabel.trim(),
      },
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
