import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSettingNumber, getFeatureFlag } from "@/lib/settings/get";
import { MINIMUM_WITHDRAWAL_COWRIES } from "@/content/decisions";
import { createWithdrawalRequest } from "@/lib/economy/withdrawals";

const withdrawalSchema = z.object({
  cowriesAmount: z.number().int().positive(),
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = withdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { cowriesAmount } = parsed.data;

  const withdrawalEnabled = await getFeatureFlag("cowrie_withdrawals", true);
  if (!withdrawalEnabled) {
    return NextResponse.json({ error: "withdrawals_disabled" }, { status: 403 });
  }

  const minWithdrawal = await getSettingNumber("minimum_withdrawal_cowries", MINIMUM_WITHDRAWAL_COWRIES);
  if (cowriesAmount < minWithdrawal) {
    return NextResponse.json(
      { error: "below_minimum", minimum: minWithdrawal },
      { status: 400 }
    );
  }

  const rate = await getSettingNumber("withdrawal_rate_ngn_per_cowrie", 50);
  const ngnAmount = cowriesAmount * rate;

  const result = await createWithdrawalRequest(session.user.id, cowriesAmount, ngnAmount);

  if ("error" in result) {
    const status = result.error === "insufficient_earned_balance" ? 400 : 400;
    return NextResponse.json(
      result.error === "insufficient_earned_balance"
        ? { error: result.error, balance: result.balance }
        : { error: result.error },
      { status }
    );
  }

  return NextResponse.json({ success: true, request: result.request });
});

export const GET = withAuth(async (_request, session) => {
  const requests = await prisma.withdrawalRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { requestedAt: "desc" },
    include: { bankDetails: { select: { bankName: true, accountNumber: true } } },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      cowriesAmount: r.cowriesAmount,
      ngnAmount: r.ngnAmount,
      status: r.status,
      requestedAt: r.requestedAt,
      processedAt: r.processedAt,
      bankDetails: {
        bankName: r.bankDetails.bankName,
        accountNumberLast4: r.bankDetails.accountNumber.slice(-4),
      },
      rejectionReason: r.rejectionReason,
    })),
  });
});
