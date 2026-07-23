export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (request, session, { params }) => {
  const writerId = session.user.id;
  const { id } = params as { id: string };

  const contract = await prisma.kekereContract.findUnique({
    where: { id },
    include: {
      template: { select: { name: true, contractType: true } },
      story: { select: { id: true } },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.writerId !== writerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let status = contract.status;
  const now = Date.now();

  if (status === "PENDING" && contract.expiresAt && contract.expiresAt.getTime() < now) {
    status = "EXPIRED";
    await prisma.kekereContract
      .update({ where: { id }, data: { status: "EXPIRED" } })
      .catch(() => {});
  }

  return NextResponse.json({
    id: contract.id,
    templateName: contract.template.name,
    contractType: contract.template.contractType,
    body: contract.body,
    status,
    signedName: contract.signedName,
    signedAt: contract.signedAt?.toISOString() ?? null,
    declinedAt: contract.declinedAt?.toISOString() ?? null,
    declineReason: contract.declineReason,
    expiresAt: contract.expiresAt?.toISOString() ?? null,
    sentAt: contract.sentAt.toISOString(),
    storyId: contract.story?.id ?? null,
  });
});
