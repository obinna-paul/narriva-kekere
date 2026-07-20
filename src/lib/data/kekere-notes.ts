import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/notifications/create";
import { getEmailRecipient } from "@/lib/notifications/email-preferences";
import { containsProfanity } from "@/lib/moderation/profanity";
import { sendEmail } from "@/lib/email/send";
import { renderNoteReplyEmail, renderNoteReceivedEmail } from "@/lib/email/templates";

const MAX_NOTE_LENGTH = 500;

export interface NotePrompt {
  storyId: string;
  storyTitle: string;
  writerId: string;
  writerName: string;
  writerAvatarColor: string | null;
  completedAt: Date;
}

/**
 * Stories this reader has finished, by writers who still accept notes, that
 * don't already have a note sent for them — the "you can send a note now"
 * list. A story disappears from here the moment a note is sent for it (the
 * unique constraint is per story, not per writer), matching "one note per
 * story, finish another to unlock another slot."
 */
export async function getAvailablePrompts(readerId: string): Promise<NotePrompt[]> {
  const [completions, sentStoryIds, blockedByWriterIds] = await Promise.all([
    prisma.storyCompletion.findMany({
      where: { userId: readerId, story: { authorId: { not: readerId } } },
      orderBy: { completedAt: "desc" },
      select: {
        completedAt: true,
        story: {
          select: {
            id: true,
            title: true,
            author: { select: { id: true, name: true, avatarColor: true, notesEnabled: true } },
          },
        },
      },
    }),
    prisma.note.findMany({ where: { fromUserId: readerId }, select: { storyId: true } }),
    prisma.noteBlock.findMany({ where: { blockedUserId: readerId }, select: { writerId: true } }),
  ]);

  const sent = new Set(sentStoryIds.map((s) => s.storyId));
  const blockedBy = new Set(blockedByWriterIds.map((b) => b.writerId));

  // A reader may finish the same story more than once (StoryCompletion has
  // no per-completion uniqueness beyond userId+storyId, but dedupe here
  // defensively) — one prompt per story either way.
  const seen = new Set<string>();
  const prompts: NotePrompt[] = [];
  for (const c of completions) {
    const story = c.story;
    if (seen.has(story.id) || sent.has(story.id)) continue;
    if (!story.author.notesEnabled || blockedBy.has(story.author.id)) continue;
    seen.add(story.id);
    prompts.push({
      storyId: story.id,
      storyTitle: story.title,
      writerId: story.author.id,
      writerName: story.author.name,
      writerAvatarColor: story.author.avatarColor,
      completedAt: c.completedAt,
    });
  }
  return prompts;
}

export interface NoteEligibility {
  eligible: boolean;
  alreadySent: boolean;
}

/** Single-story eligibility check for the completion screen — cheaper than
 * fetching the whole prompts list to check one story. Doesn't re-check
 * StoryCompletion: only ever called from the completion page, which is
 * itself unreachable without having just finished the story. */
export async function getNoteEligibilityForStory(readerId: string, storyId: string): Promise<NoteEligibility> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, author: { select: { notesEnabled: true } } },
  });
  if (!story || story.authorId === readerId) return { eligible: false, alreadySent: false };

  const [existing, blocked] = await Promise.all([
    prisma.note.findUnique({ where: { fromUserId_storyId: { fromUserId: readerId, storyId } } }),
    prisma.noteBlock.findUnique({
      where: { writerId_blockedUserId: { writerId: story.authorId, blockedUserId: readerId } },
    }),
  ]);

  if (existing) return { eligible: false, alreadySent: true };
  if (!story.author.notesEnabled || blocked) return { eligible: false, alreadySent: false };
  return { eligible: true, alreadySent: false };
}

export type SendNoteResult =
  | { success: true; noteId: string }
  | { error: "not_completed" | "already_sent" | "notes_disabled" | "blocked" | "empty" | "too_long" | "profanity" | "cannot_note_self" };

export async function sendNote(fromUserId: string, storyId: string, body: string): Promise<SendNoteResult> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "empty" };
  if (trimmed.length > MAX_NOTE_LENGTH) return { error: "too_long" };
  if (containsProfanity(trimmed)) return { error: "profanity" };

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, title: true, author: { select: { notesEnabled: true } } },
  });
  if (!story) return { error: "not_completed" };
  if (story.authorId === fromUserId) return { error: "cannot_note_self" };
  if (!story.author.notesEnabled) return { error: "notes_disabled" };

  const [completed, blocked] = await Promise.all([
    prisma.storyCompletion.findUnique({ where: { userId_storyId: { userId: fromUserId, storyId } } }),
    prisma.noteBlock.findUnique({
      where: { writerId_blockedUserId: { writerId: story.authorId, blockedUserId: fromUserId } },
    }),
  ]);
  if (!completed) return { error: "not_completed" };
  if (blocked) return { error: "blocked" };

  try {
    const note = await prisma.note.create({
      data: { fromUserId, toWriterId: story.authorId, storyId, body: trimmed },
    });

    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true } });
    const readerName = fromUser?.name ?? "A reader";
    await createNotification({
      userId: story.authorId,
      type: "NOTE_RECEIVED",
      title: "You have a new note",
      body: `${readerName} sent you a note about one of your stories.`,
      link: "/kekere/notes",
    });

    // Event-triggered email to the writer, if they haven't opted out — best
    // effort, never blocks the note from being saved.
    const recipient = await getEmailRecipient(story.authorId);
    if (recipient) {
      const html = await renderNoteReceivedEmail({
        writerName: recipient.name,
        readerName,
        storyTitle: story.title,
        unsubscribeUrl: recipient.unsubscribeUrl,
      });
      await sendEmail({
        to: recipient.email,
        subject: `${readerName} sent you a note on Kekere Stories`,
        body: `${readerName} left you a note about "${story.title}." Read it and reply in your Kekere Stories notes inbox.`,
        html,
      }).catch((error) => console.error("[kekere-notes] note-received email failed:", error));
    }

    return { success: true, noteId: note.id };
  } catch {
    // Unique constraint race — someone else's concurrent request for the
    // same (reader, story) pair won first.
    return { error: "already_sent" };
  }
}

export interface SentNote {
  id: string;
  storyId: string;
  storyTitle: string;
  writerName: string;
  body: string;
  createdAt: Date;
  replyBody: string | null;
  repliedAt: Date | null;
}

export async function getReaderNotes(readerId: string): Promise<SentNote[]> {
  const notes = await prisma.note.findMany({
    where: { fromUserId: readerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      storyId: true,
      body: true,
      createdAt: true,
      replyBody: true,
      repliedAt: true,
      story: { select: { title: true } },
      toWriter: { select: { name: true } },
    },
  });

  return notes.map((n) => ({
    id: n.id,
    storyId: n.storyId,
    storyTitle: n.story.title,
    writerName: n.toWriter.name,
    body: n.body,
    createdAt: n.createdAt,
    replyBody: n.replyBody,
    repliedAt: n.repliedAt,
  }));
}

/** Most recent reply a writer sent this reader, within the recency window —
 *  powers the "you've got a reply waiting" feed greeting. There's no
 *  reader-facing "seen" flag on Note (its `read` field is the writer's own
 *  inbox state), so recency is used as the "still worth surfacing" proxy
 *  instead of true unseen-state. */
export async function getRecentNoteReply(readerId: string, withinDays = 14): Promise<{ writerName: string } | null> {
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const note = await prisma.note.findFirst({
    where: { fromUserId: readerId, replyBody: { not: null }, repliedAt: { gte: since } },
    orderBy: { repliedAt: "desc" },
    select: { toWriter: { select: { name: true } } },
  });
  return note ? { writerName: note.toWriter.name } : null;
}

export interface InboxNote {
  id: string;
  storyId: string;
  storyTitle: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatarColor: string | null;
  body: string;
  createdAt: Date;
  read: boolean;
  replyBody: string | null;
  repliedAt: Date | null;
}

/** Blocking a sender (or a global notes-off toggle, handled by the caller
 * not fetching at all) hides their notes here without deleting any data —
 * reported notes are hidden the same way. */
export async function getWriterInbox(writerId: string): Promise<InboxNote[]> {
  const blocked = await prisma.noteBlock.findMany({ where: { writerId }, select: { blockedUserId: true } });
  const blockedIds = blocked.map((b) => b.blockedUserId);

  const notes = await prisma.note.findMany({
    where: { toWriterId: writerId, reported: false, fromUserId: { notIn: blockedIds } },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      storyId: true,
      body: true,
      createdAt: true,
      read: true,
      replyBody: true,
      repliedAt: true,
      story: { select: { title: true } },
      fromUser: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  return notes.map((n) => ({
    id: n.id,
    storyId: n.storyId,
    storyTitle: n.story.title,
    fromUserId: n.fromUser.id,
    fromUserName: n.fromUser.name,
    fromUserAvatarColor: n.fromUser.avatarColor,
    body: n.body,
    createdAt: n.createdAt,
    read: n.read,
    replyBody: n.replyBody,
    repliedAt: n.repliedAt,
  }));
}

export async function getUnreadNoteCount(writerId: string): Promise<number> {
  const blocked = await prisma.noteBlock.findMany({ where: { writerId }, select: { blockedUserId: true } });
  return prisma.note.count({
    where: {
      toWriterId: writerId,
      read: false,
      reported: false,
      fromUserId: { notIn: blocked.map((b) => b.blockedUserId) },
    },
  });
}

async function assertOwnedByWriter(noteId: string, writerId: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { toWriterId: true } });
  if (!note || note.toWriterId !== writerId) return null;
  return note;
}

export async function markNoteRead(noteId: string, writerId: string): Promise<boolean> {
  const note = await assertOwnedByWriter(noteId, writerId);
  if (!note) return false;
  await prisma.note.update({ where: { id: noteId }, data: { read: true } });
  return true;
}

export type ReplyResult = { success: true } | { error: "not_found" | "already_replied" | "empty" | "too_long" | "profanity" };

export async function replyToNote(noteId: string, writerId: string, replyBody: string): Promise<ReplyResult> {
  const trimmed = replyBody.trim();
  if (!trimmed) return { error: "empty" };
  if (trimmed.length > MAX_NOTE_LENGTH) return { error: "too_long" };
  if (containsProfanity(trimmed)) return { error: "profanity" };

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { toWriterId: true, replyBody: true, fromUserId: true, storyId: true, story: { select: { title: true } } },
  });
  if (!note || note.toWriterId !== writerId) return { error: "not_found" };
  if (note.replyBody !== null) return { error: "already_replied" };

  await prisma.note.update({
    where: { id: noteId },
    data: { replyBody: trimmed, repliedAt: new Date(), read: true },
  });

  const writer = await prisma.user.findUnique({ where: { id: writerId }, select: { name: true } });
  await createNotification({
    userId: note.fromUserId,
    type: "NOTE_REPLIED",
    title: "You got a reply",
    body: `${writer?.name ?? "The writer"} replied to your note.`,
    link: "/kekere/notes",
  });

  const recipient = await getEmailRecipient(note.fromUserId);
  if (recipient) {
    const html = await renderNoteReplyEmail({
      readerName: recipient.name,
      writerName: writer?.name ?? "The writer",
      storyTitle: note.story.title,
      unsubscribeUrl: recipient.unsubscribeUrl,
    });
    await sendEmail({
      to: recipient.email,
      subject: `${writer?.name ?? "The writer"} replied to your note`,
      body: `${writer?.name ?? "The writer"} replied to the note you sent about "${note.story.title}." Read it in your Kekere Stories notes inbox.`,
      html,
    });
  }

  return { success: true };
}

export async function reportNote(noteId: string, writerId: string): Promise<boolean> {
  const note = await assertOwnedByWriter(noteId, writerId);
  if (!note) return false;
  await prisma.note.update({ where: { id: noteId }, data: { reported: true, reportedAt: new Date() } });
  return true;
}

export async function blockSender(writerId: string, blockedUserId: string): Promise<void> {
  await prisma.noteBlock.upsert({
    where: { writerId_blockedUserId: { writerId, blockedUserId } },
    create: { writerId, blockedUserId },
    update: {},
  });
}

export async function unblockSender(writerId: string, blockedUserId: string): Promise<void> {
  await prisma.noteBlock.deleteMany({ where: { writerId, blockedUserId } });
}

export interface BlockedSender {
  id: string;
  name: string;
  avatarColor: string | null;
  blockedAt: Date;
}

export async function getBlockedSenders(writerId: string): Promise<BlockedSender[]> {
  const rows = await prisma.noteBlock.findMany({
    where: { writerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, blockedUser: { select: { id: true, name: true, avatarColor: true } } },
  });
  return rows.map((r) => ({
    id: r.blockedUser.id,
    name: r.blockedUser.name,
    avatarColor: r.blockedUser.avatarColor,
    blockedAt: r.createdAt,
  }));
}

export async function setNotesEnabled(writerId: string, enabled: boolean): Promise<void> {
  await prisma.user.update({ where: { id: writerId }, data: { notesEnabled: enabled } });
}

export async function getNotesEnabled(writerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: writerId }, select: { notesEnabled: true } });
  return user?.notesEnabled ?? true;
}
