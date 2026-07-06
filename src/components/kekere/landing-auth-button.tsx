"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

const buttonClass =
  "rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(199,93,44,0.6)] transition-colors hover:bg-[var(--color-primary-light)]";

export function LandingAuthButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={async () => {
          // Belt and suspenders: next-auth's own signOut() flow (CSRF fetch,
          // then POST /api/auth/signout) hasn't reliably cleared the session
          // on every device, so it's backed up by a first-party cookie clear
          // (/api/auth/hard-signout) that bypasses that flow entirely. Every
          // step is best-effort — the reload always runs regardless of
          // whether either call succeeds, so a network hiccup never leaves
          // the button silently doing nothing.
          try {
            await signOut({ redirect: false });
          } catch {
            // fall through to the hard backstop below
          }
          try {
            await fetch("/api/auth/hard-signout", { method: "POST" });
          } catch {
            // worst case the cookie survives this click — reload still runs
          }
          window.location.reload();
        }}
        className={buttonClass}
      >
        Sign out
      </button>
    );
  }

  return (
    <Link href="/signup" className={buttonClass}>
      Sign up
    </Link>
  );
}
