import { prisma } from "@/lib/db/prisma";
import type { Transaction, TransactionType, Wallet } from "@prisma/client";
import { sendEmail } from "@/lib/email/send";
import { renderWalletHistoryEmail } from "@/lib/email/templates";

export type WalletWithTransactions = Wallet & { transactions: Transaction[] };

export async function getWalletForUser(userId: string): Promise<WalletWithTransactions | null> {
  return prisma.wallet.findUnique({
    where: { userId },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
}

/** Transactions are stored as a positive magnitude regardless of direction. */
const DEBIT_TRANSACTION_TYPES = new Set<TransactionType>(["UNLOCK", "WITHDRAWAL", "TIP_SENT", "ADMIN_DEBIT"]);

export async function countTransactionsForUser(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
  if (!wallet) return 0;
  return prisma.transaction.count({
    where: { walletId: wallet.id, type: { not: "COMPLETION_BONUS" } },
  });
}

export type WalletHistoryEmailResult = { sent: true } | { sent: false; reason: string };

/**
 * Emails a user their full transaction history for an arbitrary date range —
 * the on-screen history only ever shows the 10 most recent rows, so this is
 * the only way to see older activity.
 */
export async function sendWalletHistoryEmail(
  userId: string,
  from: Date,
  to: Date
): Promise<WalletHistoryEmailResult> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return { sent: false, reason: "No wallet found for this account." };

  const transactions = await prisma.transaction.findMany({
    where: {
      walletId: wallet.id,
      type: { not: "COMPLETION_BONUS" },
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "desc" },
  });

  if (transactions.length === 0) {
    return { sent: false, reason: "No transactions found in that period." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return { sent: false, reason: "User not found." };

  const rows = transactions.map((t) => ({
    date: t.createdAt.toISOString(),
    label: t.description ?? t.type,
    amountCowries: t.amountCowries.toNumber(),
    isDebit: DEBIT_TRANSACTION_TYPES.has(t.type),
  }));

  const html = await renderWalletHistoryEmail({
    name: user.name,
    from: from.toISOString(),
    to: to.toISOString(),
    rows,
  }).catch(() => undefined);

  const fromLabel = from.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  const toLabel = to.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  const textLines = rows.map(
    (r) => `${new Date(r.date).toLocaleDateString()} — ${r.label}: ${r.isDebit ? "-" : "+"}${r.amountCowries} cowries`
  );

  await sendEmail({
    to: user.email,
    subject: `Your Kekere transaction history: ${fromLabel} – ${toLabel}`,
    body: `Hi ${user.name},\n\nHere's your Kekere wallet history from ${fromLabel} to ${toLabel}:\n\n${textLines.join("\n")}\n\n${rows.length} transaction${rows.length === 1 ? "" : "s"} in this period.`,
    html,
  });

  return { sent: true };
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
 *
 * Plain text only, sent from Obinna's own address — same reasoning as the
 * welcome email: a designed HTML template reads as bulk mail, plain text
 * from a real name reads as the personal note this actually is.
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

  await sendEmail({
    to: user.email,
    subject: "Thank you for topping up",
    from: "Obinna Ezeodili <obinna@narriva.pro>",
    body: `Hi ${user.name},\n\nObinna here, CEO of Kekere Stories. I saw you just topped up your cowries for the first time, and I wanted to say thank you, personally. Every cowrie you spend goes straight toward keeping African writers paid for their work.\n\nI hope you have a beautiful time on the app, reading amazing short stories from African writers.\n\nWith gratitude,\nObinna`,
  });
}

