export const dynamic = "force-dynamic";

/** Kemi's model call can legitimately take a while. Declared explicitly so a
 *  slow Groq response ends in her graceful "away" message (the fetch below
 *  gives up at 20s) rather than the platform killing the function first and
 *  handing the reader a raw gateway error. */
export const maxDuration = 30;

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
  getKemiWriters,
  formatWritersForPrompt,
  getKemiCompetitions,
  formatCompetitionsForPrompt,
} from "@/lib/data/kekere-kemi";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";
import { randomKemiAwayMessage } from "@/content/kemi-away-messages";
import { checkRateLimit } from "@/lib/rate-limit";

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().min(1),
});

/** Kemi is the only reader-facing feature that spends a shared, finite
 *  resource: Groq's quota is per-ACCOUNT, not per-user. Without a ceiling one
 *  enthusiastic reader can exhaust it and take Kemi offline for everyone —
 *  and the failure is invisible, because she just starts saying she's away.
 *  30 messages in 10 minutes is far more than a real conversation needs and
 *  far less than it takes to do damage. */
const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

interface MessageEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  recommendedSlugs?: string[];
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

  // Answered in Kemi's own voice rather than as a bare 429 — she's a person
  // to the reader, and a status code here would break that harder than
  // anything else in the app. Not persisted, same as the away message: this
  // isn't a turn in the conversation.
  const rateLimit = await checkRateLimit(`kemi-chat:${userId}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        answer: "Okay, you've properly worn me out — give me a few minutes to catch my breath and come back?",
        away: true,
        recommendations: [],
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

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

  const [catalog, readerContext, writers, competitions] = await Promise.all([
    getKemiCatalog(),
    getKemiReaderContext(userId),
    getKemiWriters(),
    getKemiCompetitions(),
  ]);

  // Slugs already pitched earlier in this conversation — folded into the
  // reader-context text so the model has a structural signal not to loop
  // back onto the same recommendation, on top of the prompt instruction.
  const alreadySuggestedSlugs = Array.from(
    new Set(priorMessages.flatMap((m) => m.recommendedSlugs ?? [])),
  );
  let readerContextText = formatReaderContextForPrompt(readerContext);
  if (alreadySuggestedSlugs.length > 0) {
    readerContextText += `\nAlready suggested earlier in this conversation — don't repeat these unless the reader explicitly asks to revisit one: ${alreadySuggestedSlugs.join(", ")}.`;
  }

  const ai = await askKemiAI(
    message,
    history,
    formatCatalogForPrompt(catalog),
    readerContextText,
    formatWritersForPrompt(writers),
    formatCompetitionsForPrompt(competitions),
  );

  if (!ai) {
    // Not persisted — this is a status message, not a real turn, and
    // shouldn't become "context" the model sees on the next real call.
    return NextResponse.json({ answer: randomKemiAwayMessage(), away: true, recommendations: [] });
  }

  type CatalogStory = (typeof catalog)[number];
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const bySlug = new Map(catalog.map((s) => [s.slug, s]));
  const byTitle = new Map(catalog.map((s) => [normalize(s.title), s]));

  const picked: CatalogStory[] = [];
  const pickedSlugs = new Set<string>();
  const pushStory = (s: CatalogStory | undefined) => {
    if (s && !pickedSlugs.has(s.slug)) {
      pickedSlugs.add(s.slug);
      picked.push(s);
    }
  };

  // The token after RECOMMEND is meant to be a catalog slug, but models
  // improvise — some emit the exact title instead — so accept either.
  for (const token of ai.recommendedTokens) {
    pushStory(bySlug.get(token) ?? byTitle.get(normalize(token)));
  }

  // Fallback for the "named a story in prose but botched the RECOMMEND line"
  // case (e.g. a bare "RECOMMEND" with no slug): if nothing resolved, card any
  // catalog story whose title Kemi actually named in her reply, earliest-named
  // first. Skip titles already shown as cards earlier in the conversation so we
  // never paint a duplicate underneath an answer about a pick already on screen.
  if (picked.length === 0) {
    const alreadyShown = new Set(alreadySuggestedSlugs);
    const normReply = normalize(ai.reply);
    catalog
      .map((s) => ({ s, at: normReply.indexOf(normalize(s.title)) }))
      .filter(({ s, at }) => at !== -1 && normalize(s.title).length >= 5 && !alreadyShown.has(s.slug))
      .sort((a, b) => a.at - b.at)
      .forEach(({ s }) => pushStory(s));
  }

  const recommendations: KemiRecommendation[] = picked.slice(0, 3).map((s) => ({
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

  const assistantEntry: MessageEntry = {
    role: "assistant",
    content: ai.reply,
    timestamp,
    ...(recommendations.length > 0 ? { recommendedSlugs: recommendations.map((r) => r.slug) } : {}),
  };
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
