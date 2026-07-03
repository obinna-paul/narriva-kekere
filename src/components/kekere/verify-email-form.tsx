"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push("/login?verified=1");
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);

    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((v) => {
          if (v <= 1) { clearInterval(interval); return 0; }
          return v - 1;
        });
      }, 1000);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not resend code.");
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[36px]">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
        Check your email
      </h1>
      <p className="mb-8 text-[15px] leading-[1.6] text-[var(--color-ink-muted)]">
        We sent a 6-digit code to <span className="font-medium text-[var(--color-ink)]">{email || "your email"}</span>. Enter it below to verify your account.
      </p>

      {error && (
        <p className="mb-5 rounded-lg bg-[rgba(193,58,58,0.08)] px-4 py-3 text-sm text-[#A13A3A]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-[60px] w-full rounded-[12px] border border-[rgba(42,26,18,0.16)] bg-white text-center text-[24px] font-semibold text-[var(--color-ink)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full cursor-pointer rounded-[10px] border-none bg-[var(--color-primary)] px-4 py-4 text-center text-base font-semibold text-white shadow-[0_12px_26px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-[var(--color-ink-muted)]">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="font-medium text-[var(--color-primary)] disabled:opacity-50"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </p>
    </div>
  );
}
