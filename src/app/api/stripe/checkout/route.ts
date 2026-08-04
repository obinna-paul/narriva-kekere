export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { createCheckoutSession } from "@/lib/stripe/client";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";

/**
 * Starts a Stripe Checkout Session for a wallet top-up — the international
 * counterpart to Paystack's Inline popup. Unlike Paystack (a same-page JS
 * popup), Checkout is a full-page redirect: the browser leaves the site
 * entirely and comes back to successUrl once the buyer pays or cancels, so
 * this only ever hands back a URL to redirect to, never a reference to await
 * inline.
 *
 * Turnstile is checked here rather than at /api/stripe/verify (where
 * Paystack's equivalent check lives) because this is the same-page step —
 * the token is fresh here. By the time the buyer is back at verify, they may
 * have spent minutes on Stripe's own page (card entry, 3D Secure), long
 * enough for a Turnstile token to expire.
 */
const checkoutSchema = z.object({
  packageIndex: z.number().int().min(0),
  turnstileToken: z.string().optional().nullable(),
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken ?? "", remoteIp))) {
    return NextResponse.json({ error: "Verification failed — please try again" }, { status: 400 });
  }

  const pkg = COWRIE_TOPUP_PACKAGES[parsed.data.packageIndex];
  if (!pkg) {
    return NextResponse.json({ error: "Unknown top-up package" }, { status: 400 });
  }
  if (!session.user.email) {
    return NextResponse.json({ error: "Account has no email on file" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const cowriesTotal = pkg.cowries + pkg.bonusCowries;

  let checkoutSession;
  try {
    checkoutSession = await createCheckoutSession({
      amountUsdCents: Math.round(pkg.priceUSD * 100),
      productName: `${cowriesTotal.toLocaleString()} cowries — Kekere Stories`,
      customerEmail: session.user.email,
      successUrl: `${origin}/kekere/wallet?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/kekere/wallet`,
      metadata: {
        type: "wallet_topup",
        userId: session.user.id,
        packageIndex: String(parsed.data.packageIndex),
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not start Stripe checkout" }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutSession.url });
});
