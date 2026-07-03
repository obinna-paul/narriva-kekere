export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";

const adjustSchema = z.object({
  wallet: z.enum(["spending", "earned"]),
  amount: z.number().int().refine((v) => v !== 0, "Amount cannot be zero."),
  reason: z.string().min(10, "Reason must be at least 10 characters."),
});

const SUPER_ADMIN_DEFAULT = "admin@narriva.com";

export const POST = withAuth(
  async (request, session, { params }) => {
    const { id } = params as { id: string };

    const superAdminEmail = await getSetting(
      "super_admin_email",
      SUPER_ADMIN_DEFAULT,
    );

    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!target.wallet) {
      await prisma.wallet.create({
        data: { userId: id },
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { wallet: walletType, amount, reason } = parsed.data;

    const wallet = await prisma.wallet.findUnique({
      where: { userId: id },
      select: { id: true, spendingBalance: true, earnedBalance: true },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const balanceField =
      walletType === "spending" ? "spendingBalance" : "earnedBalance";
    const currentBalance =
      walletType === "spending"
        ? wallet.spendingBalance
        : wallet.earnedBalance;

    if (amount < 0 && currentBalance < Math.abs(amount)) {
      return NextResponse.json(
        {
          error: "insufficient_balance",
          balance: currentBalance,
          requested: Math.abs(amount),
        },
        { status: 400 },
      );
    }

    const absAmount = Math.abs(amount);

    const [updatedWallet] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { [balanceField]: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "TOP_UP",
          amountCowries: absAmount,
          amountNgn: 0,
          walletField:
            walletType === "spending" ? ("SPENDING" as const) : ("EARNED" as const),
          description: `Manual adjustment: ${reason}`,
          status: "COMPLETED",
        },
      }),
    ]);

    await logAdminAction(session.user.id, id, "MANUAL_COWRIE_ADJUSTMENT", {
      wallet: walletType,
      amount,
      reason,
    });

    const newBalance =
      walletType === "spending"
        ? updatedWallet.spendingBalance
        : updatedWallet.earnedBalance;

    return NextResponse.json({ success: true, newBalance });
  },
  { roles: ["ADMIN"] },
);
