import { prisma } from "@/lib/db/prisma";
import { StoryIllegalStateError, StoryNotFoundError } from "@/lib/data/kekere-stories";
import { createNotification } from "@/lib/notifications/create";
import { generateStoryAudio } from "@/lib/audio/generate";
import type { Story, StoryTier } from "@prisma/client";
import type { StoryWithAuthor } from "@/lib/data/kekere-stories";

const authorInclude = {
  author: { select: { id: true, name: true, slug: true, avatarColor: true } },
} as const;

/** Stories awaiting an admin decision — SUBMITTED is the literal queue;
 * REVISIONS_REQUESTED is included too (per spec) so admins can track stories
 * sitting in revision-limbo, even though the next move is technically the
 * writer's — an admin can still reject outright from here if nothing happens. */
const QUEUE_STATUSES = ["SUBMITTED", "REVISIONS_REQUESTED"] as const;

export async function listModerationQueue(): Promise<StoryWithAuthor[]> {
  return prisma.story.findMany({
    where: { status: { in: [...QUEUE_STATUSES] } },
    include: authorInclude,
    // Oldest submission first — submittedAt, not createdAt/updatedAt (see
    // the field comment on Story.submittedAt in schema.prisma).
    orderBy: { submittedAt: "asc" },
  });
}

export async function getModerationQueueItem(id: string): Promise<StoryWithAuthor | null> {
  return prisma.story.findUnique({ where: { id }, include: authorInclude });
}

export type ModerationAction = "approve" | "request_revisions" | "reject";

export interface ModerationDecisionInput {
  action: ModerationAction;
  moderationNotes?: string;
  tier?: StoryTier;
  cowrieCost?: number;
  plagiarismFlagged?: boolean;
}

/**
 * The single endpoint behind all three admin decisions. Only legal from
 * SUBMITTED or REVISIONS_REQUESTED — there's no path from PUBLISHED back to
 * SUBMITTED, or from DRAFT straight to PUBLISHED, etc.
 */
export async function decideStoryModeration(
  id: string,
  input: ModerationDecisionInput
): Promise<Story> {
  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) throw new StoryNotFoundError();

  if (story.status !== "SUBMITTED" && story.status !== "REVISIONS_REQUESTED") {
    throw new StoryIllegalStateError(
      `Can't review a story while it's ${story.status} — only SUBMITTED or REVISIONS_REQUESTED.`
    );
  }

  const plagiarismFlagged = input.plagiarismFlagged ?? story.plagiarismFlagged;

  switch (input.action) {
    case "approve": {
      const updated = await prisma.story.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          isDraft: false,
          tier: input.tier ?? story.tier,
          cowrieCost: input.cowrieCost ?? story.cowrieCost,
          plagiarismFlagged,
        },
      });
      await createNotification({
        userId: updated.authorId,
        type: "STORY_APPROVED",
        title: "Your story has been published!",
        body:
          `"${updated.title}" is now live on Kekere Stories` +
          (updated.cowrieCost === 0 ? " as a free read." : ` at ${updated.cowrieCost} cowries.`),
        link: `/kekere/story/${updated.id}`,
      });
      // Fire-and-forget — narration audio can take a while to generate
      // (multiple TTS calls for longer stories) and must not block the
      // publish response.
      generateStoryAudio(updated.id).catch(console.error);
      return updated;
    }

    case "request_revisions": {
      if (!input.moderationNotes) {
        throw new StoryIllegalStateError("moderationNotes is required to request revisions.");
      }
      const updated = await prisma.story.update({
        where: { id },
        data: { status: "REVISIONS_REQUESTED", moderationNotes: input.moderationNotes, plagiarismFlagged },
      });
      await createNotification({
        userId: updated.authorId,
        type: "STORY_REVISIONS_REQUESTED",
        title: "Revisions requested for your story",
        body: `Our editor has reviewed "${updated.title}" and has some feedback. Tap to see what needs to change.`,
        link: `/kekere/write?id=${updated.id}`,
      });
      return updated;
    }

    case "reject": {
      if (!input.moderationNotes) {
        throw new StoryIllegalStateError("moderationNotes is required to reject a story.");
      }
      const updated = await prisma.story.update({
        where: { id },
        data: { status: "REJECTED", moderationNotes: input.moderationNotes, plagiarismFlagged },
      });
      await createNotification({
        userId: updated.authorId,
        type: "STORY_REJECTED",
        title: "Story not accepted this time",
        body: `"${updated.title}" wasn't the right fit for us right now. We've sent you feedback by email.`,
        link: `/kekere/write?id=${updated.id}`,
      });
      return updated;
    }
  }
}
