"use client";

import { signOut } from "next-auth/react";

// Bounds each step below so a request that's blocked or silently stalled
// (a browser extension swallowing it, a flaky connection) can't hang the
// whole sign-out forever — the button must never look like it did nothing.
function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return Promise.race([
    promise.then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

/**
 * next-auth's own signOut() flow (CSRF fetch, then POST /api/auth/signout)
 * hasn't reliably cleared the session cookie on every device/browser, so
 * it's backed up by a first-party cookie clear (/api/auth/hard-signout)
 * that bypasses that flow entirely. Every step is best-effort and
 * time-boxed — the redirect always runs regardless of whether either call
 * succeeds or even finishes, so a network hiccup (or something silently
 * blocking these specific requests) never leaves someone stuck still
 * signed in.
 */
export async function hardSignOut(redirectTo: string) {
  await withTimeout(signOut({ redirect: false }), 2500);
  await withTimeout(fetch("/api/auth/hard-signout", { method: "POST" }), 2500);
  window.location.href = redirectTo;
}
