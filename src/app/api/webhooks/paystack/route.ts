import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack/client";
import { processBookPurchase, processWalletTopup } from "@/lib/data/payments";

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

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const { reference, metadata } = event.data;
  if (!metadata?.type) {
    return NextResponse.json({ ok: true });
  }

  if (metadata.type === "book_purchase") {
    await processBookPurchase(reference, metadata.userId, metadata.bookId);
  } else if (metadata.type === "wallet_topup") {
    await processWalletTopup(reference, metadata.userId, Number(metadata.packageIndex));
  }

  return NextResponse.json({ ok: true });
}
