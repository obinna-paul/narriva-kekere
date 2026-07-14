export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { renderWithdrawalProcessingEmail } from "@/lib/email/templates";
import { logAdminAction } from "@/lib/admin/logAction";
import { KEKERE_GENERAL_FROM } from "@/lib/constants";

/**
 * Interim manual payment flow — Kekere is currently a Paystack Starter
 * Business without Transfers API access. This no longer calls Paystack at
 * all: it just marks the request APPROVED and hands the admin the bank
 * details to send the transfer themselves from their own banking app. Once
 * upgraded to Registered Business, restore the automatic Paystack Transfer
 * call here (createTransferRecipient + initiateTransfer), per the original
 * Phase A4 spec — the /mark-paid and /mark-failed routes added alongside
 * this can stay either way, since they're also useful as a manual override
 * even with Transfers enabled.
 */
export const PUT = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const withdrawalReq = await prisma.withdrawalRequest.findUnique({
      where: { id: params.id },
      include: { bankDetails: true, user: { select: { name: true, email: true } } },
    });
    if (!withdrawalReq) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }
    if (withdrawalReq.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot approve a request with status ${withdrawalReq.status}` },
        { status: 400 }
      );
    }

    await prisma.withdrawalRequest.update({
      where: { id: withdrawalReq.id },
      data: { status: "APPROVED" },
    });

    await logAdminAction(session.user.id, withdrawalReq.userId, "APPROVE_WITHDRAWAL", {
      withdrawalId: withdrawalReq.id,
      cowriesAmount: withdrawalReq.cowriesAmount.toNumber(),
      ngnAmount: withdrawalReq.ngnAmount,
    });

    const html = await renderWithdrawalProcessingEmail({
      writerName: withdrawalReq.user.name,
      cowries: withdrawalReq.cowriesAmount.toNumber(),
      ngnAmount: withdrawalReq.ngnAmount,
    }).catch(() => undefined);
    await sendEmail({
      to: withdrawalReq.user.email,
      subject: "Your withdrawal is being processed",
      body: `Hi ${withdrawalReq.user.name},\n\nYour withdrawal request for ${withdrawalReq.cowriesAmount} cowries (₦${withdrawalReq.ngnAmount}) has been approved and is being processed. It should arrive in your bank account shortly.\n\nIf you have any questions, contact support@narriva.pro.`,
      from: KEKERE_GENERAL_FROM,
      html,
    });

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      bankDetails: {
        bankName: withdrawalReq.bankDetails.bankName,
        accountNumber: withdrawalReq.bankDetails.accountNumber,
        accountName: withdrawalReq.bankDetails.accountName,
      },
      ngnAmount: withdrawalReq.ngnAmount,
    });
  },
  { roles: ["ADMIN"] }
);
