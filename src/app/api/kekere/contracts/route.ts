export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (request, session) => {
  const writerId = session.user.id;

  const contracts = await prisma.kekereContract.findMany({
    where: { writerId },
    include: {
      template: { select: { contractType: true } },
    },
    orderBy: { sentAt: "desc" },
  });

  const now = Date.now();

  return NextResponse.json({
    contracts: contracts.map((c) => {
      if (c.status === "PENDING" && c.expiresAt && c.expiresAt.getTime() < now) {
        prisma.kekereContract
          .update({ where: { id: c.id }, data: { status: "EXPIRED" } })
          .catch(() => {});

        return {
          id: c.id,
          contractType: c.template.contractType,
          status: "EXPIRED" as const,
          sentAt: c.sentAt.toISOString(),
          signedAt: null,
          expiresAt: c.expiresAt!.toISOString(),
        };
      }

      return {
        id: c.id,
        contractType: c.template.contractType,
        status: c.status,
        sentAt: c.sentAt.toISOString(),
        signedAt: c.signedAt?.toISOString() ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
      };
    }),
  });
});
