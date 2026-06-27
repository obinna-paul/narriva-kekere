import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { requestAccountDeletion } from "@/lib/data/users";

export const POST = withAuth(async (_request, session) => {
  const deletionRequestedAt = await requestAccountDeletion(session.user.id);
  return NextResponse.json({ deletionRequestedAt });
});
