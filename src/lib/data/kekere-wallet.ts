import { prisma } from "@/lib/db/prisma";
import type { Transaction, Wallet } from "@prisma/client";

export type WalletWithTransactions = Wallet & { transactions: Transaction[] };

export async function getWalletForUser(userId: string): Promise<WalletWithTransactions | null> {
  return prisma.wallet.findUnique({
    where: { userId },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
}
