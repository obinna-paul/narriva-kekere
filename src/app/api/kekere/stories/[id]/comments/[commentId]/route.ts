import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getCommentOwner,
  deleteParagraphComment,
  CommentNotFoundError,
} from "@/lib/data/kekere-comments";

export const DELETE = withAuth(
  async (_request, session, { params }: { params: { id: string; commentId: string } }) => {
    const ownerId = await getCommentOwner(params.commentId);
    if (!ownerId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isOwner = ownerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not your comment" }, { status: 403 });
    }

    try {
      await deleteParagraphComment(params.commentId);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof CommentNotFoundError) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }
      throw error;
    }
  }
);
