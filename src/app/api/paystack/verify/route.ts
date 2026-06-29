import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { verifyTransaction } from "@/lib/paystack/client";
import { creditTopUp } from "@/lib/economy/cowries";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";

/**
 * Generic Paystack verify endpoint. Currently only handles wallet top-ups —
 * book purchases go through /api/books/[id]/purchase instead, which scopes
 * the verification to a specific bookId. Kept separate from the webhook
 * (src/app/api/webhooks/paystack) on purpose: this is the fast path the
 * client calls right after the checkout popup closes, the webhook is the
 * eventual-consistency safety net. Both call the same idempotent
 * creditTopUp(), so whichever fires first does the crediting.
 */
const verifySchema = z.object({
  reference: z.string().min(1),
  type: z.literal("wallet_topup"),
  packageIndex: z.number().int().min(0),
  turnstileToken: z.string().min(1),
});

export const POST = withAuth(async (request, session) => {
  const body = await request.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reference, turnstileToken } = parsed.data;

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstileToken(turnstileToken, remoteIp))) {
    return NextResponse.json({ error: "Verification failed — please try again" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyTransaction(reference);
  } catch {
    return NextResponse.json({ error: "Could not verify transaction" }, { status: 502 });
  }

  if (verification.status !== "success") {
    return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
  }

  // Matched against the amount Paystack actually settled, not the client's
  // packageIndex — see /api/webhooks/paystack for the same rule.
  const paidNGN = verification.amount / 100;
  const pkg = COWRIE_TOPUP_PACKAGES.find((p) => p.priceNGN === paidNGN);
  if (!pkg) {
    return NextResponse.json({ error: "Paid amount doesn't match any top-up package" }, { status: 400 });
  }

  const result = await creditTopUp(session.user.id, pkg.cowries + pkg.bonusCowries, reference);
  return NextResponse.json(result);
});
