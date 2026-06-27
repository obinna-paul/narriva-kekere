import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { getBookPurchase } from "@/lib/data/books";
import { verifyTransaction } from "@/lib/paystack/client";
import { processBookPurchase } from "@/lib/data/payments";

const purchaseSchema = z.object({
  reference: z.string().min(1),
});

// Re-verifies the reference against Paystack directly — never trusts that
// the client reached this endpoint only after a genuine successful payment.
// metadata.bookId/userId on the transaction must match the URL/session, so a
// reference paid for one book (or by one user) can't be replayed for another.
export const POST = withAuth(async (request, session, { params }: { params: { id: string } }) => {
  const userId = session.user.id;
  const bookId = params.id;

  const existing = await getBookPurchase(userId, bookId);
  if (existing) {
    return NextResponse.json({ error: "Already purchased" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reference } = parsed.data;

  let verification;
  try {
    verification = await verifyTransaction(reference);
  } catch {
    return NextResponse.json({ error: "Could not verify transaction" }, { status: 502 });
  }

  if (verification.status !== "success") {
    return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
  }

  if (verification.metadata?.bookId !== bookId || verification.metadata?.userId !== userId) {
    return NextResponse.json({ error: "Transaction does not match this purchase" }, { status: 403 });
  }

  const result = await processBookPurchase(reference, userId, bookId);
  const purchase = await getBookPurchase(userId, bookId);
  return NextResponse.json({ purchase, status: result.status }, { status: 201 });
});
