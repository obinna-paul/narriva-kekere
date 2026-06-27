"use client";

import { useCallback, useRef } from "react";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackSetupOptions) => { openIframe: () => void };
    };
  }
}

interface PaystackSetupOptions {
  key: string;
  email: string;
  amount: number; // kobo
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  onClose: () => void;
  callback: (response: { reference: string }) => void;
}

const INLINE_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";

function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();

  const existing = document.querySelector(`script[src="${INLINE_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve()));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = INLINE_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack"));
    document.body.appendChild(script);
  });
}

export interface PaystackCheckoutParams {
  email: string;
  amountNgn: number;
  metadata: Record<string, unknown>;
}

/**
 * Drives Paystack's Inline JS popup — the same hook backs both Narriva book
 * checkout and Kekere wallet top-ups, since the popup mechanics are
 * identical; only the amount/metadata differ per brand. Returns a promise
 * that resolves with the transaction reference once Paystack reports
 * success — callers still need to hit a server endpoint to verify it before
 * trusting it (see /api/paystack/verify, /api/books/[id]/purchase).
 */
export function usePaystackCheckout() {
  const pendingRef = useRef<{ resolve: (ref: string) => void; reject: (err: Error) => void } | null>(null);

  const checkout = useCallback(async ({ email, amountNgn, metadata }: PaystackCheckoutParams): Promise<string> => {
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("Paystack is not configured (missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY)");
    }

    await loadPaystackScript();
    if (!window.PaystackPop) {
      throw new Error("Paystack failed to load");
    }

    return new Promise<string>((resolve, reject) => {
      pendingRef.current = { resolve, reject };

      window.PaystackPop!.setup({
        key: publicKey,
        email,
        amount: Math.round(amountNgn * 100),
        currency: "NGN",
        metadata,
        callback: (response) => {
          pendingRef.current?.resolve(response.reference);
          pendingRef.current = null;
        },
        onClose: () => {
          if (pendingRef.current) {
            pendingRef.current.reject(new Error("Checkout closed before completing payment"));
            pendingRef.current = null;
          }
        },
      }).openIframe();
    });
  }, []);

  return { checkout };
}
