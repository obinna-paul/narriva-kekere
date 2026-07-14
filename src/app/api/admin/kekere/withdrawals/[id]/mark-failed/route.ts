export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { failWithdrawal } from "@/lib/economy/withdrawals";
import { sendEmail } from "@/lib/email/send";
import { renderWithdrawalFailedEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/notifications/create";
import { logAdminAction } from "@/lib/admin/logAction";
import { KEKERE_GENERAL_FROM } from "@/lib/constants";

const markFailedSchema = z.object({ reason: z.string().min(1) });

/**
 * Interim manual payment flow (see /approve) — use this when an approved
 * transfer didn't actually go through (wrong account, bank error, etc.)
 * after the admin already attempted to send it. Restores the writer's
 * balance, same as the dead transfer.failed webhook path would have.
 */
export const PUT = withAuth(
  async (request, session, { params }: { params: { id: string } }) => {
    const body = await request.json().catch(() => null);
    const parsed = markFailedSchema.safeParse(body);
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
        { error: `Cannot mark a request with status ${existing.status} as failed — it must be APPROVED first.` },
        { status: 400 }
      );
    }

    const result = await failWithdrawal(params.id, { kind: "FAILED", adminNote: parsed.data.reason });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const writer = await prisma.user.findUnique({ where: { id: result.userId }, select: { name: true, email: true } });
    if (writer) {
      const html = await renderWithdrawalFailedEmail({
        writerName: writer.name,
        cowries: result.cowriesAmount,
      }).catch(() => undefined);
      await sendEmail({
        to: writer.email,
        subject: "Your withdrawal could not be processed",
        body: `Your withdrawal of ${result.cowriesAmount} cowries could not be processed. Your balance has been restored. Please contact support.`,
        from: KEKERE_GENERAL_FROM,
        html,
      });
    }

    await createNotification({
      userId: result.userId,
      type: "WITHDRAWAL_REJECTED",
      title: "Withdrawal couldn't be completed",
      body: `Your withdrawal of ${result.cowriesAmount} cowries could not be completed. Your balance has been restored.`,
      link: "/kekere/wallet",
    });

    await logAdminAction(session.user.id, existing.userId, "MARK_WITHDRAWAL_FAILED", {
      withdrawalId: existing.id,
      reason: parsed.data.reason,
      cowriesAmount: existing.cowriesAmount.toNumber(),
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
