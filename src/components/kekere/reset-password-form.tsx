"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[36px]">
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
          Invalid link
        </h1>
        <p className="mb-6 text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
          This password reset link is missing or malformed. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-[10px] bg-[var(--color-primary)] px-6 py-3.5 text-[15px] font-semibold text-white"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[36px]">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(31,138,91,0.12)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
          Password updated
        </h1>
        <p className="mb-8 text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
          Your password has been changed. You can now sign in with your new password.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-[10px] bg-[var(--color-primary)] px-4 py-4 text-base font-semibold text-white shadow-[0_12px_26px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)]"
        >
          Sign in
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    setDone(true);
  }

  return (
    <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[36px]">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
        Set a new password
      </h1>
      <p className="mb-8 text-[15px] leading-[1.65] text-[var(--color-ink-muted)]">
        Choose a strong password — at least 8 characters.
      </p>

      {error && (
        <p className="mb-5 rounded-lg bg-[rgba(193,58,58,0.08)] px-4 py-3 text-sm text-[#A13A3A]">
          {error}
          {(error.includes("expired") || error.includes("invalid")) && (
            <>
              {" "}
              <Link href="/forgot-password" className="underline font-medium">
                Request a new link
              </Link>
              .
            </>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <div>
          <label
            htmlFor="rp-password"
            className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="rp-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-4 py-[14px] pr-[46px] text-[15px] text-[var(--color-ink)] placeholder:text-[#A89684] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A08C7C] transition-colors hover:text-[var(--color-ink)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="rp-confirm"
            className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
          >
            Confirm new password
          </label>
          <input
            id="rp-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-4 py-[14px] text-[15px] text-[var(--color-ink)] placeholder:text-[#A89684] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-[6px] w-full cursor-pointer rounded-[10px] border-none bg-[var(--color-primary)] px-4 py-4 text-center text-base font-semibold text-white shadow-[0_12px_26px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
