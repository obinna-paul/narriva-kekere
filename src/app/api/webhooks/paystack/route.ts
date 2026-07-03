export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack/client";
import { processBookPurchase } from "@/lib/data/payments";
import { creditTopUp } from "@/lib/economy/cowries";
import { completeWithdrawal, failWithdrawal } from "@/lib/economy/withdrawals";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";

/**
 * Source of truth for payment outcomes — unlike /api/paystack/verify (which
 * only runs if the client is still on the page when checkout succeeds),
 * Paystack calls this directly, so it's what guarantees crediting happens
 * even if the buyer closes the tab right after paying. Must read the raw
 * body (not request.json()) because signature verification is computed over
 * the exact bytes Paystack sent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    await handleChargeSuccess(event.data);
  } else if (event.event === "transfer.success") {
    await handleTransferSuccess(event.data);
  } else if (event.event === "transfer.failed") {
    await handleTransferFailed(event.data);
  }

  return NextResponse.json({ ok: true });
}

async function handleChargeSuccess(data: { reference: string; amount: number; metadata?: { type?: string; userId?: string; bookId?: string } }) {
  const { reference, amount, metadata } = data;
  if (!metadata?.type) return;

  if (metadata.type === "book_purchase" && metadata.userId && metadata.bookId) {
    await processBookPurchase(reference, metadata.userId, metadata.bookId);
  } else if (metadata.type === "wallet_topup" && metadata.userId) {
    // Derived from the amount Paystack actually settled, not the client-sent
    // packageIndex — a tampered or stale metadata.packageIndex must never be
    // able to credit more cowries than were paid for.
    const paidNGN = Number(amount) / 100;
    const pkg = COWRIE_TOPUP_PACKAGES.find((p) => p.priceNGN === paidNGN);
    if (pkg) {
      const cowriesTotal = pkg.cowries + pkg.bonusCowries;
      await creditTopUp(metadata.userId, cowriesTotal, reference);
    }
  }
}

async function handleTransferSuccess(data: { transfer_code: string; reference: string }) {
  const withdrawal = await prisma.withdrawalRequest.findFirst({
    where: { paystackTransferCode: data.transfer_code },
  });
  if (!withdrawal) return;

  await completeWithdrawal(withdrawal.id, data.reference);
}

async function handleTransferFailed(data: { transfer_code: string }) {
  const withdrawal = await prisma.withdrawalRequest.findFirst({
    where: { paystackTransferCode: data.transfer_code },
  });
  if (!withdrawal) return;

  const result = await failWithdrawal(withdrawal.id, {
    kind: "FAILED",
    adminNote: "Paystack reported transfer.failed",
  });
  if ("error" in result) return;

  const writer = await prisma.user.findUnique({ where: { id: result.userId }, select: { email: true } });
  if (writer) {
    await sendEmail({
      to: writer.email,
      subject: "Your withdrawal could not be processed",
      body: `Your withdrawal of ${result.cowriesAmount} cowries could not be processed. Your balance has been restored. Please contact support.`,
    });
  }
}
