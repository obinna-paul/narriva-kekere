import { prisma } from "@/lib/db/prisma";
import { StoryIllegalStateError, StoryNotFoundError } from "@/lib/data/kekere-stories";
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
    case "approve":
      return prisma.story.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          tier: input.tier ?? story.tier,
          cowrieCost: input.cowrieCost ?? story.cowrieCost,
          plagiarismFlagged,
        },
      });

    case "request_revisions":
      if (!input.moderationNotes) {
        throw new StoryIllegalStateError("moderationNotes is required to request revisions.");
      }
      return prisma.story.update({
        where: { id },
        data: { status: "REVISIONS_REQUESTED", moderationNotes: input.moderationNotes, plagiarismFlagged },
      });

    case "reject":
      if (!input.moderationNotes) {
        throw new StoryIllegalStateError("moderationNotes is required to reject a story.");
      }
      return prisma.story.update({
        where: { id },
        data: { status: "REJECTED", moderationNotes: input.moderationNotes, plagiarismFlagged },
      });
  }
}
