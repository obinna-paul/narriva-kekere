export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { deliverKemiNudges, getKemiConversation } from "@/lib/data/kekere-kemi-nudges";
import { storyCoverUrl } from "@/lib/storage/cloudinary-urls";
import type { KemiRecommendation } from "@/app/api/kekere/kemi/chat/route";

const querySchema = z.object({ sessionId: z.string().min(1) });

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

  // Deliver first, then read — so the response already contains anything
  // that was waiting rather than needing a second round trip to show it.
  await deliverKemiNudges(userId, parsed.data.sessionId);
  const stored = await getKemiConversation(userId, parsed.data.sessionId);

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

  return NextResponse.json({ messages });
}
