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

const COMMENTS_PER_PARAGRAPH = 50;

/**
 * True if userId can read/comment on this story right now: it's free, they
 * wrote it, or they hold a StoryUnlock for it. Mirrors isStoryUnlockedFor in
 * kekere-stories.ts, kept separate since the comment endpoints only need
 * this narrow boolean check, not a full story-for-reader payload.
 */
export async function verifyStoryAccess(userId: string, storyId: string): Promise<boolean> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { cowrieCost: true, authorId: true },
  });
  if (!story) return false;
  if (story.cowrieCost === 0) return true;
  if (story.authorId === userId) return true;

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
}

export interface ParagraphCommentGroup {
  count: number;
  comments: CommentDTO[];
  loadMore: boolean;
}

export async function getCommentsByParagraph(
  storyId: string
): Promise<Record<string, ParagraphCommentGroup>> {
  const comments = await prisma.paragraphComment.findMany({
    where: { storyId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  const grouped: Record<string, ParagraphCommentGroup> = {};
  for (const comment of comments) {
    const group = grouped[comment.paragraphId] ?? { count: 0, comments: [], loadMore: false };
    group.count += 1;
    if (group.comments.length < COMMENTS_PER_PARAGRAPH) {
      group.comments.push({
        id: comment.id,
        userId: comment.userId,
        userDisplayName: comment.user.name,
        userAvatar: comment.user.avatar,
        body: comment.body,
        createdAt: comment.createdAt,
      });
    } else {
      group.loadMore = true;
    }
    grouped[comment.paragraphId] = group;
  }
  return grouped;
}

export interface CreateCommentInput {
  storyId: string;
  userId: string;
  paragraphId: string;
  body: string;
}

/**
 * Validates the paragraphId against the story's ACTUAL Tiptap content
 * before creating the comment — a client-supplied paragraphId that isn't a
 * real paragraph in this story is rejected, not silently accepted.
 */
export async function createParagraphComment(input: CreateCommentInput): Promise<CommentDTO> {
  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    select: { body: true },
  });
  if (!story) throw new InvalidParagraphError();

  const validIds = extractParagraphIds(story.body as unknown as TiptapDoc);
  if (!validIds.has(input.paragraphId)) throw new InvalidParagraphError();

  const comment = await prisma.paragraphComment.create({
    data: {
      storyId: input.storyId,
      paragraphId: input.paragraphId,
      userId: input.userId,
      body: input.body,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  return {
    id: comment.id,
    userId: comment.userId,
    userDisplayName: comment.user.name,
    userAvatar: comment.user.avatar,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

/** Deletes a comment — the caller (route) decides whether the requester is
 * allowed to (owns the comment, or is an admin) before calling this. */
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
