import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  verifyStoryAccess,
  getCommentsByParagraph,
  createParagraphComment,
  InvalidParagraphError,
} from "@/lib/data/kekere-comments";

const RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 }; // 10 comments / user / story / hour

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const grouped = await getCommentsByParagraph(params.id);
    return NextResponse.json(grouped);
  }
);

const createCommentSchema = z.object({
  paragraphId: z.string().min(1),
  body: z.string().min(1).max(500),
});

export const POST = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(`comment:${session.user.id}:${params.id}`, RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many comments — try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
      );
    }

    try {
      const comment = await createParagraphComment({
        storyId: params.id,
        userId: session.user.id,
        paragraphId: parsed.data.paragraphId,
        body: parsed.data.body,
      });
      return NextResponse.json({ success: true, comment }, { status: 201 });
    } catch (error) {
      if (error instanceof InvalidParagraphError) {
        return NextResponse.json({ error: "invalid_paragraph" }, { status: 400 });
      }
      throw error;
    }
  }
);
