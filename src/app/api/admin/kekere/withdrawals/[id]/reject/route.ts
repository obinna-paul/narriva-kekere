export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { failWithdrawal } from "@/lib/economy/withdrawals";
import { sendEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";

const rejectSchema = z.object({ reason: z.string().min(1) });

export const PUT = withAuth(
  async (request, _session, { params }: { params: { id: string } }) => {
    const body = await request.json().catch(() => null);
    const parsed = rejectSchema.safeParse(body);
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
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot reject a request with status ${existing.status}` },
        { status: 400 }
      );
    }

    const result = await failWithdrawal(params.id, { kind: "REJECTED", reason: parsed.data.reason });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const writer = await prisma.user.findUnique({ where: { id: result.userId }, select: { email: true } });
    if (writer) {
      await sendEmail({
        to: writer.email,
        subject: "Your withdrawal request was not approved",
        body: `Your withdrawal request for ${result.cowriesAmount} cowries was rejected.\n\nReason: ${parsed.data.reason}\n\nYour earned balance has been restored — the cowries are back in your wallet and you're welcome to submit a new request.`,
      });
    }

    await createNotification({
      userId: result.userId,
      type: "WITHDRAWAL_REJECTED",
      title: "Withdrawal request declined",
      body: `Your request to withdraw ${result.cowriesAmount} cowries was not approved. Your balance has been restored. Reason: ${parsed.data.reason}`,
      link: "/kekere/wallet",
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
