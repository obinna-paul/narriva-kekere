import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { verifyStoryAccess } from "@/lib/data/kekere-comments";
import {
  getReactionsByParagraph,
  setParagraphReaction,
  InvalidParagraphError,
  InvalidEmojiError,
} from "@/lib/data/kekere-reactions";
import { ALLOWED_REACTION_EMOJIS } from "@/lib/tiptap/reaction-emojis";

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const grouped = await getReactionsByParagraph(params.id, session.user.id);
    return NextResponse.json(grouped);
  }
);

const setReactionSchema = z.object({
  paragraphId: z.string().min(1),
  emoji: z.enum(ALLOWED_REACTION_EMOJIS),
});

export const POST = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = setReactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      await setParagraphReaction({
        storyId: params.id,
        userId: session.user.id,
        paragraphId: parsed.data.paragraphId,
        emoji: parsed.data.emoji,
      });
      return NextResponse.json({ success: true, emoji: parsed.data.emoji, paragraphId: parsed.data.paragraphId });
    } catch (error) {
      if (error instanceof InvalidParagraphError) {
        return NextResponse.json({ error: "invalid_paragraph" }, { status: 400 });
      }
      if (error instanceof InvalidEmojiError) {
        return NextResponse.json({ error: "invalid_emoji" }, { status: 400 });
      }
      throw error;
    }
  }
);
