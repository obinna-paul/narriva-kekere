import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  const isKekere = hostname.startsWith("kekere.");

  if (isKekere && !pathname.startsWith("/kekere")) {
    const url = request.nextUrl.clone();
    url.pathname = `/kekere${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
