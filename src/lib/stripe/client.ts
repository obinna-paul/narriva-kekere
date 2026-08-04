import Stripe from "stripe";

/**
 * Server-side Stripe integration — hosted Checkout only, no Stripe.js/Elements
 * on the client. A Checkout Session redirect keeps all card data on Stripe's
 * own page (out of PCI scope for us entirely) and needs nothing beyond a
 * secret key on the server, unlike Elements which would also need a
 * publishable key and a client-side integration to build and test.
 */

let client: Stripe | null = null;

function getStripeClient(): Stripe {
  if (client) return client;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  client = new Stripe(secretKey);
  return client;
}

export interface CreateCheckoutSessionInput {
  amountUsdCents: number;
  productName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

/**
 * Creates a hosted Checkout Session for a one-off wallet top-up. USD only for
 * now — Stripe still shows local payment methods (cards, wallets) to the
 * buyer regardless of their country, it's just the settlement currency that's
 * fixed, so this doesn't block a Nigerian card or a European one, just keeps
 * pricing predictable rather than floating with live FX on every load.
 */
export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string; id: string }> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: input.productName },
          unit_amount: input.amountUsdCents,
        },
        quantity: 1,
      },
    ],
    metadata: input.metadata,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL");
  }
  return { url: session.url, id: session.id };
}

export interface RetrievedCheckoutSession {
  id: string;
  paid: boolean;
  amountTotalCents: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  customerEmail: string | null;
}

/**
 * Re-fetches a Checkout Session directly from Stripe by id. Never trust the
 * success_url redirect alone — same rule as Paystack's verify — the buyer
 * landing back on success_url only proves the redirect happened, not that
 * Stripe actually captured payment.
 */
export async function retrieveCheckoutSession(sessionId: string): Promise<RetrievedCheckoutSession> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    id: session.id,
    paid: session.payment_status === "paid",
    amountTotalCents: session.amount_total,
    currency: session.currency,
    metadata: session.metadata as Record<string, string> | null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
  };
}

/**
 * Verifies the `stripe-signature` header against the raw request body via
 * Stripe's own SDK helper (constructEvent), the equivalent of Paystack's
 * HMAC check in paystack/client.ts. Must run against the raw body — same
 * reason as Paystack: re-serializing parsed JSON can change the byte
 * sequence and fail verification.
 */
export function constructWebhookEvent(rawBody: string, signatureHeader: string | null): Stripe.Event | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) return null;

  const stripe = getStripeClient();
  try {
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch {
    return null;
  }
}
