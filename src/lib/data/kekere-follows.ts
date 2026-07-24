import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/notifications/create";
import { getEmailRecipient, getEmailRecipientsBatch } from "@/lib/notifications/email-preferences";
import { getWriterStatsBatch } from "@/lib/data/kekere-writer-profile";
import { sendEmail } from "@/lib/email/send";
import { renderWriterPublishedEmail, renderNewFollowerEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/content/decisions";
import type { RatingSummary } from "@/lib/data/kekere-ratings";
import { userAvatarUrl } from "@/lib/storage/cloudinary-urls";

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
    const followerName = follower?.name ?? "Someone";
    await createNotification({
      userId: writerId,
      type: "NEW_FOLLOWER",
      title: "You have a new follower",
      body: `${followerName} started following you on Kekere.`,
      link: `/kekere/writer/${writerId}`,
    });

    // Event-triggered email to the writer, if they haven't opted out — best
    // effort, never blocks the follow itself.
    const recipient = await getEmailRecipient(writerId);
    if (recipient) {
      const html = await renderNewFollowerEmail({
        writerName: recipient.name,
        followerName,
        followerId,
        unsubscribeUrl: recipient.unsubscribeUrl,
      });
      await sendEmail({
        to: recipient.email,
        subject: `${followerName} started following you on Kekere Stories`,
        body: `${followerName} just started following you on Kekere Stories. They'll hear from us whenever you publish something new.`,
        html,
      }).catch((error) => console.error("[kekere-follows] new-follower email failed:", error));
    }
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

export interface FollowerAvatar {
  id: string;
  name: string;
  avatar: string | null;
  // Precomputed here, not by the client — CLOUDINARY_CLOUD_NAME isn't
  // NEXT_PUBLIC_-prefixed, so a "use client" component calling
  // userAvatarUrl(avatar) itself would build a URL with an empty cloud
  // name and every avatar would 404. See cloudinary-urls.ts's doc comment.
  avatarUrl: string | null;
  avatarColor: string | null;
}

/** Most recently followed first — powers the small stack of follower
 * avatars next to the count on a public writer profile (social proof at a
 * glance, not a full follower list). */
export async function getRecentFollowerAvatars(writerId: string, limit = 6): Promise<FollowerAvatar[]> {
  const rows = await prisma.follow.findMany({
    where: { writerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { follower: { select: { id: true, name: true, avatar: true, avatarColor: true } } },
  });
  return rows.map((r) => ({ ...r.follower, avatarUrl: r.follower.avatar ? userAvatarUrl(r.follower.avatar) : null }));
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

/** The most recent published story from anyone this reader follows, within
 *  the recency window — powers the "new from a writer you follow" feed
 *  greeting. Queried directly against Story rather than the notification
 *  fan-out table, so it stays correct even if a notification was dismissed
 *  or never generated (e.g. a follow created after the story went live). */
export async function getLatestFollowedWriterStory(
  userId: string,
  withinDays = 14
): Promise<{ storyId: string; writerName: string; storyTitle: string } | null> {
  const following = await prisma.follow.findMany({ where: { followerId: userId }, select: { writerId: true } });
  if (following.length === 0) return null;

  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const story = await prisma.story.findFirst({
    where: {
      authorId: { in: following.map((f) => f.writerId) },
      status: "PUBLISHED",
      publishedAt: { gte: since },
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, author: { select: { name: true } } },
  });

  return story ? { storyId: story.id, writerName: story.author.name, storyTitle: story.title } : null;
}

/**
 * Notifies every follower that this writer just published a new story —
 * both in-app and, for whoever hasn't opted out, by email. Fire-and-forget
 * from the caller's perspective (never throws) — a newly-published story
 * must go live even if the notification fan-out fails. The in-app
 * notifications use createMany (one query) rather than one createNotification
 * call per follower, since a popular writer could have many; email sends
 * are still one Resend call per recipient (there's no batch-send API in
 * sendEmail), but Promise.allSettled means one bad address can't block the
 * rest, and getEmailRecipientsBatch keeps the opt-out/token lookup to a
 * single query regardless of follower count.
 */
export async function notifyFollowersOfPublish(storyId: string): Promise<void> {
  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { title: true, slug: true, authorId: true, author: { select: { name: true } } },
    });
    if (!story) return;
    const storyPath = story.slug ?? storyId;

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
        link: `/kekere/story/${storyPath}`,
      })),
    });

    const recipients = await getEmailRecipientsBatch(followers.map((f) => f.followerId));
    await Promise.allSettled(
      Array.from(recipients.values()).map(async (recipient) => {
        const html = await renderWriterPublishedEmail({
          followerName: recipient.name,
          writerName: story.author.name,
          storyTitle: story.title,
          storyId: storyPath,
          unsubscribeUrl: recipient.unsubscribeUrl,
        });
        await sendEmail({
          to: recipient.email,
          subject: `New from ${story.author.name} on Kekere Stories`,
          body: `${story.author.name}, a writer you follow, just published "${story.title}." Read it: ${SITE_URL}/kekere/story/${storyPath}`,
          html,
        });
      }),
    );
  } catch (error) {
    console.error("[kekere-follows] notifyFollowersOfPublish failed:", error);
  }
}
