export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { submitWriterReview, ReviewFlowError } from "@/lib/data/kekere-review-flow";

const schema = z.object({
  decisions: z.record(z.string(), z.enum(["accept", "reject"])).default({}),
  commentDecisions: z
    .record(z.string(), z.object({ resolved: z.boolean().optional(), reply: z.string().max(2000).optional() }))
    .default({}),
  note: z.string().max(2000).optional(),
});

/**
 * The writer's decision on the admin's proposed edits: per-paragraph
 * accept/reject plus per-comment resolve/reply. Full acceptance with no reply
 * goes straight to the contract; anything kept or replied to sends the merged
 * working copy back to the editor.
 */
export const POST = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await submitWriterReview(params.id, session.user.id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ReviewFlowError) {
      const status = error.code === "not_found" ? 404 : error.code === "forbidden" ? 403 : error.code === "no_template" ? 500 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
});
