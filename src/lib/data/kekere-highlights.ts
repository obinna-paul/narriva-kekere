import { prisma } from "@/lib/db/prisma";
import { extractParagraphIds, type TiptapDoc } from "@/lib/tiptap/doc-utils";
import { isHighlightColorId } from "@/content/highlight-colors";

export class InvalidParagraphError extends Error {
  constructor() {
    super("That paragraph doesn't exist in this story.");
    this.name = "InvalidParagraphError";
  }
}

export class InvalidColorError extends Error {
  constructor() {
    super("That isn't one of the allowed highlight colors.");
    this.name = "InvalidColorError";
  }
}

export class InvalidRangeError extends Error {
  constructor() {
    super("That highlight range is invalid.");
    this.name = "InvalidRangeError";
  }
}

export interface HighlightDTO {
  id: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
}

const HIGHLIGHT_SELECT = {
  id: true,
  paragraphId: true,
  startOffset: true,
  endOffset: true,
  color: true,
  text: true,
} as const;

/** Every highlight a specific reader has made on a story — private to them,
 * never shared with other readers, the author, or admins. */
export async function getHighlightsForUser(storyId: string, userId: string): Promise<HighlightDTO[]> {
  return prisma.highlight.findMany({
    where: { storyId, userId },
    select: HIGHLIGHT_SELECT,
    orderBy: { createdAt: "asc" },
  });
}

export interface CreateHighlightInput {
  storyId: string;
  userId: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  color: string;
  text: string;
}

export async function createHighlight(input: CreateHighlightInput): Promise<HighlightDTO> {
  if (!isHighlightColorId(input.color)) throw new InvalidColorError();
  if (!Number.isInteger(input.startOffset) || !Number.isInteger(input.endOffset) || input.endOffset <= input.startOffset) {
    throw new InvalidRangeError();
  }

  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    select: { body: true },
  });
  if (!story) throw new InvalidParagraphError();

  const validIds = extractParagraphIds(story.body as unknown as TiptapDoc);
  if (!validIds.has(input.paragraphId)) throw new InvalidParagraphError();

  return prisma.highlight.create({
    data: {
      storyId: input.storyId,
      userId: input.userId,
      paragraphId: input.paragraphId,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      color: input.color,
      text: input.text.slice(0, 2000),
    },
    select: HIGHLIGHT_SELECT,
  });
}

/** Returns false (rather than throwing) when the highlight doesn't exist or
 * isn't owned by this user — the route treats that as a 404, not a 500,
 * since a stale client retrying a delete on an already-removed highlight is
 * an expected case, not an error. */
export async function recolorHighlight(highlightId: string, userId: string, color: string): Promise<boolean> {
  if (!isHighlightColorId(color)) throw new InvalidColorError();
  const result = await prisma.highlight.updateMany({
    where: { id: highlightId, userId },
    data: { color },
  });
  return result.count > 0;
}

export async function deleteHighlight(highlightId: string, userId: string): Promise<boolean> {
  const result = await prisma.highlight.deleteMany({ where: { id: highlightId, userId } });
  return result.count > 0;
}
