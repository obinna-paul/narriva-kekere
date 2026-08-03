/**
 * Finds and fixes a COMPLETED withdrawal whose ledger entry never landed.
 *
 * The normal path (createWithdrawalRequest in cowries.ts) always debits the
 * wallet and writes a matching WITHDRAWAL transaction (PENDING) in the same
 * atomic step, then completeWithdrawal (economy/withdrawals.ts) flips that
 * transaction's status to COMPLETED via an updateMany matched on
 * paymentReference. If that link is ever broken — most plausibly a
 * withdrawal that predates the current atomic flow — the WithdrawalRequest
 * ends up COMPLETED with real money already paid out by hand, but the
 * writer's earned wallet is never actually debited, and no per-wallet audit
 * (kekere-economy/wallet-audit) can catch it: the wallet's own transaction
 * history stays perfectly self-consistent, since as far as it's concerned
 * nothing was ever withdrawn.
 *
 * This is a genuinely rare, one-off class of bug (there's exactly one way
 * to create a WithdrawalRequest, and it's atomic) — this module exists to
 * find and correct whatever instance of it already exists, not to guard
 * against it recurring.
 */
import { prisma } from "@/lib/db/prisma";

export interface OrphanedWithdrawal {
  withdrawalId: string;
  userId: string;
  userEmail: string;
  userName: string;
  cowriesAmount: number;
  processedAt: Date | null;
  // "missing_transaction": no WITHDRAWAL row at all for this request — the
  // wallet was never debited, so fixing it means creating the row AND
  // decrementing the balance.
  // "transaction_not_completed": the row exists (the debit already
  // happened at request time, as it always does) but is stuck PENDING or
  // FAILED — completeWithdrawal's status flip never landed. Fixing it is
  // just correcting that status; the balance is already right.
  issue: "missing_transaction" | "transaction_not_completed";
}

export async function findOrphanedWithdrawalDebits(): Promise<OrphanedWithdrawal[]> {
  const completed = await prisma.withdrawalRequest.findMany({
    where: { status: "COMPLETED" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  const results: OrphanedWithdrawal[] = [];
  for (const w of completed) {
    const txn = await prisma.transaction.findFirst({
      where: { paymentReference: w.id, type: "WITHDRAWAL" },
      select: { status: true },
    });

    if (!txn) {
      results.push({
        withdrawalId: w.id,
        userId: w.userId,
        userEmail: w.user.email,
        userName: w.user.name,
        cowriesAmount: w.cowriesAmount.toNumber(),
        processedAt: w.processedAt,
        issue: "missing_transaction",
      });
    } else if (txn.status !== "COMPLETED") {
      results.push({
        withdrawalId: w.id,
        userId: w.userId,
        userEmail: w.user.email,
        userName: w.user.name,
        cowriesAmount: w.cowriesAmount.toNumber(),
        processedAt: w.processedAt,
        issue: "transaction_not_completed",
      });
    }
  }
  return results;
}

export interface ReconcileWithdrawalsResult {
  found: OrphanedWithdrawal[];
  fixed: OrphanedWithdrawal[];
}

export async function reconcileWithdrawalDebits(): Promise<ReconcileWithdrawalsResult> {
  const found = await findOrphanedWithdrawalDebits();
  const fixed: OrphanedWithdrawal[] = [];

  for (const o of found) {
    if (o.issue === "transaction_not_completed") {
      await prisma.transaction.updateMany({
        where: { paymentReference: o.withdrawalId, type: "WITHDRAWAL" },
        data: { status: "COMPLETED" },
      });
      fixed.push(o);
      continue;
    }

    // missing_transaction: the debit never happened at all, so the wallet's
    // earned balance is still overstated by the full withdrawn amount —
    // both writes have to happen together.
    const wallet = await prisma.wallet.findUnique({ where: { userId: o.userId } });
    if (!wallet) continue; // shouldn't happen — the withdrawal itself requires a wallet

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { earnedBalance: { decrement: o.cowriesAmount } },
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amountCowries: o.cowriesAmount,
          walletField: "EARNED",
          description: "Withdrawal request (backfilled — was completed but never debited the wallet)",
          paymentReference: o.withdrawalId,
          status: "COMPLETED",
        },
      }),
    ]);
    fixed.push(o);
  }

  return { found, fixed };
}
