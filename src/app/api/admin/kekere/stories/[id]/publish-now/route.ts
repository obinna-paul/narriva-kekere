export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { nextSlugForTitle } from "@/lib/data/kekere-slugs";
import { promotePendingEditsWithoutReview } from "@/lib/data/kekere-review-flow";
import { notifyFollowersOfPublish } from "@/lib/data/kekere-follows";
import { createNotification } from "@/lib/notifications/create";
import { createKemiNudge } from "@/lib/data/kekere-kemi-nudges";
import { sendEmail } from "@/lib/email/send";
import { renderStoryLiveEmail } from "@/lib/email/templates";
import { KEKERE_SUBMISSIONS_FROM } from "@/lib/constants";
import { SITE_URL } from "@/content/decisions";

/**
 * Pushes a story from ACCEPTED to PUBLISHED — the story has already been
 * through the full editorial pipeline and the writer has signed the contract.
 * This is the final step: sets isDraft=false, assigns a permanent slug,
 * sets publishedAt, and notifies the writer and their followers.
 */
export const PUT = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };

    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        title: true,
        authorId: true,
        author: { select: { name: true, email: true } },
      },
    });

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Story is not in the publishing queue" }, { status: 400 });
    }

    // Any admin working-copy edits still pending (editedBody/editedHookLine)
    // apply here rather than being silently dropped — this is the direct-
    // publish path an admin takes specifically when they've decided those
    // edits don't need another writer approval round.
    await promotePendingEditsWithoutReview(id);

    const publishedAt = new Date();

    const slug = await withSlugRetry(() =>
      prisma.$transaction(async (tx) => {
        const s = await nextSlugForTitle(tx, story.title);
        await tx.story.update({
          where: { id },
          data: { status: "PUBLISHED", isDraft: false, publishedAt, slug: s },
        });
        return s;
      }),
    );

    // Fire-and-forget notifications
    notifyFollowersOfPublish(id).catch(console.error);

    // The notification and email below are the formal announcement; this is
    // Kemi reacting like a person who's been following the work. Different
    // channel, different register — she says it in chat, warmly, next time
    // the writer opens her.
    createKemiNudge({
      userId: story.authorId,
      kind: "STORY_PUBLISHED",
      storyTitle: story.title,
      storySlug: slug,
    }).catch(console.error);

    createNotification({
      userId: story.authorId,
      type: "WRITER_PUBLISHED",
      title: `"${story.title}" is now live!`,
      body: "Your story is now live on Kekere Stories. Readers can find and unlock it right now.",
      link: `/kekere/story/${slug ?? id}`,
    }).catch(console.error);

    const storyUrl = `${SITE_URL}/kekere/story/${slug ?? id}`;
    renderStoryLiveEmail({ writerName: story.author.name, storyTitle: story.title, storyUrl })
      .then((html) =>
        sendEmail({
          to: story.author.email,
          subject: `"${story.title}" is now live — Kekere Stories`,
          body: `Hi ${story.author.name},\n\n"${story.title}" just went live on Kekere Stories. Readers can find and unlock it right now.\n\nSee it here: ${storyUrl}\n\nEvery time someone unlocks it, 70% of the cowrie payment comes directly to your writer wallet.\n\nKemi, from the Kekere Stories editorial team`,
          html,
          from: KEKERE_SUBMISSIONS_FROM,
        }),
      )
      .catch(console.error);

    return NextResponse.json({ success: true, slug, publishedAt: publishedAt.toISOString() });
  },
  { roles: ["ADMIN"] },
);

async function withSlugRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return fn();
    }
    throw err;
  }
}
