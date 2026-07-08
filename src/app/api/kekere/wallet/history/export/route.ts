export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { sendWalletHistoryEmail } from "@/lib/data/kekere-wallet";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const bodySchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please choose a valid date range." }, { status: 400 });
  }

  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Please choose a valid date range." }, { status: 400 });
  }

  const result = await sendWalletHistoryEmail(session.user.id, from, to);
  if (!result.sent) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ success: true });
});
