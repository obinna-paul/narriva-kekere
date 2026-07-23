import { Prisma, type StoryTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderStoryAcceptedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_SUBMISSIONS_FROM, SUPPORT_EMAIL } from "@/lib/constants";
import { renderContractBody } from "@/lib/contracts/render";
import { SITE_URL } from "@/content/decisions";
import { countWords, type TiptapDoc } from "@/lib/tiptap/doc-utils";
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

/**
 * Promotes a story's editorial working copy (editedBody/editedHookLine) onto
 * its live fields, snapshotting the pre-promotion body as a StoryVersion
 * first when there's anything to snapshot. Pure data shaping — the caller
 * still has to persist the returned fields and clear the working-copy
 * columns in its own transaction. Shared by finalizeContract (stage 1, first
 * contract) and promotePostContractEdits (stage 2, tracked changes after the
 * contract's already signed).
 */
async function promoteWorkingCopy(
  tx: Prisma.TransactionClient,
  storyId: string,
  story: {
    body: Prisma.JsonValue;
    wordCount: number | null;
    hookLine: string;
    editedBody: Prisma.JsonValue | null;
    editedHookLine: string | null;
    editedWordCount: number | null;
    editedReadingTime: number | null;
    readingTime: number;
  },
  versionLabel: string,
): Promise<{ hookLine: string; wordCount: number; readingTime: number; hasEditedBody: boolean }> {
  const hasEditedBody = story.editedBody != null;
  const promotedHookLine = story.editedHookLine ?? story.hookLine;
  const promotedWordCount = hasEditedBody ? (story.editedWordCount ?? story.wordCount ?? 0) : (story.wordCount ?? 0);
  const promotedReadingTime = hasEditedBody
    ? (story.editedReadingTime ?? Math.max(1, Math.round(promotedWordCount / 200)))
    : story.readingTime;

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
        label: versionLabel,
      },
    });
  }

  return { hookLine: promotedHookLine, wordCount: promotedWordCount, readingTime: promotedReadingTime, hasEditedBody };
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
    include: { author: { select: { id: true, name: true, email: true, createdByAdminId: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");

  // Onboarded/admin-created writers skip the ACCEPTED "to be published" queue
  // and go straight to PUBLISHED the moment they sign — see
  // signContractAndPublishStory in kekere-contracts.ts, which is the other
  // half of this same branch. Checked the same way in both places so the
  // copy sent here always matches what actually happens on signing.
  const isOnboarded = story.author.createdByAdminId != null;

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

  const expiresAt = new Date(now.getTime() + expiresInDays * 86400000);

  const contract = await prisma.$transaction(async (tx) => {
    const promoted = await promoteWorkingCopy(tx, storyId, story, "Submitted — writer's original");

    await tx.story.update({
      where: { id: storyId },
      data: {
        isDraft: false,
        hookLine: promoted.hookLine,
        ...(promoted.hasEditedBody
          ? { body: story.editedBody as Prisma.InputJsonValue, wordCount: promoted.wordCount, readingTime: promoted.readingTime }
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
    isLive: isOnboarded,
  }).catch(() => undefined);
  const signInstruction = isOnboarded
    ? "Your story goes live the moment you sign."
    : "Signing moves your story into our publishing queue, where our editors prepare it for release.";
  await sendEmail({
    to: story.author.email,
    subject: `"${story.title}" has been accepted for publishing — Kekere Stories`,
    body: `Hi ${story.author.name},\n\nGreat news — your story "${story.title}" has been accepted for publishing on Kekere Stories, an imprint of Narriva Publishing.\n\nHere are the publishing terms:\n• Price to readers: ${story.cowrieCost} cowrie${story.cowrieCost !== 1 ? "s" : ""}\n• Your earnings: 70% of every sale\n\nA publishing contract is waiting for you in the app. Open Kekere Stories, check your notifications, and sign it with one tap. ${signInstruction}\n\nThe contract offer expires in ${expiresInDays} days — please sign before then.\n\nThe Kekere Stories Team\n(An imprint of Narriva Publishing)`,
    from: KEKERE_SUBMISSIONS_FROM,
    html: acceptedHtml,
  });

  await createNotification({
    userId: story.author.id,
    type: "CONTRACT_RECEIVED",
    title: `Publishing contract for "${story.title}"`,
    body: isOnboarded
      ? "Your story has been accepted! Tap to review and sign your publishing contract — it goes live the moment you sign."
      : "Your story has been accepted! Tap to review and sign your publishing contract — signing moves it into our publishing queue.",
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

/**
 * Whether a story has already had a contract signed for it — the reliable
 * way to tell a stage-1 (pre-contract) CHANGES_PROPOSED review apart from a
 * stage-2 (post-contract, "to be published" queue) one, since both use the
 * same status value. Derived from the contract itself rather than a
 * separately-set flag, so it can never drift out of sync with reality.
 */
export async function isPostContractStory(storyId: string): Promise<boolean> {
  const signed = await prisma.kekereContract.findFirst({
    where: { storyId, status: "SIGNED" },
    select: { id: true },
  });
  return signed != null;
}

/**
 * Stage 2: the editor has made tracked changes to an already-ACCEPTED
 * (contract signed) story and sends them to the writer for one more round of
 * approval before publishing. Unlike sendEditsToWriter (stage 1), publishing
 * terms are never touched here — they were already locked in when the
 * contract was signed, and re-opening cowrie cost/tier/tags after a writer
 * has agreed to specific terms would be the wrong thing to do.
 */
export async function sendPostContractEditsToWriter(
  storyId: string,
  input: { summaryNote?: string },
): Promise<{ writerName: string }> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");
  if (story.status !== "ACCEPTED") {
    throw new ReviewFlowError("illegal_state", `Can't send edits while the story is ${story.status}.`);
  }

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
    title: `Final changes to review on "${story.title}"`,
    body: "Your contract is signed and your editor has made some changes before publishing. Review them — nothing is live yet.",
    link: `/kekere/review/${storyId}`,
  });
  await sendEmail({
    to: story.author.email,
    subject: `Final changes to review on "${story.title}" — Kekere Stories`,
    body: `Hi ${story.author.name},\n\nYour contract for "${story.title}" is signed, and while preparing it for publication our editor made some changes for you to look over. Nothing is live yet — your story only goes live once you review these changes.\n\nReview them here: ${reviewUrl}\n\nYou can accept the changes, or send them back with a note if something isn't right.\n\nThe Kekere Stories Team`,
    from: KEKERE_SUBMISSIONS_FROM,
  });

  return { writerName: story.author.name };
}

/**
 * The writer's counterpart to sendPostContractEditsToWriter: promotes the
 * approved edits onto the live fields and returns the story to ACCEPTED —
 * no new contract, since the existing one already covers this story. Lets
 * the admin know so they can publish. Mirrors finalizeContract's promotion
 * step but without the contract-creation half.
 */
async function promotePostContractEdits(storyId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");

  await prisma.$transaction(async (tx) => {
    const promoted = await promoteWorkingCopy(tx, storyId, story, "Before stage-2 revision");
    await tx.story.update({
      where: { id: storyId },
      data: {
        hookLine: promoted.hookLine,
        ...(promoted.hasEditedBody
          ? { body: story.editedBody as Prisma.InputJsonValue, wordCount: promoted.wordCount, readingTime: promoted.readingTime }
          : {}),
        status: "ACCEPTED",
        editedBody: Prisma.DbNull,
        editedHookLine: null,
        editedWordCount: null,
        editedReadingTime: null,
        editLastSavedAt: null,
        editSummaryNote: null,
        editWriterNote: null,
      },
    });
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${story.author.name} approved your changes to "${story.title}"`,
    body: `Writer: ${story.author.name} (${story.author.email})\nStory: ${story.title} (${storyId})\n\nThey accepted every change. The story is back in the To Be Published queue — open it and click Publish now when you're ready.`,
  });
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
  /** True once the contract's already signed (stage 2 — a "to be published"
   * story with tracked changes) as opposed to the first, pre-contract pass. */
  isPostContract: boolean;
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
  const [comments, isPostContract] = await Promise.all([
    listEditorialComments(storyId),
    isPostContractStory(storyId),
  ]);

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
    isPostContract,
  };
}

/**
 * Merges the writer's per-paragraph accept/reject decisions into a final doc,
 * walking the editor's proposed (edited) order so accepted new paragraphs keep
 * their place. A rejected *change* reverts that paragraph to the writer's
 * original text; a rejected *new* paragraph is dropped; a rejected *removal*
 * (the editor deleted a paragraph the writer wants kept) re-inserts the
 * original paragraph after its nearest surviving predecessor. Decisions
 * default to "accept" when a paragraph id is absent.
 */
export function mergeReviewedBody(
  original: TiptapDoc,
  edited: TiptapDoc,
  decisions: Record<string, "accept" | "reject">,
): { merged: TiptapDoc; fullyAccepted: boolean } {
  const origById = new Map((original.content ?? []).filter((n) => n.attrs?.id).map((n) => [n.attrs!.id as string, n]));
  const editedIds = new Set((edited.content ?? []).filter((n) => n.attrs?.id).map((n) => n.attrs!.id as string));
  let fullyAccepted = true;

  const content: typeof edited.content = [];
  for (const node of edited.content ?? []) {
    const id = node.attrs?.id;
    const decision = id ? decisions[id] ?? "accept" : "accept";
    const isNew = !id || !origById.has(id);
    const isChanged = !isNew && JSON.stringify(origById.get(id!)) !== JSON.stringify(node);

    if (decision === "reject" && (isNew || isChanged)) {
      fullyAccepted = false;
      if (isNew) continue; // drop the rejected addition
      content.push(origById.get(id!)!); // revert to the writer's original text
    } else {
      content.push(node);
    }
  }

  // Removed paragraphs (in original, not in edited). Rejecting the removal
  // re-inserts the original paragraph after its nearest surviving predecessor.
  const origList = (original.content ?? []).filter((n) => n.attrs?.id);
  for (let i = 0; i < origList.length; i++) {
    const node = origList[i];
    const id = node.attrs!.id as string;
    if (editedIds.has(id)) continue; // not removed
    if ((decisions[id] ?? "accept") === "accept") continue; // removal accepted → stays gone
    fullyAccepted = false;
    // Find the nearest earlier original paragraph that survived into `content`.
    let insertAt = 0;
    for (let j = i - 1; j >= 0; j--) {
      const prevId = origList[j].attrs!.id as string;
      const idx = content.findIndex((n) => n.attrs?.id === prevId);
      if (idx >= 0) { insertAt = idx + 1; break; }
    }
    content.splice(insertAt, 0, node);
  }

  return { merged: { type: "doc", content }, fullyAccepted };
}

export interface SubmitReviewInput {
  /** paragraphId → accept | reject. Absent ids default to accept. */
  decisions: Record<string, "accept" | "reject">;
  /** commentId → { resolved, reply } */
  commentDecisions: Record<string, { resolved?: boolean; reply?: string }>;
  /** Optional overall note to the editor when sending back. */
  note?: string;
}

export type SubmitReviewOutcome =
  | { outcome: "contract" }
  | { outcome: "accepted_post_contract" }
  | { outcome: "returned" };

/**
 * The writer's decision on the proposed edits. Applies their per-comment
 * resolutions/replies, merges their per-paragraph accept/reject choices, then:
 *  - if they accepted every change and left no reply → promote, and either
 *    go to the contract (stage 1, first time) or straight back to ACCEPTED
 *    with no new contract (stage 2 — the contract's already signed);
 *  - otherwise → reconcile the merged working copy and send it back to the
 *    editor for another pass (SUBMITTED for stage 1, ACCEPTED for stage 2).
 */
export async function submitWriterReview(
  storyId: string,
  writerId: string,
  input: SubmitReviewInput,
): Promise<SubmitReviewOutcome> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!story) throw new ReviewFlowError("not_found", "Story not found");
  if (story.authorId !== writerId) throw new ReviewFlowError("forbidden", "Not your story");
  if (story.status !== "CHANGES_PROPOSED") {
    throw new ReviewFlowError("illegal_state", "There are no edits awaiting your approval on this story.");
  }

  const postContract = await isPostContractStory(storyId);

  const original = story.body as unknown as TiptapDoc;
  const edited = (story.editedBody ?? story.body) as unknown as TiptapDoc;

  // Apply the writer's per-comment resolutions and replies.
  const comments = await prisma.editorialComment.findMany({ where: { storyId } });
  let hasReply = false;
  for (const c of comments) {
    const d = input.commentDecisions[c.id];
    if (!d) continue;
    const reply = d.reply?.trim() || null;
    if (reply) hasReply = true;
    await prisma.editorialComment.update({
      where: { id: c.id },
      data: {
        writerReply: reply,
        status: d.resolved ? "RESOLVED" : c.status,
      },
    });
  }

  const { merged, fullyAccepted } = mergeReviewedBody(original, edited, input.decisions);

  // Full acceptance with nothing to discuss → promote. Stage 1 (first pass,
  // contract not yet signed) goes to the contract; stage 2 (contract already
  // signed) goes straight back to ACCEPTED — no new contract needed.
  if (fullyAccepted && !hasReply) {
    await prisma.editorialComment.updateMany({ where: { storyId, status: "OPEN" }, data: { status: "RESOLVED" } });
    if (postContract) {
      await promotePostContractEdits(storyId);
      return { outcome: "accepted_post_contract" };
    }
    await finalizeContract(storyId);
    return { outcome: "contract" };
  }

  // Otherwise the writer kept some of their own wording or wants a word with
  // the editor — reconcile the working copy and send it back for another pass
  // (SUBMITTED for stage 1, ACCEPTED for stage 2 — the queue it came from).
  const mergedWordCount = countWords(merged);
  const changedFromOriginal = JSON.stringify(merged) !== JSON.stringify(original);
  await prisma.story.update({
    where: { id: storyId },
    data: {
      status: postContract ? "ACCEPTED" : "SUBMITTED",
      editWriterNote: input.note?.trim() || null,
      editSummaryNote: null,
      ...(changedFromOriginal
        ? {
            editedBody: merged as unknown as Prisma.InputJsonValue,
            editedWordCount: mergedWordCount,
            editedReadingTime: Math.max(1, Math.round(mergedWordCount / 200)),
          }
        : {
            // The writer rejected everything — no working copy left to show.
            editedBody: Prisma.DbNull,
            editedHookLine: null,
            editedWordCount: null,
            editedReadingTime: null,
            editLastSavedAt: null,
          }),
    },
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `${story.author.name} reviewed your edits on "${story.title}"`,
    body: `Writer: ${story.author.name} (${story.author.email})\nStory: ${story.title} (${storyId})\n\n${input.note?.trim() ? `Their note:\n${input.note.trim()}\n\n` : ""}They accepted some changes and kept some of their own${hasReply ? ", and replied to your inline comments" : ""}. The story is back in the ${postContract ? "To Be Published" : "review"} queue with their choices merged in — open it to see what stands and reconcile.`,
  });

  return { outcome: "returned" };
}
