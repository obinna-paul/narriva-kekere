export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { askKemiAI } from "@/lib/kemi/ai";
import {
  getKemiCatalog,
  formatCatalogForPrompt,
  getKemiReaderContext,
  formatReaderContextForPrompt,
} from "@/lib/data/kekere-kemi";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";
import { randomKemiAwayMessage } from "@/content/kemi-away-messages";

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().min(1),
});

interface MessageEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface KemiRecommendation {
  slug: string;
  title: string;
  hookLine: string;
  genre: string;
  cowrieCost: number;
  readingTime: number;
  isAdult: boolean;
  authorName: string;
  coverColor: string;
  coverImageUrl: string | null;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { message, sessionId } = parsed.data;
  const timestamp = new Date().toISOString();

  const existing = await prisma.kemiConversation.findUnique({
    where: { sessionId },
    select: { id: true, userId: true, messages: true },
  });

  // A sessionId is client-generated and unguessable in practice, but this
  // is a cheap, correct guard against ever writing into someone else's
  // conversation row if one were ever guessed or replayed.
  if (existing && existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const priorMessages = existing ? (existing.messages as unknown as MessageEntry[]) : [];
  const history = priorMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  const userEntry: MessageEntry = { role: "user", content: message, timestamp };

  const [catalog, readerContext] = await Promise.all([
    getKemiCatalog(),
    getKemiReaderContext(userId),
  ]);

  const ai = await askKemiAI(
    message,
    history,
    formatCatalogForPrompt(catalog),
    formatReaderContextForPrompt(readerContext),
  );

  if (!ai) {
    // Not persisted — this is a status message, not a real turn, and
    // shouldn't become "context" the model sees on the next real call.
    return NextResponse.json({ answer: randomKemiAwayMessage(), away: true, recommendations: [] });
  }

  const catalogBySlug = new Map(catalog.map((s) => [s.slug, s]));
  const recommendations: KemiRecommendation[] = ai.recommendedSlugs
    .map((slug) => catalogBySlug.get(slug))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .slice(0, 3)
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      hookLine: s.hookLine,
      genre: s.genre,
      cowrieCost: s.cowrieCost,
      readingTime: s.readingTime,
      isAdult: s.isAdult,
      authorName: s.authorName,
      coverColor: s.coverColor,
      coverImageUrl: s.coverImageRef ? storyCoverUrl(s.coverImageRef) : null,
    }));

  const assistantEntry: MessageEntry = { role: "assistant", content: ai.reply, timestamp };
  await upsertConversation(sessionId, userId, existing, [userEntry, assistantEntry]);

  return NextResponse.json({ answer: ai.reply, away: false, recommendations });
}

async function upsertConversation(
  sessionId: string,
  userId: string,
  existing: { id: string; messages: unknown } | null,
  newEntries: MessageEntry[],
) {
  const now = new Date();
  if (existing) {
    const currentMessages = existing.messages as unknown as MessageEntry[];
    await prisma.kemiConversation.update({
      where: { id: existing.id },
      data: {
        messages: [...currentMessages, ...newEntries] as unknown as Prisma.InputJsonValue,
        lastMessageAt: now,
      },
    });
  } else {
    await prisma.kemiConversation.create({
      data: {
        sessionId,
        userId,
        messages: newEntries as unknown as Prisma.InputJsonValue,
        startedAt: now,
        lastMessageAt: now,
      },
    });
  }
}
