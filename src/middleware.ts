import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Minimal Phase 1 stub, NOT deferred work — it's required even for local dev.
 *
 * (narriva) and (kekere) are both route groups, so they're transparent to the
 * URL: without this rewrite, both would resolve "/" and the build would fail
 * with a route collision. This middleware gives Kekere requests a real internal
 * path ("/kekere") while keeping the public-facing URL clean ("/").
 *
 * Local dev: add `127.0.0.1 kekere.localhost` to your hosts file, then visit
 * http://kekere.localhost:3000. Anything else is treated as Narriva.
 *
 * Production hardening (real subdomain allow-list, www/apex handling, preview
 * deployments, etc.) is deferred to the deployment phase — see README.md.
 */
// Personal pages — need a real logged-in identity to mean anything, not
// just the unlock action itself (the literal ask was "the unlock flow must
// be authenticated," but a logged-out visitor looking at someone's wallet
// or library page makes no sense either, so these are gated the same way).
const KEKERE_PROTECTED_PREFIXES = ["/kekere/feed", "/kekere/wallet", "/kekere/library", "/kekere/profile", "/kekere/write", "/kekere/notes", "/kekere/settings"];

// Narriva's equivalents: the ebook reader and purchased-book library need a
// real identity (purchases and reading progress are per-user).
const NARRIVA_PROTECTED_PREFIXES = ["/read", "/account"];

// /kekere/manifest.webmanifest and /kekere/sw.js (public/kekere/*) must stay
// unauthenticated — a service worker registration or manifest fetch getting
// redirected to /login would break installability. Neither is in any
// protected-prefix list above, so both already pass through untouched.

// A plain `pathname.startsWith(prefix)` matches on raw characters, not path
// segments — "/kekere/write" would also match "/kekere/writer/abc123",
// silently gating an unrelated public route. Require the prefix to either be
// the whole path or be followed by a "/".
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  const isKekere = hostname.startsWith("kekere.");
  const needsRewrite = isKekere && !pathname.startsWith("/kekere");
  // The path auth/route-protection checks below must run against, since a
  // request to the Kekere subdomain's "/wallet" is really "/kekere/wallet"
  // once rewritten — checking the pre-rewrite `pathname` would silently skip
  // protection for every subdomain request (the rewrite used to return
  // early before this check ever ran).
  const effectivePathname = needsRewrite ? `/kekere${pathname}` : pathname;

  // Route protection for the admin dashboard, Author Portal, and Kekere's
  // personal pages. Middleware runs on the edge, so it reads the JWT
  // directly via next-auth/jwt rather than going through getServerSession
  // (which needs a full request context and Prisma access) — see
  // src/lib/auth/middleware.ts for the route-handler equivalent used inside
  // API routes and Server Components.
  const isProtected =
    matchesPrefix(effectivePathname, "/admin") ||
    matchesPrefix(effectivePathname, "/portal") ||
    KEKERE_PROTECTED_PREFIXES.some((prefix) => matchesPrefix(effectivePathname, prefix)) ||
    NARRIVA_PROTECTED_PREFIXES.some((prefix) => matchesPrefix(effectivePathname, prefix));

  if (isProtected) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // No ADMIN-role check here on purpose. token.role is baked into the JWT
    // at sign-in and never refreshed — session strategy is "jwt", and
    // nothing in this app ever calls a NextAuth session-update trigger — so
    // a role granted (or revoked) via the admin dashboard would silently
    // not take effect here until that browser's session token happens to be
    // reissued. That's exactly the bug this comment replaces: an admin
    // promotes someone, that person is still logged in with their old
    // session, and gets bounced right back out. The authoritative,
    // DB-fresh ADMIN check now lives in src/app/admin/layout.tsx instead —
    // a Server Component, so it can hit Postgres directly on every /admin
    // navigation (this file runs on the edge runtime, which can decode the
    // JWT cheaply but can't reach Prisma). This still blocks a logged-out
    // visitor immediately above; a logged-in non-admin just takes one extra
    // hop through the layout's check instead of being turned away here.
  }

  if (needsRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = effectivePathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
