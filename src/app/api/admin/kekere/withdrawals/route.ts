export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import type { WithdrawalRequestStatus } from "@prisma/client";

const VALID_STATUSES: WithdrawalRequestStatus[] = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
  "FAILED",
];

export const GET = withAuth(
  async (request) => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status = VALID_STATUSES.includes(statusParam as WithdrawalRequestStatus)
      ? (statusParam as WithdrawalRequestStatus)
      : "PENDING";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

    const [requests, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where: { status },
        orderBy: { requestedAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          bankDetails: true,
        },
      }),
      prisma.withdrawalRequest.count({ where: { status } }),
    ]);

    const now = Date.now();

    return NextResponse.json({
      page,
      limit,
      total,
      requests: requests.map((r) => ({
        id: r.id,
        userName: r.user.name,
        userEmail: r.user.email,
        cowriesAmount: r.cowriesAmount.toNumber(),
        ngnAmount: r.ngnAmount,
        bankDetails: {
          bankName: r.bankDetails.bankName,
          bankCode: r.bankDetails.bankCode,
          accountNumber: r.bankDetails.accountNumber,
          accountName: r.bankDetails.accountName,
          verifiedAt: r.bankDetails.verifiedAt,
        },
        requestedAt: r.requestedAt,
        daysWaiting: Math.floor((now - r.requestedAt.getTime()) / 86400000),
        status: r.status,
        adminNote: r.adminNote,
        processedAt: r.processedAt,
      })),
    });
  },
  { roles: ["ADMIN"] }
);
