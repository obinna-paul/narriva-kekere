export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { completeWithdrawal } from "@/lib/economy/withdrawals";
import { logAdminAction } from "@/lib/admin/logAction";

const markPaidSchema = z.object({ reference: z.string().min(1) });

/**
 * Interim manual payment flow (see /approve) — the admin has already sent
 * the transfer themselves from their own bank app, and is now recording the
 * bank's transaction reference as proof. This runs the exact same
 * completion logic a successful Paystack transfer.success webhook would
 * have triggered: Transaction COMPLETED, writer notified, wallet already
 * debited at request time so no further balance change here.
 *
 * Also accepts PROCESSING — any request that reached that status via the
 * old automatic-Transfer approve route before this interim flow shipped
 * will never get its transfer.success webhook now, so it needs the same
 * manual resolution path.
 */
export const PUT = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const body = await request.json().catch(() => null);
    const parsed = markPaidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }
    if (existing.status !== "APPROVED" && existing.status !== "PROCESSING") {
      return NextResponse.json(
        { error: `Cannot mark a request with status ${existing.status} as paid — it must be APPROVED first.` },
        { status: 400 }
      );
    }

    const result = await completeWithdrawal(params.id, parsed.data.reference);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(session.user.id, existing.userId, "MARK_WITHDRAWAL_PAID", {
      withdrawalId: existing.id,
      reference: parsed.data.reference,
      cowriesAmount: existing.cowriesAmount.toNumber(),
      ngnAmount: existing.ngnAmount,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
