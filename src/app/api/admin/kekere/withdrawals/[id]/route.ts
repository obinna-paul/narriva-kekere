export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_request, _session, { params }: { params: { id: string } }) => {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        bankDetails: true,
      },
    });
    if (!request) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    const [earningsTransactions, previousWithdrawals] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          wallet: { userId: request.userId },
          type: { in: ["EARNINGS_CREDIT", "TIP_RECEIVED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId: request.userId, id: { not: request.id } },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      id: request.id,
      status: request.status,
      cowriesAmount: request.cowriesAmount.toNumber(),
      ngnAmount: request.ngnAmount,
      requestedAt: request.requestedAt,
      processedAt: request.processedAt,
      paystackTransferCode: request.paystackTransferCode,
      paystackTransferRef: request.paystackTransferRef,
      adminNote: request.adminNote,
      rejectionReason: request.rejectionReason,
      user: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
        role: request.user.role,
        createdAt: request.user.createdAt,
      },
      bankDetails: {
        bankName: request.bankDetails.bankName,
        bankCode: request.bankDetails.bankCode,
        accountNumber: request.bankDetails.accountNumber,
        accountName: request.bankDetails.accountName,
        verifiedAt: request.bankDetails.verifiedAt,
      },
      earningsHistory: earningsTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCowries: t.amountCowries.toNumber(),
        description: t.description,
        createdAt: t.createdAt,
      })),
      previousWithdrawals: previousWithdrawals.map((w) => ({
        id: w.id,
        cowriesAmount: w.cowriesAmount.toNumber(),
        ngnAmount: w.ngnAmount,
        status: w.status,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
      })),
    });
  },
  { roles: ["ADMIN"] }
);
