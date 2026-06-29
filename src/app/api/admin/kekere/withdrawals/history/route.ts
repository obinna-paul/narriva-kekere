import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const completed = await prisma.withdrawalRequest.findMany({
      where: { status: "COMPLETED" },
      orderBy: { processedAt: "desc" },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({
      payouts: completed.map((w) => ({
        id: w.id,
        writerName: w.user.name,
        cowriesAmount: w.cowriesAmount,
        ngnAmount: w.ngnAmount,
        paystackTransferRef: w.paystackTransferRef,
        processedAt: w.processedAt,
      })),
    });
  },
  { roles: ["ADMIN"] }
);
