import { prisma } from "@/lib/db/prisma";
import { paragraphPlainText, type TiptapDoc } from "@/lib/tiptap/doc-utils";
import { isHighlightColorId } from "@/content/highlight-colors";

interface HighlightAnchor {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Works out which paragraph a highlight actually belongs to, and where in it.
 *
 * The obvious implementation — trust the client's paragraphId and reject
 * anything we don't recognise — turned out to be too brittle to ship: a
 * paragraph id can legitimately differ between what the reader's editor is
 * showing and what's stored (content saved before paragraph ids existed gets
 * a fresh random id minted client-side on every load; a story re-imported or
 * re-saved can come back with regenerated ids). Every one of those cases
 * produced a hard rejection, which the reader could only render as the
 * highlight silently vanishing a moment after it appeared.
 *
 * So the id is treated as a hint, not a requirement, and the highlighted text
 * itself is the real anchor — falling back to locating the paragraph that
 * actually contains it and re-deriving the offsets from the stored copy. The
 * anchor returned is always expressed in the server's own ids/offsets, so
 * what gets persisted lines up with what the reader will be sent next load.
 */
function resolveHighlightAnchor(
  doc: TiptapDoc,
  requested: HighlightAnchor,
  text: string
): HighlightAnchor | null {
  const paragraphs = (doc?.content ?? []).filter(
    (node) => node.type === "paragraph" && typeof node.attrs?.id === "string"
  );

  // 1. The id is known and the offsets still frame the same text — the
  //    overwhelmingly common case, and the only one that needs no repair.
  const named = paragraphs.find((node) => node.attrs?.id === requested.paragraphId);
  if (named && paragraphPlainText(named).slice(requested.startOffset, requested.endOffset) === text) {
    return requested;
  }

  // 2. Some paragraph holds exactly this text at exactly these offsets —
  //    i.e. only the id drifted. Keep the offsets, adopt the stored id.
  const sameOffsets = paragraphs.find(
    (node) => paragraphPlainText(node).slice(requested.startOffset, requested.endOffset) === text
  );
  if (sameOffsets?.attrs?.id) {
    return { ...requested, paragraphId: sameOffsets.attrs.id };
  }

  // 3. The text is in there somewhere but at a different position (the
  //    stored copy differs slightly — a normalised space, an edited word
  //    earlier in the paragraph). Re-derive the offsets from where it
  //    actually sits. Deliberately first-match: a phrase repeated across
  //    paragraphs is ambiguous, and landing the reader's own private
  //    highlight on the first occurrence beats refusing to save it.
  for (const node of paragraphs) {
    const index = paragraphPlainText(node).indexOf(text);
    if (index !== -1 && node.attrs?.id) {
      return { paragraphId: node.attrs.id, startOffset: index, endOffset: index + text.length };
    }
  }

  return null;
}

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

  const anchor = resolveHighlightAnchor(
    story.body as unknown as TiptapDoc,
    { paragraphId: input.paragraphId, startOffset: input.startOffset, endOffset: input.endOffset },
    input.text
  );
  if (!anchor) throw new InvalidParagraphError();

  return prisma.highlight.create({
    data: {
      storyId: input.storyId,
      userId: input.userId,
      paragraphId: anchor.paragraphId,
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
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
