export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { moveEarnedToSpending } from "@/lib/economy/cowries";

const bodySchema = z.object({
  amount: z.number().int().min(1),
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a whole number of cowries to move." }, { status: 400 });
  }

  const result = await moveEarnedToSpending(session.user.id, parsed.data.amount);

  if ("error" in result) {
    if (result.error === "insufficient_earned_balance") {
      return NextResponse.json({ error: "insufficient_earned_balance", balance: result.balance }, { status: 400 });
    }
    return NextResponse.json({ error: "Enter a whole number of cowries to move." }, { status: 400 });
  }

  return NextResponse.json(result);
});
