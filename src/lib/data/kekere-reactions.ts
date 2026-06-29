import { prisma } from "@/lib/db/prisma";
import { extractParagraphIds, type TiptapDoc } from "@/lib/tiptap/doc-utils";
import { isAllowedReactionEmoji } from "@/lib/tiptap/reaction-emojis";

export class InvalidParagraphError extends Error {
  constructor() {
    super("That paragraph doesn't exist in this story.");
    this.name = "InvalidParagraphError";
  }
}

export class InvalidEmojiError extends Error {
  constructor() {
    super("That emoji isn't one of the allowed reactions.");
    this.name = "InvalidEmojiError";
  }
}

export interface ParagraphReactionSummary {
  top: { emoji: string; count: number }[];
  userReaction: string | null;
  totalCount: number;
}

export async function getReactionsByParagraph(
  storyId: string,
  userId: string | null
): Promise<Record<string, ParagraphReactionSummary>> {
  const reactions = await prisma.paragraphReaction.findMany({
    where: { storyId },
    select: { paragraphId: true, userId: true, emoji: true },
  });

  const byParagraph = new Map<string, Map<string, number>>();
  const userReactionByParagraph = new Map<string, string>();

  for (const r of reactions) {
    const counts = byParagraph.get(r.paragraphId) ?? new Map<string, number>();
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    byParagraph.set(r.paragraphId, counts);

    if (userId && r.userId === userId) {
      userReactionByParagraph.set(r.paragraphId, r.emoji);
    }
  }

  const result: Record<string, ParagraphReactionSummary> = {};
  Array.from(byParagraph.entries()).forEach(([paragraphId, counts]) => {
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([emoji, count]) => ({ emoji, count }));

    result[paragraphId] = {
      top: sorted,
      userReaction: userReactionByParagraph.get(paragraphId) ?? null,
      totalCount: Array.from(counts.values()).reduce((sum, n) => sum + n, 0),
    };
  });
  return result;
}

export interface SetReactionInput {
  storyId: string;
  userId: string;
  paragraphId: string;
  emoji: string;
}

/** One reaction per user per paragraph — upserts rather than stacking, so
 * picking a new emoji on a paragraph you've already reacted to just
 * changes it. */
export async function setParagraphReaction(input: SetReactionInput): Promise<void> {
  if (!isAllowedReactionEmoji(input.emoji)) throw new InvalidEmojiError();

  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    select: { body: true },
  });
  if (!story) throw new InvalidParagraphError();

  const validIds = extractParagraphIds(story.body as unknown as TiptapDoc);
  if (!validIds.has(input.paragraphId)) throw new InvalidParagraphError();

  await prisma.paragraphReaction.upsert({
    where: {
      storyId_paragraphId_userId: {
        storyId: input.storyId,
        paragraphId: input.paragraphId,
        userId: input.userId,
      },
    },
    update: { emoji: input.emoji },
    create: {
      storyId: input.storyId,
      paragraphId: input.paragraphId,
      userId: input.userId,
      emoji: input.emoji,
    },
  });
}

export async function removeParagraphReaction(
  storyId: string,
  paragraphId: string,
  userId: string
): Promise<void> {
  await prisma.paragraphReaction.deleteMany({
    where: { storyId, paragraphId, userId },
  });
}
