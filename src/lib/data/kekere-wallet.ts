import { prisma } from "@/lib/db/prisma";
import type { Transaction, Wallet } from "@prisma/client";
import { sendEmail } from "@/lib/email/send";
import { renderFirstTopUpEmail } from "@/lib/email/templates";

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
    amountCowries: t.amountCowries.toNumber(),
    amountNgn: t.amountNgn,
    paymentReference: t.paymentReference,
    createdAt: t.createdAt,
  }));
}

/**
 * Called after every successful cowrie top-up. If this was the user's
 * first-ever completed top-up, sends a personal thank-you email from the
 * CEO. Callers gate this on a successful creditTopUp() result, same as
 * triggerReferralRewardOnFirstTopUp — whichever of the webhook or the
 * client-side verify route credits first is the one that sends it.
 */
export async function sendFirstTopUpThankYouEmail(userId: string): Promise<void> {
  const topUpCount = await prisma.transaction.count({
    where: { wallet: { userId }, type: "TOP_UP", status: "COMPLETED" },
  });
  if (topUpCount !== 1) return; // only the very first top-up

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return;

  const html = await renderFirstTopUpEmail({ name: user.name }).catch(() => undefined);
  await sendEmail({
    to: user.email,
    subject: "Thank you for topping up — a note from our CEO",
    body: `Hi ${user.name},\n\nObinna here, CEO of Kekere Stories. I saw you just topped up your cowries for the first time, and I wanted to say thank you, personally. Every cowrie you spend goes straight toward keeping African writers paid for their work.\n\nI hope you have a beautiful time on the app, reading amazing short stories from African writers.\n\nWith gratitude,\nObinna Ezeodili\nCEO, Kekere Stories`,
    html,
  });
}

