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
  authorAdminId: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
}

function toDTO(c: {
  id: string;
  paragraphId: string;
  authorAdminId: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  createdAt: Date;
  updatedAt: Date;
}): EditorialCommentDTO {
  return {
    id: c.id,
    paragraphId: c.paragraphId,
    authorAdminId: c.authorAdminId,
    body: c.body,
    status: c.status,
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
      authorAdminId: input.authorAdminId,
      body: input.body,
    },
  });
  return toDTO(comment);
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
