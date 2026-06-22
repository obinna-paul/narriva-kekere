import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getBookPurchase, upsertReadingProgress } from "@/lib/data/books";

const progressSchema = z.object({
  currentChapter: z.number().int().positive(),
  currentScrollPosition: z.number().int().nonnegative(),
  completedChapterIds: z.array(z.number().int().nonnegative()),
});

export const POST = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const userId = session.user.id;
  const bookId = params.id;

  const purchase = await getBookPurchase(userId, bookId);
  if (!purchase) {
    return NextResponse.json({ error: "Not purchased" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await upsertReadingProgress(userId, bookId, parsed.data);
  return NextResponse.json({ ok: true });
});
