import type { KemiNudgeKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { renderKemiNudge } from "@/content/kemi-nudges";

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
}): Promise<void> {
  const { userId, kind, storyTitle = null, storySlug = null } = params;
  try {
    await prisma.$transaction([
      prisma.kemiNudge.deleteMany({ where: { userId, kind, deliveredAt: null } }),
      prisma.kemiNudge.create({ data: { userId, kind, storyTitle, storySlug } }),
    ]);
  } catch (error) {
    console.error("Failed to record Kemi nudge:", error);
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
    content: renderKemiNudge(nudge.kind, nudge.storyTitle, nudge.id),
    timestamp: nudge.createdAt.toISOString(),
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
