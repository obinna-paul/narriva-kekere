import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStoriesByAuthor } from "@/lib/data/kekere-stories";

export const GET = withAuth(async (_req, session) => {
  const stories = await getStoriesByAuthor(session.user.id);
  return NextResponse.json({ stories });
});
