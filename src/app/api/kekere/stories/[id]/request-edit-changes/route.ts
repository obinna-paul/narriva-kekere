export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { writerRequestChanges, ReviewFlowError } from "@/lib/data/kekere-review-flow";

const schema = z.object({
  note: z.string().min(1, "Tell the editor what you'd like changed.").max(2000),
});

/** Writer rejects the admin's proposed edits and sends the story back with a note. */
export const POST = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await writerRequestChanges(params.id, session.user.id, parsed.data.note);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ReviewFlowError) {
      const status = error.code === "not_found" ? 404 : error.code === "forbidden" ? 403 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
});
