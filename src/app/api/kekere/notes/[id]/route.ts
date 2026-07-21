export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { markNoteRead, replyToNote, reportNote, pinNote } from "@/lib/data/kekere-notes";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_read") }),
  z.object({ action: z.literal("reply"), body: z.string().min(1).max(500) }),
  z.object({ action: z.literal("report") }),
  z.object({ action: z.literal("pin"), pinned: z.boolean() }),
]);

export const PATCH = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "mark_read") {
    const ok = await markNoteRead(params.id, session.user.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (parsed.data.action === "report") {
    const ok = await reportNote(params.id, session.user.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (parsed.data.action === "pin") {
    const result = await pinNote(params.id, session.user.id, parsed.data.pinned);
    if ("error" in result) {
      const status = result.error === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  }

  const result = await replyToNote(params.id, session.user.id, parsed.data.body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
});
