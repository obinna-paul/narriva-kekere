import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { revokeBookPurchase } from "@/lib/data/books";

export const DELETE = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    await revokeBookPurchase(params.id, session.user.id);
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
