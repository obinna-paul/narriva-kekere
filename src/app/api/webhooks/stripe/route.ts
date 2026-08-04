export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe/client";
import { creditTopUp } from "@/lib/economy/cowries";
import { triggerReferralRewardOnFirstTopUp } from "@/lib/data/kekere-referrals";
import { sendFirstTopUpThankYouEmail } from "@/lib/data/kekere-wallet";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import type Stripe from "stripe";

/**
 * Source of truth for Stripe payment outcomes — mirrors
 * src/app/api/webhooks/paystack. Unlike /api/stripe/verify (which only runs
 * if the buyer's browser actually makes it back to the wallet page), Stripe
 * calls this directly, so it's what guarantees crediting happens even if the
 * buyer closes the tab right after paying. Must read the raw body (not
 * request.json()) because signature verification is computed over the exact
 * bytes Stripe sent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  const event = constructWebhookEvent(rawBody, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ ok: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata as { type?: string; userId?: string; packageIndex?: string } | null;
  if (metadata?.type !== "wallet_topup" || !metadata.userId) return;
  if (session.payment_status !== "paid") return;

  const packageIndex = Number(metadata.packageIndex);
  const pkg = COWRIE_TOPUP_PACKAGES[packageIndex];
  // Derived from the amount Stripe actually settled, not the metadata's
  // packageIndex — a tampered or stale value must never be able to credit
  // more cowries than were paid for. Same rule as the Paystack webhook.
  if (!pkg || session.currency !== "usd" || session.amount_total !== Math.round(pkg.priceUSD * 100)) return;

  const cowriesTotal = pkg.cowries + pkg.bonusCowries;
  const topUpResult = await creditTopUp(
    metadata.userId,
    cowriesTotal,
    session.id,
    `Stripe top-up — $${pkg.priceUSD.toFixed(2)}`,
  );

  if ("success" in topUpResult || "already_processed" in topUpResult) {
    await triggerReferralRewardOnFirstTopUp(metadata.userId, pkg.priceNGN).catch(() => {});
    await sendFirstTopUpThankYouEmail(metadata.userId).catch(() => {});
  }
}
