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
  onClose: () => void;
  onSuccess: () => void;
}

const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// How many times to retry confirming a payment before giving up and
// reassuring the reader instead of alarming them. Once checkout() has
// resolved, Paystack has already taken the money — from here on, a failure
// is ours to recover from (a dropped connection, our server's own call out
// to Paystack timing out), not a sign the reader lost anything. A short
// retry absorbs most of those transient blips silently; the eventual
// webhook + nightly reconciliation sweep are the backstop for the rest.
const VERIFY_MAX_ATTEMPTS = 3;
const VERIFY_RETRY_DELAY_MS = 2500;

const SUPPORT_REASSURANCE =
  "We couldn't confirm your payment right away — but if you were charged, your cowries are on the way. They usually land within seconds, and almost always within a few minutes. If yours still haven't shown up after that, email us at support@narriva.pro or kekerestories@gmail.com, or message us on Instagram @kekere.stories, and we'll sort it out immediately.";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TopUpModal({ userId, userEmail, onClose, onSuccess }: TopUpModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkout } = usePaystackCheckout();

  async function handlePay() {
    if (selected === null) return;
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete the verification check.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { COWRIE_TOPUP_PACKAGES } = await import("@/content/decisions");
    const pkg = COWRIE_TOPUP_PACKAGES[selected];

    let reference: string;
    try {
      reference = await checkout({
        email: userEmail,
        amountNgn: pkg.priceNGN,
        metadata: { type: "wallet_topup", packageIndex: selected, userId },
      });
    } catch (err) {
      // Checkout itself never completed — the reader closed the popup or it
      // failed to load, so nothing was charged. No reassurance needed here.
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
      return;
    }

    for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, type: "wallet_topup", packageIndex: selected, turnstileToken }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not confirm payment");
        }

        setSubmitting(false);
        onSuccess();
        return;
      } catch {
        if (attempt === VERIFY_MAX_ATTEMPTS) {
          setSubmitting(false);
          setError(SUPPORT_REASSURANCE);
          return;
        }
        await wait(attempt * VERIFY_RETRY_DELAY_MS);
      }
    }
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
          <TopUpSelector selected={selected} onSelect={setSelected} />
        </div>

        {turnstileEnabled && (
          <div className="mt-4">
            <TurnstileWidget onVerify={setTurnstileToken} />
          </div>
        )}

        {error && (
          <p
            className={
              error === SUPPORT_REASSURANCE
                ? "mt-3 text-sm leading-[1.5] text-[var(--color-ink-muted)]"
                : "mt-3 text-sm text-red-600"
            }
          >
            {error}
          </p>
        )}

        <Button
          type="button"
          className="mt-5 w-full"
          disabled={selected === null || submitting}
          onClick={handlePay}
        >
          {submitting ? "Processing…" : "Pay now"}
        </Button>

        {!error && (
          <p className="mt-3 text-center text-[11.5px] leading-[1.5] text-[var(--color-ink-muted)]">
            Cowries usually land in your wallet within seconds of payment. If yours ever doesn&rsquo;t, don&rsquo;t worry — email support@narriva.pro and we&rsquo;ll sort it out right away.
          </p>
        )}
      </div>
    </div>
  );
}
