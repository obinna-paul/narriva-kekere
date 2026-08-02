export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { getSetting } from "@/lib/settings/get";
import { verifyTransaction } from "@/lib/paystack/client";
import { creditTopUp } from "@/lib/economy/cowries";
import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { triggerReferralRewardOnFirstTopUp } from "@/lib/data/kekere-referrals";
import { sendFirstTopUpThankYouEmail } from "@/lib/data/kekere-wallet";
import { logAdminAction } from "@/lib/admin/logAction";

const SUPER_ADMIN_DEFAULT = "ezeodilipaul@gmail.com";

const schema = z.object({
  reference: z.string().trim().min(1, "A Paystack reference is required."),
  // Optional safety net: if given, the reference's buyer must match this
  // address, so a mistyped or wrong reference can't credit the wrong account.
  expectedEmail: z.string().trim().email().optional(),
});

/**
 * Reconciles a wallet top-up that Paystack settled but the wallet never got
 * credited for. The usual cause is a buyer whose connection dropped right
 * after paying — so the client-side /api/paystack/verify never ran — on a
 * deploy where the webhook didn't land the credit either.
 *
 * Safety comes from re-verifying the reference straight against Paystack: it
 * can only ever credit a charge Paystack actually reports as `success`, for
 * the exact amount settled, matched to the account carried in the charge's
 * own metadata. Crediting goes through the same idempotent creditTopUp()
 * keyed on the reference, so running this twice — or after the webhook
 * belatedly fires — never double-credits. It's the manual twin of the webhook
 * safety net, for the cases the safety net missed.
 */
export const POST = withAuth(
  async (request, session) => {
    // Money movement is gated to the super admin, same as manual cowrie
    // adjustments — the Paystack re-verify makes it safe, but crediting real
    // balances still shouldn't be a whole-team capability.
    const superAdminEmail = await getSetting("super_admin_email", SUPER_ADMIN_DEFAULT);
    if (session.user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { reference, expectedEmail } = parsed.data;

    let verification;
    try {
      verification = await verifyTransaction(reference);
    } catch {
      return NextResponse.json({ error: "Couldn't reach Paystack to verify this reference. Try again in a moment." }, { status: 502 });
    }

    if (verification.status !== "success") {
      return NextResponse.json({ error: `Paystack reports this charge as "${verification.status}", not a completed payment. Nothing was credited.` }, { status: 402 });
    }

    const metadata = (verification.metadata ?? {}) as { type?: string; userId?: string };
    if (metadata.type !== "wallet_topup") {
      return NextResponse.json({ error: `This reference is a "${metadata.type ?? "non-top-up"}" charge, not a wallet top-up.` }, { status: 400 });
    }
    if (!metadata.userId) {
      return NextResponse.json({ error: "This top-up carries no account id, so it can't be matched automatically. Credit the account by hand instead." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: metadata.userId }, select: { id: true, email: true, name: true } });
    if (!target) {
      return NextResponse.json({ error: "The account this payment belongs to no longer exists." }, { status: 404 });
    }
    if (expectedEmail && target.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      return NextResponse.json({ error: `This reference belongs to ${target.email}, not ${expectedEmail}. Double-check you copied the right reference.` }, { status: 409 });
    }

    // Matched against the amount Paystack actually settled, never a
    // client-supplied package index — see /api/webhooks/paystack for the rule.
    const paidNGN = verification.amount / 100;
    const pkg = COWRIE_TOPUP_PACKAGES.find((p) => p.priceNGN === paidNGN);
    if (!pkg) {
      return NextResponse.json({ error: `The paid amount (₦${paidNGN}) doesn't match any current top-up package, so the cowrie count is ambiguous. Credit the account by hand instead.` }, { status: 400 });
    }
    const cowriesTotal = pkg.cowries + pkg.bonusCowries;

    const result = await creditTopUp(target.id, cowriesTotal, reference);
    const alreadyCredited = "already_processed" in result;

    // Same post-top-up hooks the webhook/verify run — awaited + idempotent, so
    // a reconciled top-up still pays a first-top-up referral reward and sends
    // the thank-you if those were missed too.
    await triggerReferralRewardOnFirstTopUp(target.id, paidNGN).catch(() => {});
    await sendFirstTopUpThankYouEmail(target.id).catch(() => {});

    await logAdminAction(session.user.id, target.id, "RECONCILE_TOPUP", {
      reference,
      paidNGN,
      cowriesTotal,
      alreadyCredited,
    });

    return NextResponse.json({
      success: true,
      alreadyCredited,
      user: { email: target.email, name: target.name },
      paidNGN,
      cowriesCredited: cowriesTotal,
      newBalance: "success" in result ? result.newBalance : undefined,
    });
  },
  { roles: ["ADMIN"] },
);
