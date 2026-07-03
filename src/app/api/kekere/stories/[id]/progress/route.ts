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

  await upsertReadingProgress(session.user.id, params.id, scrollFraction);
  return NextResponse.json({ ok: true });
});
