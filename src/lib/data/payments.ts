import { prisma } from "@/lib/db/prisma";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";

/**
 * These two functions are the single source of truth for "crediting" a
 * verified Paystack payment — called from both /api/paystack/verify (fast
 * path, fired right after the client's checkout popup closes) and
 * /api/webhooks/paystack (the actual source of truth, fired by Paystack
 * itself). Whichever one runs first does the work; the other is a no-op.
 * That's what makes double-processing (webhook + client both firing, or the
 * webhook retrying after a timeout) safe.
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

export interface WalletTopupResult {
  status: "credited" | "already_processed";
  cowriesCredited: number;
}

export async function processWalletTopup(
  reference: string,
  userId: string,
  packageIndex: number
): Promise<WalletTopupResult> {
  const pkg = COWRIE_TOPUP_PACKAGES[packageIndex];
  if (!pkg) {
    throw new Error(`Invalid top-up package index: ${packageIndex}`);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { paymentReference: reference } });
    if (existing) {
      return { status: "already_processed" as const, cowriesCredited: 0 };
    }

    const cowriesCredited = pkg.cowries + pkg.bonusCowries;

    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: { balance: { increment: cowriesCredited } },
      create: { userId, balance: cowriesCredited },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "TOP_UP",
        amountCowries: cowriesCredited,
        amountNgn: pkg.priceNGN,
        paymentReference: reference,
        status: "COMPLETED",
        description: `Top-up: ${pkg.cowries.toLocaleString()} cowries${pkg.bonusCowries ? ` + ${pkg.bonusCowries} bonus` : ""}`,
      },
    });

    return { status: "credited" as const, cowriesCredited };
  });
}
