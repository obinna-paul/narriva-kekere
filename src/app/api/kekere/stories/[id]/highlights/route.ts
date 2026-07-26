export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { verifyStoryAccess } from "@/lib/data/kekere-comments";
import {
  getHighlightsForUser,
  createHighlight,
  InvalidParagraphError,
  InvalidColorError,
  InvalidRangeError,
} from "@/lib/data/kekere-highlights";
import { HIGHLIGHT_COLOR_IDS } from "@/content/highlight-colors";

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const highlights = await getHighlightsForUser(params.id, session.user.id);
    return NextResponse.json({ highlights });
  }
);

const createHighlightSchema = z.object({
  paragraphId: z.string().min(1),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
  color: z.enum(HIGHLIGHT_COLOR_IDS),
  text: z.string().min(1).max(2000),
});

export const POST = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createHighlightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const highlight = await createHighlight({
        storyId: params.id,
        userId: session.user.id,
        paragraphId: parsed.data.paragraphId,
        startOffset: parsed.data.startOffset,
        endOffset: parsed.data.endOffset,
        color: parsed.data.color,
        text: parsed.data.text,
      });
      return NextResponse.json(highlight, { status: 201 });
    } catch (error) {
      if (error instanceof InvalidParagraphError) {
        return NextResponse.json({ error: "invalid_paragraph" }, { status: 400 });
      }
      if (error instanceof InvalidColorError) {
        return NextResponse.json({ error: "invalid_color" }, { status: 400 });
      }
      if (error instanceof InvalidRangeError) {
        return NextResponse.json({ error: "invalid_range" }, { status: 400 });
      }
      throw error;
    }
  }
);
