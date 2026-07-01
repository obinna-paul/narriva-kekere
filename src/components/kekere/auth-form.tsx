"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TurnstileWidget } from "@/components/shared/turnstile-widget";
import { TermsModal } from "@/components/shared/terms-modal";
import type { ReactNode } from "react";

type Mode = "signin" | "signup";
type Brand = "kekere" | "narriva";

export function KekereAuthForm({ brand = "kekere", termsContent }: { brand?: Brand; termsContent?: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? (brand === "narriva" ? "/" : "/kekere/feed");
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const isNarriva = brand === "narriva";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setSuccess(null);
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Incorrect email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!termsAccepted) {
      setError("You must accept the Terms of Use to create an account.");
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification check.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        termsAccepted,
        referralCode: referralCode.trim() || undefined,
        turnstileToken: turnstileToken || "dev-bypass",
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    try { localStorage.setItem("kekere_welcome_new_user", "1"); } catch {}
    setSuccess("Account created! Sign in below.");
    switchMode("signin");
    setPassword("");
  }

  const brandName = isNarriva ? "Narriva" : "Kekere";
  const ctaText = isNarriva ? "Get started" : "Start Reading";

  return (
    <div className="mx-auto max-w-[420px] px-[22px] pb-[60px] pt-[30px]">
      <div className="mb-[30px] flex rounded-[30px] bg-[rgba(42,26,18,0.06)] p-1">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={cn(
            "flex-1 cursor-pointer rounded-[30px] border-none py-[11px] text-sm font-semibold transition-colors",
            mode === "signin"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-transparent text-[var(--color-ink-muted-2)]"
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={cn(
            "flex-1 cursor-pointer rounded-[30px] border-none py-[11px] text-sm font-semibold transition-colors",
            mode === "signup"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-transparent text-[var(--color-ink-muted-2)]"
          )}
        >
          Create account
        </button>
      </div>

      <h1 className="mb-6 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[var(--color-ink)]">
        {mode === "signin" ? "Welcome back" : `Join ${brandName}`}
      </h1>

      {success && (
        <p className="mb-4 rounded-lg bg-[rgba(31,111,74,0.1)] px-4 py-3 text-sm text-[var(--color-success)]">
          {success}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-[rgba(193,58,58,0.08)] px-4 py-3 text-sm text-[#A13A3A]">
          {error}
        </p>
      )}

      <form
        onSubmit={mode === "signin" ? handleSignin : handleSignup}
        className="flex flex-col gap-[18px]"
      >
        {mode === "signup" && (
          <>
          <div>
            <label
              htmlFor="auth-name"
              className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
            >
              Name
            </label>
            <input
              id="auth-name"
              type="text"
              required
              placeholder="What should we call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-4 py-[14px] text-[15px] text-[var(--color-ink)] placeholder:text-[#A89684] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          {!isNarriva && (
            <div>
              <label
                htmlFor="auth-referral"
                className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
              >
                Referral code <span className="text-[#A08C7C] font-normal">(optional)</span>
              </label>
              <input
                id="auth-referral"
                type="text"
                placeholder="Got a code from a friend?"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-4 py-[14px] text-[15px] text-[var(--color-ink)] placeholder:text-[#A89684] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
                style={{ fontFamily: "var(--font-body)" }}
              />
            </div>
          )}
          </>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
          >
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] border border-[rgba(42,26,18,0.16)] bg-white px-4 py-[14px] text-[15px] text-[var(--color-ink)] placeholder:text-[#A89684] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(199,93,44,0.12)]"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-[7px] block text-[13.5px] font-medium text-[#4A372C]"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
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
          {mode === "signin" && (
            <div className="mt-2 text-right">
              <span className="text-[13px] font-medium text-[var(--color-primary)]">
                Forgot password?
              </span>
            </div>
          )}
        </div>

        {mode === "signup" && (
          <label className="flex cursor-pointer items-center gap-[10px] text-sm font-normal text-[#4A372C]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-[17px] w-[17px] flex-none"
              style={{ accentColor: "var(--color-primary)" }}
            />
            I agree to the{" "}
            <TermsModal>
              {termsContent}
            </TermsModal>
          </label>
        )}

        {mode === "signup" && <TurnstileWidget onVerify={setTurnstileToken} />}

        <button
          type="submit"
          disabled={submitting}
          className="mt-[6px] w-full cursor-pointer rounded-[10px] border-none bg-[var(--color-primary)] px-4 py-4 text-center text-base font-semibold text-white shadow-[0_12px_26px_-10px_rgba(199,93,44,0.55)] transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-60"
        >
          {submitting
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : ctaText}
        </button>
      </form>

      <p className="mt-[22px] text-center text-[12.5px] leading-[1.5] text-[var(--color-ink-muted-2)]">
        By continuing, you agree to {brandName}&apos;s{" "}
        <span className="text-[var(--color-ink-muted)] underline">Terms of Use</span>{" "}
        and{" "}
        <span className="text-[var(--color-ink-muted)] underline">Privacy Policy</span>
        .
      </p>
    </div>
  );
}
