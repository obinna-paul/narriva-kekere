export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import {
  deliverKemiNudges,
  ensureStreakSaveNudge,
  getKemiConversation,
} from "@/lib/data/kekere-kemi-nudges";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";
import { generateUUID } from "@/lib/utils/uuid";
import type { KemiRecommendation } from "@/app/api/kekere/kemi/chat/route";

const querySchema = z.object({ sessionId: z.string().min(1) });

/**
 * How long a conversation stays warm. Come back inside this window and you
 * pick up mid-thought; come back after it and Kemi starts fresh, greeting you
 * the way she would the first time that day.
 *
 * A transcript that never resets is the wrong shape for what this actually is.
 * Nobody wants yesterday morning's "what are you in the mood for?" sitting
 * above tonight's question, and her greetings — the whole rotating,
 * time-of-day-aware set of them — only ever get seen once per reader if the
 * first conversation lasts forever.
 */
const SESSION_IDLE_MS = 3 * 60 * 60 * 1000;

/**
 * The reader's transcript for this session, and the point at which any
 * pending nudges become real messages.
 *
 * Called when the chat panel opens, which does two jobs at once: it restores
 * a conversation that used to be thrown away every time the panel closed
 * (the messages were always being persisted server-side — nothing ever read
 * them back), and it delivers Kemi's queued openers so they appear as though
 * she'd sent them at the moment of the event.
 */
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = querySchema.safeParse({
    sessionId: new URL(request.url).searchParams.get("sessionId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Opening the chat is the one moment worth checking whether a streak is
  // about to lapse — the reader is right here and can still act on it.
  await ensureStreakSaveNudge(userId);

  // Age the session out BEFORE delivering anything into it. A stale session
  // is retired rather than emptied: the old transcript stays on its own row
  // (it's a real record of a real conversation) and a fresh sessionId takes
  // over, which the client adopts from the response. Doing it server-side
  // keeps the cutoff in one place and means pending nudges land in the new
  // conversation rather than being appended under a stale one.
  const sessionId = await resolveSessionId(userId, parsed.data.sessionId);

  // Deliver first, then read — so the response already contains anything
  // that was waiting rather than needing a second round trip to show it.
  await deliverKemiNudges(userId, sessionId);
  const stored = await getKemiConversation(userId, sessionId);

  // Story cards were never persisted, only the slugs behind them, so
  // rehydrate them here — otherwise a restored transcript would show Kemi's
  // pitch with the story it was pitching mysteriously missing. Only the
  // slugs actually referenced are fetched, and only if still published:
  // a story pulled down since the conversation happened correctly drops its
  // card instead of resurrecting a dead link.
  const slugs = Array.from(new Set(stored.flatMap((m) => m.recommendedSlugs ?? [])));
  const bySlug = new Map<string, KemiRecommendation>();
  if (slugs.length > 0) {
    const stories = await prisma.story.findMany({
      where: { slug: { in: slugs }, status: "PUBLISHED" },
      select: {
        slug: true, title: true, hookLine: true, genre: true, cowrieCost: true,
        readingTime: true, isAdult: true, coverColor: true, coverImageRef: true,
        author: { select: { name: true } },
      },
    });
    for (const s of stories) {
      if (!s.slug) continue;
      bySlug.set(s.slug, {
        slug: s.slug,
        title: s.title,
        hookLine: s.hookLine,
        genre: s.genre,
        cowrieCost: s.cowrieCost,
        readingTime: s.readingTime,
        isAdult: s.isAdult,
        authorName: s.author.name,
        coverColor: s.coverColor,
        coverImageUrl: s.coverImageRef ? storyCoverUrl(s.coverImageRef) : null,
      });
    }
  }

  const messages = stored.map((m) => ({
    role: m.role === "assistant" ? ("kemi" as const) : ("user" as const),
    text: m.content,
    recommendations: (m.recommendedSlugs ?? [])
      .map((slug) => bySlug.get(slug))
      .filter((r): r is KemiRecommendation => !!r),
  }));

  return NextResponse.json({ messages, sessionId });
}

/**
 * The session the client should be talking to: its own if that conversation
 * is still warm, a brand-new one if it has gone cold (or belongs to somebody
 * else — sessionIds come from the client, so an unowned one is retired the
 * same way rather than trusted).
 *
 * An untouched or unknown sessionId is handed straight back; there's nothing
 * stale about a conversation that hasn't started yet.
 */
async function resolveSessionId(userId: string, requested: string): Promise<string> {
  const convo = await prisma.kemiConversation.findUnique({
    where: { sessionId: requested },
    select: { userId: true, lastMessageAt: true },
  });
  if (!convo) return requested;

  const foreign = convo.userId !== userId;
  const cold = Date.now() - convo.lastMessageAt.getTime() > SESSION_IDLE_MS;
  return foreign || cold ? generateUUID() : requested;
}
