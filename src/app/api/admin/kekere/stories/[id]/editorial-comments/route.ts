export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import {
  listEditorialComments,
  createEditorialComment,
  EditorialCommentInvalidParagraphError,
} from "@/lib/data/kekere-editorial-comments";

export const GET = withAuth(
  async (_request, _session, { params }) => {
    const { id } = params as { id: string };
    const comments = await listEditorialComments(id);
    return NextResponse.json({ comments });
  },
  { roles: ["ADMIN"] },
);

const createSchema = z.object({
  paragraphId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export const POST = withAuth(
  async (request, session, { params }) => {
    const { id } = params as { id: string };

    const raw = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const comment = await createEditorialComment({
        storyId: id,
        paragraphId: parsed.data.paragraphId,
        authorAdminId: session.user.id,
        body: parsed.data.body,
      });
      return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
      if (error instanceof EditorialCommentInvalidParagraphError) {
        return NextResponse.json({ error: "invalid_paragraph" }, { status: 400 });
      }
      throw error;
    }
  },
  { roles: ["ADMIN"] },
);
