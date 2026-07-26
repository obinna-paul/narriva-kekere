import type { KemiNudgeKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { renderKemiNudge } from "@/content/kemi-nudges";
import { isStreakAtRisk } from "@/lib/data/kekere-streaks";
import { pickQuickRead } from "@/lib/data/kekere-kemi";

/** Nudge kinds whose story is one Kemi is OFFERING, so the message should
 *  carry a tappable card. The others name a story the reader has already
 *  finished or written — showing them a card for it would be a dead end. */
const KINDS_WITH_STORY_CARD = new Set<KemiNudgeKind>(["STREAK_SAVE", "FOLLOWED_WRITER_PUBLISHED"]);

/** One entry in a KemiConversation's `messages` array. Mirrors the shape the
 *  chat route writes — kept in sync deliberately rather than shared, since
 *  this module only ever appends assistant turns. */
interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  recommendedSlugs?: string[];
}

/**
 * Records a moment worth Kemi speaking up about.
 *
 * Any older undelivered nudge of the same kind is cleared first, so a reader
 * who finishes six stories without opening Kemi gets one warm "how'd that
 * land?" about the latest, not six stacked openers about stories they've
 * since moved past. Different kinds coexist — a writer can have both a
 * finished-reading nudge and a new-draft nudge waiting.
 *
 * Safe to call fire-and-forget: never throws into the caller's path, because
 * every call site is a side effect of an action (finishing a story, creating
 * a draft) that must succeed whether or not Kemi has anything to say.
 */
export async function createKemiNudge(params: {
  userId: string;
  kind: KemiNudgeKind;
  storyTitle?: string | null;
  storySlug?: string | null;
  writerName?: string | null;
}): Promise<void> {
  const { userId, kind, storyTitle = null, storySlug = null, writerName = null } = params;
  try {
    await prisma.$transaction([
      prisma.kemiNudge.deleteMany({ where: { userId, kind, deliveredAt: null } }),
      prisma.kemiNudge.create({ data: { userId, kind, storyTitle, storySlug, writerName } }),
    ]);
  } catch (error) {
    console.error("Failed to record Kemi nudge:", error);
  }
}

/**
 * The same thing for many readers at once — one publish fanning out to every
 * follower. A per-follower createKemiNudge would be two round trips each,
 * which a writer with a few thousand followers turns into a stampede on a
 * path (publishing) that must not slow down for Kemi's sake.
 *
 * Keeps the same one-undelivered-per-kind rule as the single version: the
 * clear and the insert are one deleteMany plus one createMany.
 */
export async function createKemiNudgesForUsers(params: {
  userIds: string[];
  kind: KemiNudgeKind;
  storyTitle?: string | null;
  storySlug?: string | null;
  writerName?: string | null;
}): Promise<void> {
  const { userIds, kind, storyTitle = null, storySlug = null, writerName = null } = params;
  if (userIds.length === 0) return;
  try {
    await prisma.$transaction([
      prisma.kemiNudge.deleteMany({ where: { userId: { in: userIds }, kind, deliveredAt: null } }),
      prisma.kemiNudge.createMany({
        data: userIds.map((userId) => ({ userId, kind, storyTitle, storySlug, writerName })),
      }),
    ]);
  } catch (error) {
    console.error("Failed to record Kemi nudges:", error);
  }
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Creates today's streak-save opener if this reader's streak really is about
 * to lapse, and hasn't already been told.
 *
 * Every other nudge is written at the moment of an event. This one has no
 * event to hang on — nothing *happens* when a streak is about to break, and
 * the app has no scheduled job to notice on the reader's behalf. So it's
 * materialised lazily, from the same poll that decides whether the unread dot
 * should glow. That has a real upside over a nightly cron: it only ever fires
 * for someone with the app actually open, which is exactly the person who can
 * still do something about it.
 *
 * Two guards make it safe to call as often as that poll runs: the at-risk
 * check is two indexed rows, and at most one is created per UTC day —
 * counting delivered ones, so a reader who read the message and decided not
 * to act isn't told again an hour later.
 */
export async function ensureStreakSaveNudge(userId: string): Promise<void> {
  try {
    const alreadyToday = await prisma.kemiNudge.findFirst({
      where: { userId, kind: "STREAK_SAVE", createdAt: { gte: startOfUtcToday() } },
      select: { id: true },
    });
    if (alreadyToday) return;

    if (!(await isStreakAtRisk(userId))) return;

    // The pick is the point — a streak-save opener with nothing attached is
    // just a reminder, and reminders are the thing this is trying not to be.
    const pick = await pickQuickRead(userId);
    if (!pick) return;

    await prisma.kemiNudge.create({
      data: { userId, kind: "STREAK_SAVE", storyTitle: pick.title, storySlug: pick.slug },
    });
  } catch (error) {
    console.error("Failed to evaluate Kemi streak nudge:", error);
  }
}

/** How many openers are waiting for this reader — drives the unread dot on
 *  the "Ask Kemi" chip. Deliberately a count, not the content: the chip only
 *  needs to know whether to glow, and this is polled. */
export async function countPendingKemiNudges(userId: string): Promise<number> {
  return prisma.kemiNudge.count({ where: { userId, deliveredAt: null } });
}

/**
 * Turns every pending nudge for this reader into a real assistant message in
 * their conversation, then marks it delivered. Called when the reader opens
 * the chat — so the AI is never invoked for someone who never looks, and the
 * message appears as though Kemi had sent it at the moment of the event.
 *
 * Returns the messages it appended so the caller can avoid a second read.
 */
export async function deliverKemiNudges(
  userId: string,
  sessionId: string,
): Promise<StoredMessage[]> {
  const pending = await prisma.kemiNudge.findMany({
    where: { userId, deliveredAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (pending.length === 0) return [];

  const now = new Date();
  const appended: StoredMessage[] = pending.map((nudge) => ({
    role: "assistant" as const,
    content: renderKemiNudge(nudge.kind, nudge.storyTitle, nudge.id, nudge.writerName),
    timestamp: nudge.createdAt.toISOString(),
    // Recorded as a slug, exactly like a recommendation the model made, so
    // the conversation route's existing rehydration paints the card — and
    // correctly drops it if the story has since been unpublished.
    ...(KINDS_WITH_STORY_CARD.has(nudge.kind) && nudge.storySlug
      ? { recommendedSlugs: [nudge.storySlug] }
      : {}),
  }));

  const existing = await prisma.kemiConversation.findUnique({
    where: { sessionId },
    select: { id: true, userId: true, messages: true },
  });

  // A sessionId is client-supplied. If it somehow belongs to someone else,
  // fall through to creating this reader's own row rather than writing into
  // a stranger's conversation.
  const usable = existing && existing.userId === userId ? existing : null;

  await prisma.$transaction(async (tx) => {
    if (usable) {
      const current = (usable.messages as unknown as StoredMessage[]) ?? [];
      await tx.kemiConversation.update({
        where: { id: usable.id },
        data: {
          messages: [...current, ...appended] as unknown as Prisma.InputJsonValue,
          lastMessageAt: now,
        },
      });
    } else if (!existing) {
      await tx.kemiConversation.create({
        data: {
          sessionId,
          userId,
          messages: appended as unknown as Prisma.InputJsonValue,
          startedAt: now,
          lastMessageAt: now,
        },
      });
    }

    await tx.kemiNudge.updateMany({
      where: { id: { in: pending.map((n) => n.id) } },
      data: { deliveredAt: now },
    });
  });

  return appended;
}

/** The stored transcript for a session, oldest first. Returns [] for an
 *  unknown session or one belonging to another user. */
export async function getKemiConversation(
  userId: string,
  sessionId: string,
): Promise<StoredMessage[]> {
  const convo = await prisma.kemiConversation.findUnique({
    where: { sessionId },
    select: { userId: true, messages: true },
  });
  if (!convo || convo.userId !== userId) return [];
  return (convo.messages as unknown as StoredMessage[]) ?? [];
}
