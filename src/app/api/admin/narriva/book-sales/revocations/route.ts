export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async () => {
    const revocations = await prisma.bookPurchaseRevocation.findMany({
      orderBy: { revokedAt: "desc" },
    });

    return NextResponse.json({
      revocations: revocations.map((r) => ({
        id: r.id,
        bookId: r.bookId,
        userId: r.userId,
        bookTitle: r.bookTitle,
        adminId: r.adminId,
        adminNote: r.adminNote,
        revokedAt: r.revokedAt.toISOString(),
      })),
    });
  },
  { roles: ["ADMIN"] },
);
