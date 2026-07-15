"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface ClaimData {
  writerName: string;
  storyTitle: string | null;
  contractBody: string | null;
  valid: boolean;
  expired: boolean;
  declined?: boolean;
  error?: string;
}

export default function ClaimPageClient() {
  const params = useParams();
  const token = (params?.token as string) ?? "";

  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [signedName, setSignedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [justDeclined, setJustDeclined] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`/api/auth/claim-account?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d?.writerName) setName(d.writerName);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDecline = useCallback(async () => {
    if (!window.confirm("Decline this publishing offer? You can always reach out to submission@narriva.pro later if you change your mind.")) {
      return;
    }

    setDeclining(true);
    setDeclineError(null);

    try {
      const res = await fetch("/api/auth/claim-account/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();

      if (!res.ok) {
        setDeclineError(result.error ?? "Something went wrong");
        setDeclining(false);
        return;
      }

      setJustDeclined(true);
    } catch {
      setDeclineError("Network error. Please try again.");
      setDeclining(false);
    }
  }, [token]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password || !signedName) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/auth/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password, signedName }),
      });

      const result = await res.json();

      if (!res.ok) {
        setSubmitError(result.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }

      setSuccess(true);

      await signIn("credentials", {
        email: result.writerEmail,
        password,
        redirect: false,
      });

      if (result.storyId) {
        window.location.href = `/kekere/story/${result.storyId}`;
      } else {
        window.location.href = "/kekere";
      }
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }, [token, name, password, signedName]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EBDD]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#C75D2C] border-t-transparent" />
          <p className="text-[14px] text-[rgba(42,26,18,.55)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EBDD] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-3 text-[22px] font-bold text-[#2A1A12] font-[family-name:var(--font-display)]">
            {data?.expired ? "Link expired" : "Link not found"}
          </h1>
          <p className="mb-5 text-[14px] text-[rgba(42,26,18,.6)]">
            {data?.expired
              ? "This claim link has expired. Please contact the Kekere team for a new one."
              : "This claim link is invalid or has already been used."}
          </p>
          <Link
            href="/kekere"
            className="inline-block rounded-[10px] bg-[#C75D2C] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#B0531E]"
          >
            Go to Kekere Stories
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EBDD] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-3 text-[22px] font-bold text-[#2A1A12] font-[family-name:var(--font-display)]">
            All done!
          </h1>
          <p className="mb-5 text-[14px] text-[rgba(42,26,18,.6)]">
            Your story is now live on Kekere Stories. Redirecting you...
          </p>
        </div>
      </div>
    );
  }

  if (justDeclined || data.declined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EBDD] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-3 text-[22px] font-bold text-[#2A1A12] font-[family-name:var(--font-display)]">
            Offer declined
          </h1>
          <p className="mb-5 text-[14px] text-[rgba(42,26,18,.6)]">
            No hard feelings — you&apos;ve declined this publishing offer. If you change your mind,
            just reach out to <strong className="text-[#2A1A12]">submission@narriva.pro</strong>.
          </p>
          <Link
            href="/kekere"
            className="inline-block rounded-[10px] bg-[#C75D2C] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#B0531E]"
          >
            Go to Kekere Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5EBDD] px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-[16px] border border-[rgba(42,26,18,.10)] bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-[20px] font-bold text-[#2A1A12] font-[family-name:var(--font-display)]">
            Claim your account
          </h1>
          <p className="mb-6 text-[14px] text-[rgba(42,26,18,.55)]">
            Hi <strong className="text-[#2A1A12]">{data.writerName}</strong>,
            {data.storyTitle ? (
              <> your story <strong className="text-[#2A1A12]">&ldquo;{data.storyTitle}&rdquo;</strong> has been accepted for publishing.</>
            ) : (
              " your account is ready."
            )}
          </p>

          {data.contractBody && (
            <div className="mb-6 max-h-[300px] overflow-y-auto rounded-[10px] border border-[rgba(42,26,18,.10)] bg-[rgba(42,26,18,.02)] p-4">
              <h2 className="mb-2 text-[13px] font-semibold tracking-[0.04em] text-[rgba(42,26,18,.45)] uppercase">
                Publishing agreement
              </h2>
              <pre className="whitespace-pre-wrap text-[12px] leading-[1.7] text-[rgba(42,26,18,.7)] font-sans">
                {data.contractBody}
              </pre>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold tracking-[0.04em] text-[rgba(42,26,18,.5)] uppercase">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                required
                className="w-full rounded-[10px] border border-[rgba(42,26,18,.14)] bg-white px-4 py-3 text-[14px] text-[#2A1A12] placeholder:text-[rgba(42,26,18,.3)] focus:border-[#C75D2C] focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-[rgba(42,26,18,.4)]">
                This is how readers will see you across Kekere Stories.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold tracking-[0.04em] text-[rgba(42,26,18,.5)] uppercase">
                Set a password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="w-full rounded-[10px] border border-[rgba(42,26,18,.14)] bg-white px-4 py-3 text-[14px] text-[#2A1A12] placeholder:text-[rgba(42,26,18,.3)] focus:border-[#C75D2C] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold tracking-[0.04em] text-[rgba(42,26,18,.5)] uppercase">
                Full legal name (to sign the agreement)
              </label>
              <input
                type="text"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Your full legal name"
                required
                className="w-full rounded-[10px] border border-[rgba(42,26,18,.14)] bg-white px-4 py-3 text-[14px] text-[#2A1A12] placeholder:text-[rgba(42,26,18,.3)] focus:border-[#C75D2C] focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-[rgba(42,26,18,.4)]">
                By typing your name and clicking below, you agree to the publishing terms above.
                Your story goes live immediately.
              </p>
            </div>

            {submitError && (
              <div className="rounded-[8px] bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={!name || !password || !signedName || submitting}
              className="w-full rounded-[10px] bg-[#C75D2C] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#B0531E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Signing..." : "Sign agreement & go live"}
            </button>

            {declineError && (
              <div className="rounded-[8px] bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {declineError}
              </div>
            )}

            <button
              type="button"
              onClick={handleDecline}
              disabled={declining || submitting}
              className="block w-full text-center text-[12px] font-medium text-[rgba(42,26,18,.45)] underline decoration-[rgba(42,26,18,.25)] underline-offset-2 hover:text-[rgba(42,26,18,.7)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {declining ? "Declining..." : "Decline publishing offer"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
