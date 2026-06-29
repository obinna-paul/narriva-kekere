import { prisma } from "@/lib/db/prisma";

/**
 * Source of truth for "crediting" a verified book purchase. Wallet top-ups
 * used to live here too, but every cowrie balance change now goes through
 * src/lib/economy/cowries.ts — see creditTopUp(), called from both
 * /api/paystack/verify and /api/webhooks/paystack.
 */

export interface BookPurchaseResult {
  status: "created" | "already_processed";
  bookId: string;
}

export async function processBookPurchase(
  reference: string,
  userId: string,
  bookId: string
): Promise<BookPurchaseResult> {
  const existing = await prisma.bookPurchase.findFirst({
    where: { OR: [{ paymentReference: reference }, { userId, bookId }] },
  });
  if (existing) {
    return { status: "already_processed", bookId: existing.bookId };
  }

  await prisma.bookPurchase.create({
    data: { userId, bookId, paymentReference: reference },
  });
  return { status: "created", bookId };
}
