"use client";

import Link from "next/link";
import { hardSignOut } from "@/lib/auth/client-sign-out";

const buttonClass =
  "rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(199,93,44,0.6)] transition-colors hover:bg-[var(--color-primary-light)]";

export function LandingAuthButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={() => hardSignOut("/kekere")}
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
