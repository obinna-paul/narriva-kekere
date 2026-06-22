import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getPurchasedBooksWithProgress } from "@/lib/data/books";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, session) => {
  const library = await getPurchasedBooksWithProgress(session.user.id);
  return NextResponse.json({ library });
});
