export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getWalletForUser } from "@/lib/data/kekere-wallet";

export const GET = withAuth(async (_request, session) => {
  const wallet = await getWalletForUser(session.user.id);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }
  return NextResponse.json({ wallet });
});
