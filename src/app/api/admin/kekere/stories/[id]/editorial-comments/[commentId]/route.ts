export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import {
  setEditorialCommentStatus,
  deleteEditorialComment,
  EditorialCommentNotFoundError,
} from "@/lib/data/kekere-editorial-comments";

const patchSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]),
});

export const PATCH = withAuth(
  async (request, _session, { params }) => {
    const { id, commentId } = params as { id: string; commentId: string };

    const raw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const comment = await setEditorialCommentStatus(id, commentId, parsed.data.status);
      return NextResponse.json({ comment });
    } catch (error) {
      if (error instanceof EditorialCommentNotFoundError) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }
      throw error;
    }
  },
  { roles: ["ADMIN"] },
);

export const DELETE = withAuth(
  async (_request, _session, { params }) => {
    const { id, commentId } = params as { id: string; commentId: string };
    try {
      await deleteEditorialComment(id, commentId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof EditorialCommentNotFoundError) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }
      throw error;
    }
  },
  { roles: ["ADMIN"] },
);
