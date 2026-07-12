export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { createTransferRecipient, initiateTransfer } from "@/lib/paystack/client";
import { markWithdrawalProcessing, failWithdrawal } from "@/lib/economy/withdrawals";

export const PUT = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    const withdrawalReq = await prisma.withdrawalRequest.findUnique({
      where: { id: params.id },
      include: { bankDetails: true, user: { select: { name: true, email: true } } },
    });
    if (!withdrawalReq) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }
    if (withdrawalReq.status !== "PENDING" && withdrawalReq.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Cannot approve a request with status ${withdrawalReq.status}` },
        { status: 400 }
      );
    }

    try {
      const recipientCode = await createTransferRecipient({
        accountName: withdrawalReq.bankDetails.accountName,
        accountNumber: withdrawalReq.bankDetails.accountNumber,
        bankCode: withdrawalReq.bankDetails.bankCode,
      });

      const transfer = await initiateTransfer(
        recipientCode,
        Math.round(withdrawalReq.ngnAmount * 100),
        "Kekere Stories cowrie earnings withdrawal"
      );

      await markWithdrawalProcessing(withdrawalReq.id, transfer.transferCode);

      await sendEmail({
        to: withdrawalReq.user.email,
        subject: "Your withdrawal is being processed",
        body: `Hi ${withdrawalReq.user.name},\n\nYour withdrawal request for ${withdrawalReq.cowriesAmount} cowries (₦${withdrawalReq.ngnAmount}) has been approved and is being processed. It should arrive in your bank account shortly.\n\nIf you have any questions, contact support@narriva.pro.`,
      });

      return NextResponse.json({
        success: true,
        status: "PROCESSING",
        paystackTransferCode: transfer.transferCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Paystack transfer failed";
      await failWithdrawal(withdrawalReq.id, { kind: "FAILED", adminNote: message });
      return NextResponse.json({ error: "transfer_failed", message }, { status: 500 });
    }
  },
  { roles: ["ADMIN"] }
);
