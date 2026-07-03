export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { sendTip } from "@/lib/economy/cowries";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const result = await sendTip(session.user.id, params.id);

  if ("error" in result) {
    const status = result.error === "story_not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  if ("insufficient_balance" in result) {
    return NextResponse.json({ error: "insufficient_balance", balance: result.balance }, { status: 402 });
  }

  // Both "already_tipped" and "success" land the reader on the same tipped
  // UI state — fetch the current balance for either so the wallet display
  // stays accurate without a full page refresh.
  const wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ success: true, balance: wallet?.spendingBalance ?? 0 });
});
