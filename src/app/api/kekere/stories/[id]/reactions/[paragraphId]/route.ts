import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { verifyStoryAccess } from "@/lib/data/kekere-comments";
import { removeParagraphReaction } from "@/lib/data/kekere-reactions";

export const DELETE = withAuth(
  async (_request, session, { params }: { params: { id: string; paragraphId: string } }) => {
    const hasAccess = await verifyStoryAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "story_locked" }, { status: 403 });
    }

    await removeParagraphReaction(params.id, params.paragraphId, session.user.id);
    return NextResponse.json({ success: true });
  }
);
