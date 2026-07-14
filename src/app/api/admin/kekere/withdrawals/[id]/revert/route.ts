export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/logAction";

/**
 * Undoes an approval before any money has moved — for when an admin
 * approves a request by mistake. No balance change: the cowries were
 * already deducted at request time and stay deducted while APPROVED.
 */
export const PUT = withAuth(
  async (_request, session, { params }: { params: { id: string } }) => {
    const existing = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }
    if (existing.status !== "APPROVED" && existing.status !== "PROCESSING") {
      return NextResponse.json(
        { error: `Cannot revert a request with status ${existing.status} — it must be APPROVED.` },
        { status: 400 }
      );
    }

    await prisma.withdrawalRequest.update({
      where: { id: params.id },
      data: { status: "PENDING" },
    });

    await logAdminAction(session.user.id, existing.userId, "REVERT_WITHDRAWAL_APPROVAL", {
      withdrawalId: existing.id,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
