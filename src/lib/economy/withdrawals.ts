/**
 * Withdrawal-request state machine. Like cowries.ts, this is the only place
 * that should touch Wallet.earnedBalance for withdrawal purposes — route
 * handlers call into these functions rather than writing the wallet
 * directly.
 *
 * There is no foreign key from Transaction back to WithdrawalRequest in the
 * schema, so the WITHDRAWAL Transaction created at request time stores the
 * WithdrawalRequest's id in `paymentReference` purely as a correlation key
 * (the field is otherwise only used for Paystack payment references) —
 * every later state transition looks the linked Transaction up that way.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderWithdrawalCompletedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { KEKERE_GENERAL_FROM } from "@/lib/constants";
import type { WithdrawalRequestStatus } from "@prisma/client";

export type CreateWithdrawalResult =
  | { success: true; request: { id: string; cowriesAmount: number; ngnAmount: number; status: "PENDING" } }
  | { error: "no_bank_details" }
  | { error: "insufficient_earned_balance"; balance: number }
  | { error: "request_already_pending" };

const ACTIVE_STATUSES: WithdrawalRequestStatus[] = ["PENDING", "APPROVED", "PROCESSING"];

export async function createWithdrawalRequest(
  userId: string,
  cowriesAmount: number,
  ngnAmount: number
): Promise<CreateWithdrawalResult> {
  const bankDetails = await prisma.writerBankDetails.findUnique({ where: { userId } });
  if (!bankDetails) return { error: "no_bank_details" };

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  const earnedBalance = wallet.earnedBalance.toNumber();
  if (earnedBalance < cowriesAmount) {
    return { error: "insufficient_earned_balance", balance: earnedBalance };
  }

  const existing = await prisma.withdrawalRequest.findFirst({
    where: { userId, status: { in: ACTIVE_STATUSES } },
  });
  if (existing) return { error: "request_already_pending" };

  const requestId = randomUUID();

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { earnedBalance: { decrement: cowriesAmount } },
    }),
    prisma.withdrawalRequest.create({
      data: {
        id: requestId,
        userId,
        cowriesAmount,
        ngnAmount,
        bankDetailsId: bankDetails.id,
        status: "PENDING",
      },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amountCowries: cowriesAmount,
        walletField: "EARNED",
        description: "Withdrawal request",
        paymentReference: requestId,
        status: "PENDING",
      },
    }),
  ]);

  return {
    success: true,
    request: { id: requestId, cowriesAmount, ngnAmount, status: "PENDING" },
  };
}

export async function markWithdrawalProcessing(withdrawalRequestId: string, transferCode: string): Promise<void> {
  await prisma.withdrawalRequest.update({
    where: { id: withdrawalRequestId },
    data: { status: "PROCESSING", paystackTransferCode: transferCode, processedAt: new Date() },
  });
}

export type FailWithdrawalOutcome =
  | { kind: "REJECTED"; reason: string }
  | { kind: "FAILED"; adminNote: string };

/**
 * Reverses a withdrawal that didn't go through — restores the cowries to
 * earnedBalance and marks both the request and its linked Transaction
 * failed/rejected. Used by admin rejection, a failed approval attempt, and
 * the transfer.failed webhook.
 */
export async function failWithdrawal(
  withdrawalRequestId: string,
  outcome: FailWithdrawalOutcome
): Promise<{ success: true; userId: string; cowriesAmount: number } | { error: "not_found" | "already_finalized" }> {
  const request = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawalRequestId } });
  if (!request) return { error: "not_found" };
  if (request.status === "COMPLETED" || request.status === "REJECTED" || request.status === "FAILED") {
    return { error: "already_finalized" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId: request.userId },
      data: { earnedBalance: { increment: request.cowriesAmount } },
    });

    if (outcome.kind === "REJECTED") {
      await tx.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: { status: "REJECTED", rejectionReason: outcome.reason, processedAt: new Date() },
      });
      await tx.transaction.updateMany({
        where: { paymentReference: withdrawalRequestId, type: "WITHDRAWAL" },
        data: { status: "FAILED", description: `Withdrawal rejected: ${outcome.reason}` },
      });
    } else {
      await tx.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: { status: "FAILED", adminNote: outcome.adminNote, processedAt: new Date() },
      });
      await tx.transaction.updateMany({
        where: { paymentReference: withdrawalRequestId, type: "WITHDRAWAL" },
        data: { status: "FAILED" },
      });
    }
  });

  return { success: true, userId: request.userId, cowriesAmount: request.cowriesAmount.toNumber() };
}

export async function completeWithdrawal(
  withdrawalRequestId: string,
  paystackTransferRef: string
): Promise<{ success: true } | { error: "not_found" }> {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalRequestId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!request) return { error: "not_found" };

  const cowriesAmount = request.cowriesAmount.toNumber();

  await prisma.$transaction([
    prisma.withdrawalRequest.update({
      where: { id: withdrawalRequestId },
      data: { status: "COMPLETED", paystackTransferRef, processedAt: new Date() },
    }),
    prisma.transaction.updateMany({
      where: { paymentReference: withdrawalRequestId, type: "WITHDRAWAL" },
      data: { status: "COMPLETED" },
    }),
  ]);

  const html = await renderWithdrawalCompletedEmail({
    writerName: request.user.name,
    cowries: cowriesAmount,
    ngnAmount: request.ngnAmount,
    reference: paystackTransferRef,
  }).catch(() => undefined);
  await sendEmail({
    to: request.user.email,
    subject: "Your withdrawal has been completed",
    body: `Hi ${request.user.name},\n\nYour withdrawal of ${cowriesAmount} cowries (₦${request.ngnAmount}) has been completed and should arrive in your bank account within 24 hours.\n\nReference: ${paystackTransferRef}`,
    from: KEKERE_GENERAL_FROM,
    html,
  });

  await createNotification({
    userId: request.userId,
    type: "WITHDRAWAL_PROCESSED",
    title: "Withdrawal successful",
    body: `${cowriesAmount} cowries (₦${request.ngnAmount}) have been sent to your bank account.`,
    link: "/kekere/wallet",
  });

  return { success: true };
}
