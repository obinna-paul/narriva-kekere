"use client";

import { signOut } from "next-auth/react";

/**
 * next-auth's own signOut() flow (CSRF fetch, then POST /api/auth/signout)
 * hasn't reliably cleared the session cookie on every device/browser, so
 * it's backed up by a first-party cookie clear (/api/auth/hard-signout)
 * that bypasses that flow entirely. Every step is best-effort — the
 * redirect always runs regardless of whether either call succeeds, so a
 * network hiccup never leaves someone stuck still signed in.
 */
export async function hardSignOut(redirectTo: string) {
  try {
    await signOut({ redirect: false });
  } catch {
    // fall through to the hard backstop below
  }
  try {
    await fetch("/api/auth/hard-signout", { method: "POST" });
  } catch {
    // worst case the cookie survives this call — redirect still runs
  }
  window.location.href = redirectTo;
}
