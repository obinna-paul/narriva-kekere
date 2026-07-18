export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { blockSender, unblockSender } from "@/lib/data/kekere-notes";

const bodySchema = z.object({ userId: z.string().min(1) });

export const POST = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await blockSender(session.user.id, parsed.data.userId);
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (request, session) => {
  const requestBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await unblockSender(session.user.id, parsed.data.userId);
  return NextResponse.json({ ok: true });
});
