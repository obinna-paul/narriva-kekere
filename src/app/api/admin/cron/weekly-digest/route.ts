export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSignatureRow } from "@/lib/data/kekere-taste";
import { getLatestFollowedWriterStory } from "@/lib/data/kekere-follows";
import { getRecentNoteReply } from "@/lib/data/kekere-notes";
import { countPublishedStoriesSince } from "@/lib/data/kekere-stories";
import { getEmailRecipient } from "@/lib/notifications/email-preferences";
import { sendEmail } from "@/lib/email/send";
import { renderWeeklyDigestEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/content/decisions";
import type { DigestItem } from "@/lib/email/templates/weekly-digest";

const CADENCE_DAYS = 7;
// One cron invocation processes at most this many candidates — keeps a
// single run inside a serverless function's execution budget. Ordering
// candidates by lastDigestSentAt ascending (nulls/never-sent first) means a
// batch cap doesn't strand anyone forever: whoever's most overdue always
// gets covered first, and a weekly cadence gives plenty of runway to work
// through a growing user base over successive weeks.
const BATCH_SIZE = 300;

/**
 * Weekly personalized "for you" digest. Reuses the exact signal functions
 * that already power the feed's personalization and greeting — no new
 * computation, just re-querying them on a wider (7-day) window and
 * assembling whatever's non-empty into an email. A user with genuinely
 * nothing new this week gets no email at all (and isn't marked as sent, so
 * next week's run tries again with a wider window) — the whole point of
 * this cadence is not to manufacture an email out of silence.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - CADENCE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      emailNotificationsEnabled: true,
      OR: [{ lastDigestSentAt: null }, { lastDigestSentAt: { lt: cutoff } }],
    },
    select: { id: true, lastDigestSentAt: true },
    orderBy: { lastDigestSentAt: { sort: "asc", nulls: "first" } },
    take: BATCH_SIZE,
  });

  let sent = 0;
  let skipped = 0;

  await Promise.allSettled(
    candidates.map(async ({ id: userId, lastDigestSentAt }) => {
      const recipient = await getEmailRecipient(userId);
      if (!recipient) {
        skipped++;
        return;
      }

      const since = lastDigestSentAt ?? cutoff;

      const [signatureRow, followedWriterStory, recentReply, newStoriesCount] = await Promise.all([
        getSignatureRow(userId),
        getLatestFollowedWriterStory(userId, CADENCE_DAYS),
        getRecentNoteReply(userId, CADENCE_DAYS),
        countPublishedStoriesSince(since),
      ]);

      const items: DigestItem[] = [];

      if (followedWriterStory) {
        items.push({
          emoji: "✍️",
          title: `New from ${followedWriterStory.writerName}`,
          detail: `"${followedWriterStory.storyTitle}" just went live — you follow ${followedWriterStory.writerName}.`,
          url: `${SITE_URL}/kekere/story/${followedWriterStory.storyId}`,
        });
      }

      if (recentReply) {
        items.push({
          emoji: "💬",
          title: "You've got a reply waiting",
          detail: `${recentReply.writerName} replied to a note you sent.`,
          url: `${SITE_URL}/kekere/notes`,
        });
      }

      if (signatureRow) {
        items.push({
          emoji: "✨",
          title: signatureRow.title,
          detail: `A row picked just for you, based on what you've been reading.`,
          url: `${SITE_URL}/kekere/feed`,
        });
      }

      if (newStoriesCount > 0) {
        items.push({
          emoji: "📚",
          title: `${newStoriesCount} new ${newStoriesCount === 1 ? "story" : "stories"} since your last visit`,
          detail: "Fresh from the feed — see what's new.",
          url: `${SITE_URL}/kekere/feed`,
        });
      }

      if (items.length === 0) {
        skipped++;
        return; // nothing worth emailing about — don't manufacture a digest, don't bump lastDigestSentAt
      }

      const html = await renderWeeklyDigestEmail({ name: recipient.name, items, unsubscribeUrl: recipient.unsubscribeUrl });
      await sendEmail({
        to: recipient.email,
        subject: "Your week on Kekere Stories",
        body: `Hi ${recipient.name}, here's what's new for you this week on Kekere Stories: ${items.map((i) => i.title).join("; ")}. ${SITE_URL}/kekere/feed`,
        html,
      });
      await prisma.user.update({ where: { id: userId }, data: { lastDigestSentAt: now } });
      sent++;
    }),
  );

  return NextResponse.json({ candidates: candidates.length, sent, skipped });
}
