export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { decideStoryModeration } from "@/lib/data/kekere-moderation";
import { StoryIllegalStateError, StoryNotFoundError } from "@/lib/data/kekere-stories";

const decisionSchema = z.object({
  action: z.enum(["approve", "request_revisions", "reject"]),
  moderationNotes: z.string().min(1).max(2000).optional(),
  tier: z.enum(["STANDARD", "FEATURED", "PREMIUM"]).optional(),
  cowrieCost: z.number().int().min(0).optional(),
  plagiarismFlagged: z.boolean().optional(),
});

/** The single endpoint behind every admin moderation decision — approve,
 * request revisions, reject. Validity of the transition (only from
 * SUBMITTED/REVISIONS_REQUESTED) is enforced in decideStoryModeration. */
export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const story = await decideStoryModeration(params.id, parsed.data);
      return NextResponse.json({ story });
    } catch (error) {
      if (error instanceof StoryNotFoundError) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
      }
      if (error instanceof StoryIllegalStateError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  },
  { roles: ["ADMIN"] }
);
