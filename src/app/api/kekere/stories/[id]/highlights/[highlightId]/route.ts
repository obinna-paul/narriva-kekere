export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { recolorHighlight, deleteHighlight, InvalidColorError } from "@/lib/data/kekere-highlights";
import { HIGHLIGHT_COLOR_IDS } from "@/content/highlight-colors";

const recolorSchema = z.object({
  color: z.enum(HIGHLIGHT_COLOR_IDS),
});

// No verifyStoryAccess gate here: recolorHighlight/deleteHighlight already
// scope the update/delete to `id: highlightId, userId: session.user.id`, so
// a user can only ever touch their own highlight regardless of their
// current access to the story — there's nothing an extra access check
// would add.
export const PATCH = withAuth(
  async (request, session, { params }: { params: { id: string; highlightId: string } }) => {
    const body = await request.json().catch(() => null);
    const parsed = recolorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const updated = await recolorHighlight(params.highlightId, session.user.id, parsed.data.color);
      if (!updated) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof InvalidColorError) {
        return NextResponse.json({ error: "invalid_color" }, { status: 400 });
      }
      throw error;
    }
  }
);

export const DELETE = withAuth(
  async (_request, session, { params }: { params: { id: string; highlightId: string } }) => {
    const deleted = await deleteHighlight(params.highlightId, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }
);
