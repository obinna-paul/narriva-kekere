"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[36px]">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(31,138,91,0.12)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
          Check your email
        </h1>
        <p className="mb-8 text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
          If an account exists for <span className="font-medium text-[var(--color-ink)]">{email}</span>, we&apos;ve sent a password reset link. It expires in 60 minutes.
        </p>
        <p className="text-[13.5px] text-[var(--color-ink-muted-2)]">
          Didn&apos;t receive it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-medium text-[var(--color-primary)]"
          >
            try again
          </button>
          .
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="text-[13.5px] font-medium text-[var(--color-ink-muted)]"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[36px]">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
        Forgot your password?
      </h1>
      <p className="mb-8 text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
        No problem. Enter your email address and we&apos;ll send you a link to set a new password.
      </p>

      {error && (
        <p className="mb-5 rounded-lg bg-[rgba(193,58,58,0.08)] px-4 py-3 text-sm text-[#A13A3A]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <div>
          <label
            htmlFor="fp-email"
            className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
          >
            Email address
          </label>
          <input
            id="fp-email"
            type="email"
            required
            autoFocus
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-4 py-[14px] text-[15px] text-[var(--color-ink)] placeholder:text-[#A89684] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-[6px] w-full cursor-pointer rounded-[10px] border-none bg-[var(--color-primary)] px-4 py-4 text-center text-base font-semibold text-white shadow-[0_12px_26px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-[13.5px] font-medium text-[var(--color-ink-muted)]"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
