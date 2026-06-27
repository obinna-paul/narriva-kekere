"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { usePaystackCheckout } from "@/lib/paystack/use-paystack-checkout";

export interface BuyBookButtonProps {
  bookId: string;
  bookSlug: string;
  priceNgn: number;
  userId: string | null;
  userEmail: string | null;
  purchased: boolean;
  hasProgress: boolean;
  /** Overrides the idle (logged-in, not-yet-purchased) button label —
   * e.g. the excerpt section's "Buy to continue reading — ₦X" instead of
   * the price card's plain "Buy & Read". Defaults to "Buy & Read". */
  label?: string;
  className?: string;
}

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function BuyBookButton({
  bookId,
  bookSlug,
  priceNgn,
  userId,
  userEmail,
  purchased,
  hasProgress,
  label,
  className,
}: BuyBookButtonProps) {
  const router = useRouter();
  const { checkout } = usePaystackCheckout();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (purchased) {
    return (
      <Link
        href={`/read/${bookId}`}
        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto", className)}
      >
        {hasProgress ? "Continue reading" : "Start reading"}
      </Link>
    );
  }

  if (!userId || !userEmail) {
    return (
      <Link
        href={`/login?callbackUrl=/books/${bookSlug}`}
        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto", className)}
      >
        Log in to buy & read — {priceFormatter.format(priceNgn)}
      </Link>
    );
  }

  async function handleBuy() {
    setSubmitting(true);
    setError(null);

    try {
      const reference = await checkout({
        email: userEmail!,
        amountNgn: priceNgn,
        metadata: { type: "book_purchase", bookId, userId },
      });

      const res = await fetch(`/api/books/${bookId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not confirm payment");
      }

      router.push(`/read/${bookId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleBuy}
        disabled={submitting}
        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto", className)}
      >
        {submitting ? "Processing…" : label ?? "Buy & Read"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
