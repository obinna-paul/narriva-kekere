import { Prisma, type StoryTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderStoryAcceptedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_SUBMISSIONS_FROM, SUPPORT_EMAIL } from "@/lib/constants";
import { renderContractBody } from "@/lib/contracts/render";
import { SITE_URL } from "@/content/decisions";
import type { TiptapDoc } from "@/lib/tiptap/doc-utils";
import { listEditorialComments, type EditorialCommentDTO } from "@/lib/data/kekere-editorial-comments";
import { WRITER_EARNINGS_RATE } from "@/content/decisions";

/**
 * The editorial review → contract flow. Two consents in order: the writer
 * approves the *edits* (CHANGES_PROPOSED → they accept), then signs the
 * *contract* (PENDING_CONTRACT → sign route → PUBLISHED). Publishing terms
 * (price/tier/tags/cover/rating) are captured when the admin sends the edits,
 * so acceptance can go straight to the contract.
 */

export class ReviewFlowError extends Error {
  constructor(public code: "not_found" | "illegal_state" | "forbidden" | "no_template", message: string) {
    super(message);
    this.name = "ReviewFlowError";
  }
}

export interface PublishingTerms {
  cowrieCost: number;
  tier: StoryTier;
  tagIds: string[];
  coverImageRef?: string;
  isAdult?: boolean;
}

/** Sets the publishing terms + tags on a story row (does NOT change status).
 * Shared by the no-edits fast path (publish route) and send-edits-to-writer. */
export async function setPublishingTerms(storyId: string, terms: PublishingTerms): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.story.update({
      where: { id: storyId },
      data: {
        cowrieCost: terms.cowrieCost,
        tier: terms.tier,
        ...(terms.coverImageRef ? { coverImageRef: terms.coverImageRef } : {}),
        ...(terms.isAdult !== undefined ? { isAdult: terms.isAdult } : {}),
      },
    });
    await tx.storyTag.deleteMany({ where: { storyId } });
    await tx.storyTag.createMany({
      data: terms.tagIds.map((tagId) => ({ storyId, tagId })),
      skipDuplicates: true,
    });
  });
}

export interface FinalizeContractResult {
  contractId: string;
  writerName: string;
  expiresAt: Date;
}

/**
 * Promotes the editorial working copy to the live story (snapshotting the
 * writer's original), creates the PENDING publishing contract, moves the story
 * to PENDING_CONTRACT, and sends the acceptance email + in-app notification.
 * Assumes the publishing terms (cowrieCost/tier/tags/cover/rating) are already
 * set on the row. Shared by the publish route's fast path and writer accept.
 */
export async function finalizeContract(
  storyId: string,
  opts: { expiresInDays?: number } = {},
): Promise<FinalizeContractResult> {
  const expiresInDays = opts.expiresInDays ?? 14;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");

  const template = await prisma.kekereContractTemplate.findFirst({
    where: { contractType: "PUBLISHING" },
    orderBy: { createdAt: "desc" },
  });
  if (!template) throw new ReviewFlowError("no_template", "No publishing contract template found.");

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const rendered = renderContractBody(
    template.body,
    {
      story_title: story.title,
      writer_name: story.author.name,
      cowrie_cost: String(story.cowrieCost),
      genre: story.genre,
      date: dateStr,
    },
    template.variables,
  );
  if (rendered.missing) {
    throw new ReviewFlowError("illegal_state", "contract_template_missing_vars");
  }

  const hasEditedBody = story.editedBody != null;
  const promotedHookLine = story.editedHookLine ?? story.hookLine;
  const promotedWordCount = hasEditedBody ? (story.editedWordCount ?? story.wordCount ?? 0) : (story.wordCount ?? 0);
  const promotedReadingTime = hasEditedBody
    ? (story.editedReadingTime ?? Math.max(1, Math.round(promotedWordCount / 200)))
    : story.readingTime;

  const expiresAt = new Date(now.getTime() + expiresInDays * 86400000);

  const contract = await prisma.$transaction(async (tx) => {
    if (hasEditedBody) {
      const last = await tx.storyVersion.findFirst({
        where: { storyId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      await tx.storyVersion.create({
        data: {
          storyId,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          content: story.body as object,
          wordCount: story.wordCount ?? 0,
          label: "Submitted — writer's original",
        },
      });
    }

    await tx.story.update({
      where: { id: storyId },
      data: {
        isDraft: false,
        hookLine: promotedHookLine,
        ...(hasEditedBody
          ? { body: story.editedBody as Prisma.InputJsonValue, wordCount: promotedWordCount, readingTime: promotedReadingTime }
          : {}),
        status: "PENDING_CONTRACT",
        editedBody: Prisma.DbNull,
        editedHookLine: null,
        editedWordCount: null,
        editedReadingTime: null,
        editLastSavedAt: null,
        editSummaryNote: null,
        editWriterNote: null,
      },
    });

    return tx.kekereContract.create({
      data: {
        templateId: template.id,
        writerId: story.author.id,
        storyId,
        body: rendered.rendered!,
        status: "PENDING",
        expiresAt,
        sentAt: now,
      },
    });
  });

  const contractUrl = `${SITE_URL}/kekere/contracts`;
  const acceptedHtml = await renderStoryAcceptedEmail({
    writerName: story.author.name,
    storyTitle: story.title,
    cowrieCost: story.cowrieCost,
    expiresInDays,
    contractUrl,
  }).catch(() => undefined);
  await sendEmail({
    to: story.author.email,
    subject: `"${story.title}" has been accepted for publishing — Kekere Stories`,
    body: `Hi ${story.author.name},\n\nGreat news — your story "${story.title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nHere are the publishing terms:\n• Price to readers: ${story.cowrieCost} cowrie${story.cowrieCost !== 1 ? "s" : ""}\n• Your earnings: 70% of every sale\n\nA publishing contract is waiting for you in the app. Open Kekere Stories, check your notifications, and sign it with one tap. Your story goes live the moment you sign.\n\nThe contract offer expires in ${expiresInDays} days — please sign before then.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
    from: KEKERE_SUBMISSIONS_FROM,
    html: acceptedHtml,
  });

  await createNotification({
    userId: story.author.id,
    type: "CONTRACT_RECEIVED",
    title: `Publishing contract for "${story.title}"`,
    body: "Your story has been accepted! Tap to review and sign your publishing contract — it goes live the moment you sign.",
    link: `/kekere/contracts`,
  });

  return { contractId: contract.id, writerName: story.author.name, expiresAt };
}

/**
 * Admin sends the editorial working copy + comments to the writer for
 * approval. Captures the publishing terms now (so acceptance can go straight
 * to the contract) and moves the story to CHANGES_PROPOSED. No promotion, no
 * contract yet.
 */
export async function sendEditsToWriter(
  storyId: string,
  input: PublishingTerms & { summaryNote?: string },
): Promise<{ writerName: string }> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");
  if (story.status !== "SUBMITTED" && story.status !== "REVISIONS_REQUESTED") {
    throw new ReviewFlowError("illegal_state", `Can't send edits while the story is ${story.status}.`);
  }

  await setPublishingTerms(storyId, input);
  await prisma.story.update({
    where: { id: storyId },
    data: {
      status: "CHANGES_PROPOSED",
      editSummaryNote: input.summaryNote?.trim() || null,
      editWriterNote: null,
    },
  });

  const reviewUrl = `${SITE_URL}/kekere/review/${storyId}`;
  await createNotification({
    userId: story.author.id,
    type: "EDITS_PROPOSED",
    title: `Edits to review on "${story.title}"`,
    body: "Our editor has proposed some changes to your story. Review them and accept before it goes to contract.",
    link: `/kekere/review/${storyId}`,
  });
  await sendEmail({
    to: story.author.email,
    subject: `Edits to review on "${story.title}" — Kekere Stories`,
    body: `Hi ${story.author.name},\n\nOur editor has reviewed "${story.title}" and proposed some changes for you to look over. Nothing is published yet — your story only moves forward once you accept the edits.\n\nReview them here: ${reviewUrl}\n\nYou can accept the changes, or send them back with a note if something isn't right.\n\nThe Kekere Stories Team`,
    from: KEKERE_SUBMISSIONS_FROM,
  });

  return { writerName: story.author.name };
}

export interface WriterReview {
  storyId: string;
  title: string;
  originalHookLine: string;
  editedHookLine: string;
  hookLineChanged: boolean;
  originalBody: TiptapDoc;
  editedBody: TiptapDoc;
  bodyChanged: boolean;
  comments: EditorialCommentDTO[];
  summaryNote: string | null;
  cowrieCost: number;
  writerSharePercent: number;
}

/**
 * Everything the writer's review screen needs — the original vs proposed text
 * (for the diff), the editorial comments, the admin's cover note, and the
 * pending terms. Returns null if the story isn't theirs or isn't awaiting
 * their approval.
 */
export async function getWriterReview(storyId: string, writerId: string): Promise<WriterReview | null> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      authorId: true,
      status: true,
      title: true,
      hookLine: true,
      body: true,
      editedHookLine: true,
      editedBody: true,
      editSummaryNote: true,
      cowrieCost: true,
    },
  });
  if (!story || story.authorId !== writerId || story.status !== "CHANGES_PROPOSED") return null;

  const originalBody = story.body as unknown as TiptapDoc;
  const editedBody = (story.editedBody ?? story.body) as unknown as TiptapDoc;
  const editedHookLine = story.editedHookLine ?? story.hookLine;
  const comments = await listEditorialComments(storyId);

  return {
    storyId: story.id,
    title: story.title,
    originalHookLine: story.hookLine,
    editedHookLine,
    hookLineChanged: editedHookLine !== story.hookLine,
    originalBody,
    editedBody,
    bodyChanged: JSON.stringify(originalBody) !== JSON.stringify(editedBody),
    comments,
    summaryNote: story.editSummaryNote,
    cowrieCost: story.cowrieCost,
    writerSharePercent: Math.round(WRITER_EARNINGS_RATE * 100),
  };
}

/** Writer accepts the proposed edits → promote + go to contract. */
export async function writerAcceptEdits(storyId: string, writerId: string): Promise<FinalizeContractResult> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, status: true },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");
  if (story.authorId !== writerId) throw new ReviewFlowError("forbidden", "Not your story");
  if (story.status !== "CHANGES_PROPOSED") {
    throw new ReviewFlowError("illegal_state", "There are no edits awaiting your approval on this story.");
  }

  // The editorial notes have served their purpose once the writer accepts.
  await prisma.editorialComment.updateMany({
    where: { storyId, status: "OPEN" },
    data: { status: "RESOLVED" },
  });

  return finalizeContract(storyId);
}

/** Writer rejects the proposed edits → back to the admin queue with a note. */
export async function writerRequestChanges(storyId: string, writerId: string, note: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");
  if (story.authorId !== writerId) throw new ReviewFlowError("forbidden", "Not your story");
  if (story.status !== "CHANGES_PROPOSED") {
    throw new ReviewFlowError("illegal_state", "There are no edits awaiting your approval on this story.");
  }

  // Back to the moderation queue (SUBMITTED) so the admin can revise; the
  // working copy and editorial comments are kept intact for the next pass.
  await prisma.story.update({
    where: { id: storyId },
    data: { status: "SUBMITTED", editWriterNote: note.trim() },
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${story.author.name} requested changes to the edits on "${story.title}"`,
    body: `Writer: ${story.author.name} (${story.author.email})\nStory: ${story.title} (${storyId})\n\nTheir note:\n${note.trim()}\n\nThe story is back in the review queue for another editorial pass.`,
  });
}
