"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TopUpSelector } from "@/components/kekere/top-up-selector";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/shared/turnstile-widget";
import { usePaystackCheckout } from "@/lib/paystack/use-paystack-checkout";

export interface TopUpModalProps {
  userId: string;
  userEmail: string;
  /** Which checkout to run — decided server-side by the buyer's country, see
   *  getPaymentProviderFromHeaders in wallet/page.tsx. */
  provider: "paystack" | "stripe";
  onClose: () => void;
  onSuccess: () => void;
}

const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TopUpModal({ userId, userEmail, provider, onClose, onSuccess }: TopUpModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkout } = usePaystackCheckout();

  async function handlePayPaystack() {
    const { COWRIE_TOPUP_PACKAGES } = await import("@/content/decisions");
    const pkg = COWRIE_TOPUP_PACKAGES[selected!];

    const reference = await checkout({
      email: userEmail,
      amountNgn: pkg.priceNGN,
      metadata: { type: "wallet_topup", packageIndex: selected, userId },
    });

    const res = await fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, type: "wallet_topup", packageIndex: selected, turnstileToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not confirm payment");
    }

    onSuccess();
  }

  // Stripe Checkout is a full-page redirect — there's no "success" to react
  // to here, the browser just leaves. Confirmation happens back on the
  // wallet page once Stripe sends the buyer to successUrl (see
  // wallet-view.tsx's stripe_session_id handling).
  async function handlePayStripe() {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageIndex: selected, turnstileToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not start checkout");
    }

    const { url } = await res.json();
    window.location.href = url;
  }

  async function handlePay() {
    if (selected === null) return;
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete the verification check.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      if (provider === "stripe") {
        await handlePayStripe();
      } else {
        await handlePayPaystack();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
    // No `finally` — on the Stripe path a successful call navigates the
    // browser away, so there's nothing left here to reset submitting for.
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-fade-in-up rounded-t-3xl bg-[var(--color-surface)] p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Top up cowries</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-ink)]/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <TopUpSelector selected={selected} onSelect={setSelected} provider={provider} />
        </div>

        {turnstileEnabled && (
          <div className="mt-4">
            <TurnstileWidget onVerify={setTurnstileToken} />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <Button
          type="button"
          className="mt-5 w-full"
          disabled={selected === null || submitting}
          onClick={handlePay}
        >
          {submitting ? "Processing…" : provider === "stripe" ? "Pay with card" : "Pay with Paystack"}
        </Button>
      </div>
    </div>
  );
}
