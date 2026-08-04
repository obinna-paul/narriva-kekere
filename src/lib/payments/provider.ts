import { headers } from "next/headers";

export type PaymentProvider = "paystack" | "stripe";

/**
 * Picks which checkout to show a buyer: Paystack for Nigeria (NGN pricing,
 * the provider this app has always used), Stripe for everywhere else
 * (international cards, USD pricing). Vercel sets `x-vercel-ip-country` on
 * every request from its edge network — no separate geo-IP lookup needed.
 *
 * Defaults to Paystack when the country can't be determined (local dev, a
 * host that isn't Vercel, or the header missing for any other reason) —
 * that's the provider this app already used before Stripe existed, so an
 * undetectable location fails safe into unchanged behaviour rather than
 * routing someone to a payment method that might not even be configured yet.
 */
export function getPaymentProviderFromHeaders(): PaymentProvider {
  const country = headers().get("x-vercel-ip-country");
  if (!country || country === "NG") return "paystack";
  return "stripe";
}
