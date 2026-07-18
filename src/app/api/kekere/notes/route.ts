export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getAvailablePrompts, getReaderNotes, sendNote } from "@/lib/data/kekere-notes";

export const GET = withAuth(async (_request, session) => {
  const [prompts, sent] = await Promise.all([
    getAvailablePrompts(session.user.id),
    getReaderNotes(session.user.id),
  ]);
  return NextResponse.json({ prompts, sent });
});

const sendNoteSchema = z.object({
  storyId: z.string().min(1),
  body: z.string().min(1).max(500),
});

export const POST = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = sendNoteSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await sendNote(session.user.id, parsed.data.storyId, parsed.data.body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
});
