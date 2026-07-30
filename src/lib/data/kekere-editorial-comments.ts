import { prisma } from "@/lib/db/prisma";
import { extractParagraphIds, type TiptapDoc } from "@/lib/tiptap/doc-utils";

/**
 * Private admin↔writer editorial comments anchored to story paragraphs (see
 * the EditorialComment model). Comments anchor to the editorial working copy
 * (editedBody ?? body) — the version the writer will actually review — so the
 * paragraph ids line up with what both sides see.
 */

export class EditorialCommentInvalidParagraphError extends Error {
  constructor() {
    super("That paragraph doesn't exist in this story.");
    this.name = "EditorialCommentInvalidParagraphError";
  }
}

export class EditorialCommentNotFoundError extends Error {
  constructor() {
    super("Comment not found");
    this.name = "EditorialCommentNotFoundError";
  }
}

export interface EditorialCommentDTO {
  id: string;
  paragraphId: string;
  authorRole: "EDITOR" | "WRITER";
  authorAdminId: string | null;
  body: string;
  status: "OPEN" | "RESOLVED";
  writerReply: string | null;
  createdAt: string;
  updatedAt: string;
}

function toDTO(c: {
  id: string;
  paragraphId: string;
  authorRole: "EDITOR" | "WRITER";
  authorAdminId: string | null;
  body: string;
  status: "OPEN" | "RESOLVED";
  writerReply: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EditorialCommentDTO {
  return {
    id: c.id,
    paragraphId: c.paragraphId,
    authorRole: c.authorRole,
    authorAdminId: c.authorAdminId,
    body: c.body,
    status: c.status,
    writerReply: c.writerReply,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** The paragraph-id set the working copy the writer will review is made of. */
async function reviewParagraphIds(storyId: string): Promise<Set<string> | null> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { body: true, editedBody: true },
  });
  if (!story) return null;
  const doc = (story.editedBody ?? story.body) as unknown as TiptapDoc;
  return extractParagraphIds(doc);
}

export async function listEditorialComments(storyId: string): Promise<EditorialCommentDTO[]> {
  const comments = await prisma.editorialComment.findMany({
    where: { storyId },
    orderBy: { createdAt: "asc" },
  });
  return comments.map(toDTO);
}

export interface CreateEditorialCommentInput {
  storyId: string;
  paragraphId: string;
  authorAdminId: string;
  body: string;
}

export async function createEditorialComment(input: CreateEditorialCommentInput): Promise<EditorialCommentDTO> {
  const validIds = await reviewParagraphIds(input.storyId);
  if (!validIds || !validIds.has(input.paragraphId)) {
    throw new EditorialCommentInvalidParagraphError();
  }
  const comment = await prisma.editorialComment.create({
    data: {
      storyId: input.storyId,
      paragraphId: input.paragraphId,
      authorRole: "EDITOR",
      authorAdminId: input.authorAdminId,
      body: input.body,
    },
  });
  return toDTO(comment);
}

/** A writer's own comment, added from their review screen — anchored to any
 * paragraph in the working copy they're reviewing, not just ones an editor
 * already flagged. Used by submitWriterReview; not its own API route since
 * it's always created as part of submitting a review, same as decisions and
 * comment replies. */
export async function createWriterComment(storyId: string, paragraphId: string, body: string): Promise<void> {
  const validIds = await reviewParagraphIds(storyId);
  if (!validIds || !validIds.has(paragraphId)) {
    throw new EditorialCommentInvalidParagraphError();
  }
  await prisma.editorialComment.create({
    data: { storyId, paragraphId, authorRole: "WRITER", body },
  });
}

export async function setEditorialCommentStatus(
  storyId: string,
  commentId: string,
  status: "OPEN" | "RESOLVED",
): Promise<EditorialCommentDTO> {
  const existing = await prisma.editorialComment.findFirst({ where: { id: commentId, storyId } });
  if (!existing) throw new EditorialCommentNotFoundError();
  const updated = await prisma.editorialComment.update({ where: { id: commentId }, data: { status } });
  return toDTO(updated);
}

export async function deleteEditorialComment(storyId: string, commentId: string): Promise<void> {
  const existing = await prisma.editorialComment.findFirst({ where: { id: commentId, storyId } });
  if (!existing) throw new EditorialCommentNotFoundError();
  await prisma.editorialComment.delete({ where: { id: commentId } });
}
