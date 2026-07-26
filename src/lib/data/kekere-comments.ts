import { prisma } from "@/lib/db/prisma";
import { extractParagraphIds, type TiptapDoc } from "@/lib/tiptap/doc-utils";

export class StoryAccessDeniedError extends Error {
  constructor() {
    super("You need to unlock this story to do that.");
    this.name = "StoryAccessDeniedError";
  }
}

export class InvalidParagraphError extends Error {
  constructor() {
    super("That paragraph doesn't exist in this story.");
    this.name = "InvalidParagraphError";
  }
}

export class CommentNotFoundError extends Error {
  constructor() {
    super("Comment not found");
    this.name = "CommentNotFoundError";
  }
}

/** Thrown when replying to a comment that is itself a reply — replies are
 * deliberately one level deep only, matching the "reply to a comment, not to
 * a reply" model most readers already know from Facebook/Instagram. */
export class ReplyDepthError extends Error {
  constructor() {
    super("You can only reply to a top-level comment.");
    this.name = "ReplyDepthError";
  }
}

const COMMENTS_PER_PARAGRAPH = 50;

/**
 * True if userId can read/comment on this story right now: they wrote it,
 * they are ADMIN, or they hold a StoryUnlock for it (includes first-story-free grants).
 */
export async function verifyStoryAccess(userId: string, storyId: string): Promise<boolean> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true },
  });
  if (!story) return false;
  if (story.authorId === userId) return true;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return true;

  const unlock = await prisma.storyUnlock.findUnique({
    where: { userId_storyId: { userId, storyId } },
  });
  return !!unlock;
}

export interface CommentDTO {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar: string | null;
  body: string;
  createdAt: Date;
  /** Present (and non-empty) only on a top-level comment; a reply's own
   * `replies` is always []  since nesting stops at one level. */
  replies: CommentDTO[];
}

export interface ParagraphCommentGroup {
  count: number;
  comments: CommentDTO[];
  loadMore: boolean;
}

function toCommentDTO(comment: {
  id: string;
  userId: string;
  body: string;
  createdAt: Date;
  user: { name: string; avatar: string | null };
}): CommentDTO {
  return {
    id: comment.id,
    userId: comment.userId,
    userDisplayName: comment.user.name,
    userAvatar: comment.user.avatar,
    body: comment.body,
    createdAt: comment.createdAt,
    replies: [],
  };
}

export async function getCommentsByParagraph(
  storyId: string
): Promise<Record<string, ParagraphCommentGroup>> {
  const comments = await prisma.paragraphComment.findMany({
    where: { storyId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Two passes: top-level comments first (they're what the paginated
  // `comments` list and its 50-cap/loadMore are keyed off), then replies
  // attached to whichever parent they belong to. `count` is the total
  // number of remarks on the paragraph — top-level plus replies — since
  // that's what a reader means by "12 comments," not "12 threads."
  const grouped: Record<string, ParagraphCommentGroup> = {};
  const byId = new Map<string, CommentDTO>();

  function groupFor(paragraphId: string): ParagraphCommentGroup {
    const group = grouped[paragraphId] ?? { count: 0, comments: [], loadMore: false };
    grouped[paragraphId] = group;
    return group;
  }

  for (const comment of comments) {
    if (comment.parentId) continue;
    const group = groupFor(comment.paragraphId);
    group.count += 1;
    const dto = toCommentDTO(comment);
    byId.set(comment.id, dto);
    if (group.comments.length < COMMENTS_PER_PARAGRAPH) {
      group.comments.push(dto);
    } else {
      group.loadMore = true;
    }
  }

  for (const comment of comments) {
    if (!comment.parentId) continue;
    groupFor(comment.paragraphId).count += 1;
    const parent = byId.get(comment.parentId);
    if (!parent) continue; // parent past the per-paragraph cap — its replies just aren't shown either
    parent.replies.push(toCommentDTO(comment));
  }

  return grouped;
}

export interface CreateCommentInput {
  storyId: string;
  userId: string;
  paragraphId: string;
  body: string;
  /** Set to reply to an existing top-level comment instead of starting a
   * new thread on the paragraph. */
  parentId?: string;
}

/**
 * Validates the paragraphId against the story's ACTUAL Tiptap content
 * before creating the comment — a client-supplied paragraphId that isn't a
 * real paragraph in this story is rejected, not silently accepted. When
 * replying, the parent is re-derived server-side rather than trusted from
 * the client: it must belong to the same story, and must itself be a
 * top-level comment (replies don't nest further).
 */
export async function createParagraphComment(input: CreateCommentInput): Promise<CommentDTO> {
  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    select: { body: true },
  });
  if (!story) throw new InvalidParagraphError();

  const validIds = extractParagraphIds(story.body as unknown as TiptapDoc);
  if (!validIds.has(input.paragraphId)) throw new InvalidParagraphError();

  if (input.parentId) {
    const parent = await prisma.paragraphComment.findUnique({
      where: { id: input.parentId },
      select: { storyId: true, parentId: true },
    });
    if (!parent || parent.storyId !== input.storyId) throw new CommentNotFoundError();
    if (parent.parentId) throw new ReplyDepthError();
  }

  const comment = await prisma.paragraphComment.create({
    data: {
      storyId: input.storyId,
      paragraphId: input.paragraphId,
      userId: input.userId,
      body: input.body,
      parentId: input.parentId,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  return toCommentDTO(comment);
}

/** Deletes a comment — the caller (route) decides whether the requester is
 * allowed to (owns the comment, or is an admin) before calling this. Deleting
 * a top-level comment cascades to its replies (onDelete: Cascade in the schema). */
export async function deleteParagraphComment(commentId: string): Promise<void> {
  const comment = await prisma.paragraphComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new CommentNotFoundError();
  await prisma.paragraphComment.delete({ where: { id: commentId } });
}

export async function getCommentOwner(commentId: string): Promise<string | null> {
  const comment = await prisma.paragraphComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  return comment?.userId ?? null;
}
