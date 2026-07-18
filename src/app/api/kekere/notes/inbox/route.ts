export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getWriterInbox, getBlockedSenders, getNotesEnabled, setNotesEnabled } from "@/lib/data/kekere-notes";

export const GET = withAuth(async (_request, session) => {
  const [notes, blockedSenders, notesEnabled] = await Promise.all([
    getWriterInbox(session.user.id),
    getBlockedSenders(session.user.id),
    getNotesEnabled(session.user.id),
  ]);
  return NextResponse.json({ notes, blockedSenders, notesEnabled });
});

const settingsSchema = z.object({ notesEnabled: z.boolean() });

export const PATCH = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await setNotesEnabled(session.user.id, parsed.data.notesEnabled);
  return NextResponse.json({ notesEnabled: parsed.data.notesEnabled });
});
