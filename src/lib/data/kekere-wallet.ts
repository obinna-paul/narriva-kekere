import { prisma } from "@/lib/db/prisma";
import type { Transaction, Wallet } from "@prisma/client";

export type WalletWithTransactions = Wallet & { transactions: Transaction[] };

export async function getWalletForUser(userId: string): Promise<WalletWithTransactions | null> {
  return prisma.wallet.findUnique({
    where: { userId },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
}

export interface AdminTransactionRow {
  id: string;
  userEmail: string;
  type: Transaction["type"];
  status: Transaction["status"];
  amountCowries: number;
  amountNgn: number | null;
  paymentReference: string | null;
  createdAt: Date;
}

export async function listAllTransactions(): Promise<AdminTransactionRow[]> {
  const transactions = await prisma.transaction.findMany({
    include: { wallet: { select: { user: { select: { email: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return transactions.map((t) => ({
    id: t.id,
    userEmail: t.wallet.user.email,
    type: t.type,
    status: t.status,
    amountCowries: t.amountCowries,
    amountNgn: t.amountNgn,
    paymentReference: t.paymentReference,
    createdAt: t.createdAt,
  }));
}

const MIN_WITHDRAWAL_COWRIES = 10;

export async function requestWithdrawal(userId: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < MIN_WITHDRAWAL_COWRIES) {
      throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL_COWRIES} cowries`);
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { bankAccountNumber: true, bankName: true, bankAccountName: true },
    });

    if (!user?.bankAccountNumber || !user?.bankName) {
      throw new Error("Please add your bank details in your profile first");
    }

    const cowries = wallet.balance;
    const ngnAmount = cowries * 50;

    await tx.wallet.update({
      where: { userId },
      data: { balance: 0 },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amountCowries: -cowries,
        amountNgn: ngnAmount,
        status: "PENDING",
        description: `Withdrawal to ${user.bankName} (${user.bankAccountNumber.slice(-4).padStart(10, "*")})`,
      },
    });

    return { cowries, ngnAmount, bankName: user.bankName };
  });
}
