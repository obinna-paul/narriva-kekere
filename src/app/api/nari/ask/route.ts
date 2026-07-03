export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/middleware";
import { askNariAI, matchNariFAQ, matchNariFAQKeywords } from "@/lib/nari/ai";
import { extractConversationIntelligence } from "@/lib/nari/extract";
import { NARI_FALLBACK_MESSAGE } from "@/content/nari-faq";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

const askSchema = z.object({
  question: z.string().min(1).max(500),
  sessionId: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "nari"]),
        text: z.string(),
      }),
    )
    .optional(),
});

interface MessageEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const GREETING_PATTERNS = [
  { match: /\b(hello|hi|hey|howdy|sup|yo|good morning|good afternoon|good evening)\b/i, answer: "Hello! I'm Nari, Narriva's assistant. I can answer questions about our publishing services, editorial work, submissions, rights, and the publishing landscape. What would you like to know?" },
  { match: /\b(thank|thanks|thx|appreciate)\b/i, answer: "You're very welcome. Is there anything else I can help with?" },
  { match: /\b(how are you|how's it going|what's up|how do you do)\b/i, answer: "I'm doing great — ready to talk books and publishing whenever you are! What can I help with?" },
  { match: /\b(what are you|who are you|your name|are you real|are you a bot|are you human|are you ai)\b/i, answer: "I'm Nari — Narriva's AI assistant. Think of me as a knowledgeable guide to everything Narriva does: publishing, editing, cover design, submissions, timelines, and how the business works. What do you want to know?" },
  { match: /\b(what can you do|help me|what do you know|how can you help)\b/i, answer: "I know about: our full publishing package, standalone editorial services, cover design, ghostwriting, author growth, submission process, timelines, our costs model, how rights and royalties work here, and the African publishing landscape generally. Pick any of those and I'll go deeper." },
];

function matchConversational(question: string): string | null {
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.match.test(question)) return pattern.answer;
  }
  return null;
}

function stripLeadTag(answer: string): string {
  return answer.replace(/\s*\[INTERNAL_LEAD:\s*.+?\]/g, "").trim();
}

function hasBookingIntent(answer: string): boolean {
  return /\b(book a call|click the button|schedule a call|speak with the team|talk to the team)\b/i.test(answer);
}

function hasEndSignal(answer: string): boolean {
  return /\b(book a call|email us|I'?m not sure about that)\b/i.test(answer);
}

async function checkConversationEnded(
  sessionId: string,
  messageCount: number,
  lastAnswer: string,
) {
  if (hasEndSignal(lastAnswer) && messageCount >= 6) {
    const conv = await prisma.nariConversation.findUnique({
      where: { sessionId },
      select: { id: true, startedAt: true, endedAt: true },
    });

    if (conv && !conv.endedAt) {
      const now = new Date();
      const durationSecs = Math.floor(
        (now.getTime() - conv.startedAt.getTime()) / 1000,
      );

      await prisma.nariConversation.update({
        where: { id: conv.id },
        data: { endedAt: now, durationSecs },
      });

      extractConversationIntelligence(conv.id).catch((err) => {
        console.error("[nari] extraction failed:", (err as Error).message);
      });
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = askSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { question, sessionId, history } = parsed.data;
  const session = await getCurrentSession();
  const timestamp = new Date().toISOString();

  const userEntry: MessageEntry = { role: "user", content: question, timestamp };

  const conversational = matchConversational(question);
  if (conversational) {
    const assistantEntry: MessageEntry = {
      role: "assistant",
      content: conversational,
      timestamp,
    };

    await upsertConversation(sessionId, session?.user?.id ?? null, [userEntry, assistantEntry]);
    await checkConversationEnded(sessionId, 2, conversational);

    return NextResponse.json({ matched: true, answer: conversational, links: [] });
  }

  const ai = await askNariAI(question, history ?? []);

  if (ai) {
    const cleanAnswer = stripLeadTag(ai.answer);

    const assistantEntry: MessageEntry = {
      role: "assistant",
      content: cleanAnswer,
      timestamp,
    };

    await upsertConversation(sessionId, session?.user?.id ?? null, [userEntry, assistantEntry]);

    const existing = await prisma.nariConversation.findUnique({
      where: { sessionId },
      select: { messages: true },
    });
    const messageCount = existing ? (existing.messages as unknown as MessageEntry[]).length : 2;
    await checkConversationEnded(sessionId, messageCount, cleanAnswer);

    return NextResponse.json({
      matched: true,
      answer: cleanAnswer,
      links: hasBookingIntent(cleanAnswer)
        ? [{ label: "Book a call", href: "/contact" }]
        : [],
    });
  }

  const keyword = matchNariFAQKeywords(question);

  if (keyword) {
    const assistantEntry: MessageEntry = {
      role: "assistant",
      content: keyword.answer,
      timestamp,
    };

    await upsertConversation(sessionId, session?.user?.id ?? null, [userEntry, assistantEntry]);
    await checkConversationEnded(sessionId, 2, keyword.answer);

    return NextResponse.json({
      matched: true,
      answer: keyword.answer,
      links: keyword.links ?? [],
    });
  }

  const dbFaqItems = await prisma.nariFaqItem.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { question: true, answer: true, keywords: true },
  });

  const dbMatch = matchNariFAQ(question, dbFaqItems);

  if (dbMatch) {
    const assistantEntry: MessageEntry = {
      role: "assistant",
      content: dbMatch.answer,
      timestamp,
    };

    await upsertConversation(sessionId, session?.user?.id ?? null, [userEntry, assistantEntry]);
    await checkConversationEnded(sessionId, 2, dbMatch.answer);

    return NextResponse.json({
      matched: true,
      answer: dbMatch.answer,
      links: dbMatch.links ?? [],
    });
  }

  const assistantEntry: MessageEntry = {
    role: "assistant",
    content: NARI_FALLBACK_MESSAGE,
    timestamp,
  };

  await upsertConversation(sessionId, session?.user?.id ?? null, [userEntry, assistantEntry]);

  const existing = await prisma.nariConversation.findUnique({
    where: { sessionId },
    select: { messages: true },
  });
  const messageCount = existing ? (existing.messages as unknown as MessageEntry[]).length : 2;
  await checkConversationEnded(sessionId, messageCount, NARI_FALLBACK_MESSAGE);

  return NextResponse.json({
    matched: false,
    answer: NARI_FALLBACK_MESSAGE,
    links: [{ label: "Book a call", href: "/contact" }],
  });
}

async function upsertConversation(
  sessionId: string,
  userId: string | null,
  newEntries: MessageEntry[],
) {
  const existing = await prisma.nariConversation.findUnique({
    where: { sessionId },
    select: { id: true, messages: true },
  });

  if (existing) {
    const currentMessages = existing.messages as unknown as MessageEntry[];
    await prisma.nariConversation.update({
      where: { id: existing.id },
      data: { messages: [...currentMessages, ...newEntries] as unknown as Prisma.InputJsonValue },
    });
  } else {
    await prisma.nariConversation.create({
      data: {
        sessionId,
        userId,
        messages: newEntries as unknown as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });
  }
}
