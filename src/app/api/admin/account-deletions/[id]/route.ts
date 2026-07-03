export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { markAccountDeletionProcessed } from "@/lib/data/users";

export const DELETE = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    await markAccountDeletionProcessed(params.id, session.user.id);
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
