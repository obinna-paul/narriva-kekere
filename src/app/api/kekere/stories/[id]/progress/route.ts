export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { upsertReadingProgress } from "@/lib/data/kekere-progress";

export const PUT = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const body = await request.json().catch(() => ({}));
  const scrollFraction = Number(body.scrollFraction);

  if (!Number.isFinite(scrollFraction) || scrollFraction < 0 || scrollFraction > 1) {
    return NextResponse.json({ error: "scrollFraction must be 0–1" }, { status: 400 });
  }

  // Note: reading-streak activity is deliberately NOT recorded here. Merely
  // scrolling shouldn't build a streak — it only advances when the reader
  // finishes a story they haven't finished before (see the complete route).
  await upsertReadingProgress(session.user.id, params.id, scrollFraction);
  return NextResponse.json({ ok: true });
});

// navigator.sendBeacon (used by the reader's flush-on-leave path) can only
// ever issue a POST — it has no way to send PUT — so without this handler
// that final flush silently 404s every single time and the last bit of
// scroll progress before leaving the page never gets saved.
export const POST = PUT;
