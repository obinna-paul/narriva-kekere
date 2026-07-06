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
          // This button lives on /kekere and would otherwise redirect back to
          // /kekere — the exact same URL. Assigning window.location.href to
          // an unchanged URL doesn't reliably force a fresh navigation in
          // every browser, so the page can appear to stay "signed in" even
          // though the session cookie was actually cleared. Forcing a real
          // reload sidesteps that.
          await signOut({ redirect: false });
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
