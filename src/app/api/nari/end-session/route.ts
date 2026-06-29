import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { extractConversationIntelligence } from "@/lib/nari/extract";

const endSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = endSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sessionId } = parsed.data;

  const conv = await prisma.nariConversation.findUnique({
    where: { sessionId },
    select: { id: true, startedAt: true, endedAt: true },
  });

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (!conv.endedAt) {
    const now = new Date();
    const durationSecs = Math.floor(
      (now.getTime() - conv.startedAt.getTime()) / 1000,
    );

    await prisma.nariConversation.update({
      where: { id: conv.id },
      data: { endedAt: now, durationSecs },
    });
  }

  extractConversationIntelligence(conv.id).catch((err) => {
    console.error("[nari] end-session extraction failed:", (err as Error).message);
  });

  return NextResponse.json({ success: true });
}
