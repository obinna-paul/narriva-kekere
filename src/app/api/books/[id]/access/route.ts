export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getBookPurchase, getReadingProgress } from "@/lib/data/books";

export const GET = withAuth(async (_request, session, { params }: { params: { id: string } }) => {
  const userId = session.user.id;
  const bookId = params.id;

  const purchase = await getBookPurchase(userId, bookId);
  const progress = purchase ? await getReadingProgress(userId, bookId) : null;

  return NextResponse.json({ purchased: !!purchase, progress });
});
