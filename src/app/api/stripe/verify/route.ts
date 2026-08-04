export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { retrieveCheckoutSession } from "@/lib/stripe/client";
import { creditTopUp } from "@/lib/economy/cowries";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { triggerReferralRewardOnFirstTopUp } from "@/lib/data/kekere-referrals";
import { sendFirstTopUpThankYouEmail } from "@/lib/data/kekere-wallet";

/**
 * Fast path for the Stripe top-up flow — the equivalent of /api/paystack/verify,
 * called once the buyer is redirected back to the wallet page with a session
 * id in the URL (see successUrl in /api/stripe/checkout). The webhook
 * (/api/webhooks/stripe) is the eventual-consistency safety net for the case
 * where the buyer closes the tab before this ever runs; both call the same
 * idempotent creditTopUp(), so whichever fires first does the crediting.
 *
 * No Turnstile check here, unlike Paystack's verify: that check guards against
 * spamming the endpoint with junk references — Paystack's popup issues a
 * fresh token right before checkout, but Stripe's redirect flow can leave the
 * buyer on Stripe's own page for minutes (card entry, 3D Secure), long enough
 * for a Turnstile token collected beforehand to expire. The re-verification
 * against Stripe's own API below already establishes a real Stripe session id
 * is not a guessable value, which is the actual thing worth defending here.
 */
const verifySchema = z.object({
  sessionId: z.string().min(1),
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  let checkoutSession;
  try {
    checkoutSession = await retrieveCheckoutSession(parsed.data.sessionId);
  } catch {
    return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
  }

  if (!checkoutSession.paid) {
    return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
  }
  // The session must belong to the caller — otherwise anyone who ever saw a
  // Stripe session id (e.g. in a referrer header) could replay it against
  // their own account.
  if (checkoutSession.metadata?.type !== "wallet_topup" || checkoutSession.metadata?.userId !== session.user.id) {
    return NextResponse.json({ error: "Session does not belong to this account" }, { status: 403 });
  }

  const packageIndex = Number(checkoutSession.metadata.packageIndex);
  const pkg = COWRIE_TOPUP_PACKAGES[packageIndex];
  // Matched against what Stripe actually settled, not just the metadata's
  // packageIndex — same rule as Paystack's verify.
  if (!pkg || checkoutSession.currency !== "usd" || checkoutSession.amountTotalCents !== Math.round(pkg.priceUSD * 100)) {
    return NextResponse.json({ error: "Paid amount doesn't match any top-up package" }, { status: 400 });
  }

  const cowriesTotal = pkg.cowries + pkg.bonusCowries;
  const result = await creditTopUp(
    session.user.id,
    cowriesTotal,
    checkoutSession.id,
    `Stripe top-up — $${pkg.priceUSD.toFixed(2)}`,
  );

  if ("success" in result || "already_processed" in result) {
    await triggerReferralRewardOnFirstTopUp(session.user.id, pkg.priceNGN).catch(() => {});
    await sendFirstTopUpThankYouEmail(session.user.id).catch(() => {});
  }

  return NextResponse.json(result);
});
