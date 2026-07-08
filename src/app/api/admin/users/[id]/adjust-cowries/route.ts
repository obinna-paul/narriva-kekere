export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { logAdminAction } from "@/lib/admin/logAction";
import { round2 } from "@/lib/economy/round";

// spendingBalance is a true Int column (top-ups and story costs are always
// whole numbers), but earnedBalance is Decimal(10,2) — a writer's 70% share
// is routinely fractional (e.g. 2.10) — so only spending adjustments are
// restricted to whole cowries.
const adjustSchema = z
  .object({
    wallet: z.enum(["spending", "earned"]),
    amount: z.number().finite().refine((v) => v !== 0, "Amount cannot be zero."),
    reason: z.string().min(10, "Reason must be at least 10 characters."),
    // A normal adjustment moves the wallet's actual balance and records a
    // transaction for it — the two always move together, so it can never
    // close a gap between a wallet's stored balance and its own
    // transaction history (whatever the correction, the gap stays the
    // same size). recordOnly is for the opposite case: the balance is
    // already what it should be (e.g. legitimate legacy data), and the
    // ledger just needs to be told so — it writes the transaction without
    // touching the balance at all.
    recordOnly: z.boolean().optional().default(false),
    // "business": a deliberate decision (compensate a user, claw back an
    // error) — counted in totalIssued via ADMIN_CREDIT/ADMIN_DEBIT.
    // "correction": fixing a balance that was never backed by a real
    // transaction (untracked/legacy data) — uses DATA_CORRECTION_* instead,
    // which is excluded from totalIssued since it was never real issuance.
    kind: z.enum(["business", "correction"]).optional().default("business"),
  })
  .refine((data) => data.wallet !== "spending" || Number.isInteger(data.amount), {
    message: "Spending-wallet adjustments must be a whole number of cowries.",
    path: ["amount"],
  });

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

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

    const { wallet: walletType, reason, recordOnly, kind } = parsed.data;
    const amount = walletType === "earned" ? round2(parsed.data.amount) : parsed.data.amount;

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
        : wallet.earnedBalance.toNumber();

    if (!recordOnly && amount < 0 && currentBalance < Math.abs(amount)) {
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
    const reasonPrefix = recordOnly ? "Ledger backfill (no balance change)" : "Manual adjustment";
    const type =
      kind === "correction"
        ? (amount > 0 ? "DATA_CORRECTION_CREDIT" : "DATA_CORRECTION_DEBIT")
        : (amount > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT");

    const [updatedWallet] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: recordOnly ? {} : { [balanceField]: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountCowries: absAmount,
          walletField:
            walletType === "spending" ? ("SPENDING" as const) : ("EARNED" as const),
          description: `${reasonPrefix}: ${reason}`,
          status: "COMPLETED",
        },
      }),
    ]);

    await logAdminAction(session.user.id, id, "MANUAL_COWRIE_ADJUSTMENT", {
      wallet: walletType,
      amount,
      reason,
      recordOnly,
      kind,
    });

    const newBalance =
      walletType === "spending"
        ? updatedWallet.spendingBalance
        : updatedWallet.earnedBalance.toNumber();

    return NextResponse.json({ success: true, newBalance });
  },
  { roles: ["ADMIN"] },
);
