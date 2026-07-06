export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const SESSION_COOKIE_NAMES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

/**
 * Backstop for the client-side next-auth signOut() flow — clears the
 * session cookie directly via a first-party Set-Cookie, the same way
 * /api/admin/impersonate/end already does for impersonation_token, instead
 * of relying on next-auth's own CSRF-fetch-then-clear dance. Added because
 * that client flow wasn't reliably clearing the session on some
 * devices/browsers.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
