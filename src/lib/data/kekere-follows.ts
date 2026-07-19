import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/notifications/create";
import { getWriterStatsBatch } from "@/lib/data/kekere-writer-profile";
import type { RatingSummary } from "@/lib/data/kekere-ratings";

export type FollowResult =
  | { success: true; followerCount: number }
  | { already_following: true; followerCount: number }
  | { error: "cannot_follow_self" };

/** Idempotent — following someone you already follow just returns the
 * current state rather than erroring, so a double-tap or a stale client
 * can't throw. Notifies the writer only on the call that actually creates
 * the row.
 *
 * Attempts the insert directly rather than checking-then-creating: a
 * find-then-create isn't atomic, so two near-simultaneous requests for the
 * same follow (a genuine mobile double-tap, or a retried request) could
 * both pass the existence check and then race on the same
 * @@unique([followerId, writerId]) constraint — the loser would throw an
 * unhandled error and the client's optimistic "Following" would silently
 * revert. Catching that specific race and treating it as "already
 * following" makes this safe under real double-taps, not just scripted
 * single clicks. */
export async function followWriter(followerId: string, writerId: string): Promise<FollowResult> {
  if (followerId === writerId) return { error: "cannot_follow_self" };

  let created = false;
  try {
    await prisma.follow.create({ data: { followerId, writerId } });
    created = true;
  } catch (error) {
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isDuplicate) throw error;
  }

  if (created) {
    const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { name: true } });
    await createNotification({
      userId: writerId,
      type: "NEW_FOLLOWER",
      title: "You have a new follower",
      body: `${follower?.name ?? "Someone"} started following you on Kekere.`,
      link: `/kekere/writer/${writerId}`,
    });
  }

  const followerCount = await prisma.follow.count({ where: { writerId } });
  return created ? { success: true, followerCount } : { already_following: true, followerCount };
}

export async function unfollowWriter(followerId: string, writerId: string): Promise<{ followerCount: number }> {
  await prisma.follow.deleteMany({ where: { followerId, writerId } });
  const followerCount = await prisma.follow.count({ where: { writerId } });
  return { followerCount };
}

export async function isFollowing(followerId: string, writerId: string): Promise<boolean> {
  const row = await prisma.follow.findUnique({
    where: { followerId_writerId: { followerId, writerId } },
    select: { id: true },
  });
  return !!row;
}

export async function getFollowerCount(writerId: string): Promise<number> {
  return prisma.follow.count({ where: { writerId } });
}

export interface FollowedWriter {
  id: string;
  name: string;
  avatarColor: string | null;
  avatar: string | null;
  followedAt: Date;
  publishedCount: number;
  rating: RatingSummary;
}

/** Writers this reader follows, most recently followed first — powers the
 * self-profile "Following" list. Each writer's published-story count and
 * rating come from one batched query (getWriterStatsBatch) rather than a
 * query per followed writer. */
export async function getFollowingWriters(followerId: string): Promise<FollowedWriter[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      writer: { select: { id: true, name: true, avatarColor: true, avatar: true } },
    },
  });

  const stats = await getWriterStatsBatch(rows.map((r) => r.writer.id));

  return rows.map((r) => ({
    id: r.writer.id,
    name: r.writer.name,
    avatarColor: r.writer.avatarColor,
    avatar: r.writer.avatar,
    followedAt: r.createdAt,
    publishedCount: stats.get(r.writer.id)?.publishedCount ?? 0,
    rating: stats.get(r.writer.id)?.rating ?? { average: null, count: 0 },
  }));
}

/**
 * Notifies every follower that this writer just published a new story.
 * Fire-and-forget from the caller's perspective (never throws) — a
 * newly-published story must go live even if the notification fan-out
 * fails. Uses createMany (one query) rather than one createNotification
 * call per follower, since a popular writer could have many.
 */
export async function notifyFollowersOfPublish(storyId: string): Promise<void> {
  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { title: true, authorId: true, author: { select: { name: true } } },
    });
    if (!story) return;

    const followers = await prisma.follow.findMany({
      where: { writerId: story.authorId },
      select: { followerId: true },
    });
    if (followers.length === 0) return;

    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        type: "WRITER_PUBLISHED" as const,
        title: `New from ${story.author.name}`,
        body: `${story.author.name} just published "${story.title}."`,
        link: `/kekere/story/${storyId}`,
      })),
    });
  } catch (error) {
    console.error("[kekere-follows] notifyFollowersOfPublish failed:", error);
  }
}
