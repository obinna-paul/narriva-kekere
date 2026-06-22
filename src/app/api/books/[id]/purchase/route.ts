import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { createBookPurchase, getBookPurchase } from "@/lib/data/books";

const purchaseSchema = z.object({
  paymentReference: z.string().min(1),
});

export const POST = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const userId = session.user.id;
  const bookId = params.id;

  const existing = await getBookPurchase(userId, bookId);
  if (existing) {
    return NextResponse.json(
      { error: "Already purchased" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const purchase = await createBookPurchase(userId, bookId, parsed.data.paymentReference);
  return NextResponse.json({ purchase }, { status: 201 });
});
