export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { upsertStoryRating } from "@/lib/data/kekere-ratings";

export const PUT = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer 1–5" }, { status: 400 });
  }

  await upsertStoryRating(session.user.id, params.id, rating);
  return NextResponse.json({ ok: true });
});
