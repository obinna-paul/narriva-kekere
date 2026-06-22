import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getUnlockStatus } from "@/lib/data/kekere-unlocks";

export const GET = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const unlocked = await getUnlockStatus(session.user.id, params.id);
    return NextResponse.json({ unlocked });
  }
);
