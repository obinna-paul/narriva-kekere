import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { requestWithdrawal } from "@/lib/data/kekere-wallet";

export const POST = withAuth(async (_request, session) => {
  try {
    const result = await requestWithdrawal(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Withdrawal failed";
    const status = message.includes("Minimum") ? 400 : message.includes("bank") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
