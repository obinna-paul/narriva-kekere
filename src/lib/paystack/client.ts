import crypto from "crypto";

/**
 * Server-side Paystack integration via raw REST calls — both endpoints used
 * here (verify, webhook signature) are simple enough that pulling in the
 * `paystack` npm package would just add a dependency for two fetch() calls.
 * Checkout itself uses Paystack's Inline JS (see use-paystack-checkout.ts),
 * not a server-initiated redirect — keeps the buyer on the page and lets one
 * hook drive both Narriva book purchases and Kekere wallet top-ups.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackVerifyResult {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  metadata: Record<string, unknown> | null;
  customer: { email: string };
}

/**
 * Re-verifies a transaction reference directly against Paystack's API.
 * Never trust a client-side `callback`/`onSuccess` alone — that handler only
 * proves the popup closed, not that Paystack actually settled the charge.
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );

  if (!res.ok) {
    throw new Error(`Paystack verify failed with status ${res.status}`);
  }

  const body = await res.json();
  return body.data as PaystackVerifyResult;
}

/**
 * Validates the `x-paystack-signature` header Paystack sends on every
 * webhook delivery: HMAC-SHA512 of the raw request body, keyed with the
 * secret key. Must run against the raw (unparsed) body — re-serializing
 * parsed JSON can produce a different byte sequence and fail verification.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signatureHeader) return false;

  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
