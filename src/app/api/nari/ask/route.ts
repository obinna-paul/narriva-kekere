import { NextResponse } from "next/server";
import { z } from "zod";
import { askNariAI, matchNariFAQKeywords } from "@/lib/nari/ai";
import { NARI_FALLBACK_MESSAGE } from "@/content/nari-faq";
import { prisma } from "@/lib/db/prisma";

const askSchema = z.object({
  question: z.string().min(1).max(500),
  sessionId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "nari"]),
        text: z.string(),
      }),
    )
    .optional(),
});

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

function extractLead(cleanAnswer: string): string | null {
  const match = cleanAnswer.match(/\[INTERNAL_LEAD:\s*(.+?)\]/);
  return match ? match[1].trim() : null;
}

function stripLeadTag(answer: string): string {
  return answer.replace(/\s*\[INTERNAL_LEAD:\s*.+?\]/g, "").trim();
}

async function saveConversation(sessionId: string, role: string, message: string, isLead: boolean, leadSummary: string | null) {
  if (!sessionId) return;
  prisma.nariConversation.create({
    data: {
      sessionId,
      role,
      message: message.slice(0, 2000),
      classifiedLead: isLead,
      leadSummary: leadSummary?.slice(0, 300) ?? null,
    },
  }).catch(() => {});
}

function hasBookingIntent(answer: string): boolean {
  return /\b(book a call|click the button|schedule a call|speak with the team|talk to the team)\b/i.test(answer);
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
  const sid = sessionId ?? "anon";

  saveConversation(sid, "user", question, false, null);

  const conversational = matchConversational(question);
  if (conversational) {
    saveConversation(sid, "nari", conversational, false, null);
    return NextResponse.json({ matched: true, answer: conversational, links: [] });
  }

  const ai = await askNariAI(question, history ?? []);

  if (ai) {
    const leadSummary = extractLead(ai.answer);
    const cleanAnswer = stripLeadTag(ai.answer);
    const isLead = !!leadSummary;

    saveConversation(sid, "nari", cleanAnswer, isLead, leadSummary);

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
    saveConversation(sid, "nari", keyword.answer, false, null);
    return NextResponse.json({
      matched: true,
      answer: keyword.answer,
      links: keyword.links ?? [],
    });
  }

  saveConversation(sid, "nari", NARI_FALLBACK_MESSAGE, false, null);
  return NextResponse.json({
    matched: false,
    answer: NARI_FALLBACK_MESSAGE,
    links: [{ label: "Book a call", href: "/contact" }],
  });
}
