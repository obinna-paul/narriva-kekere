import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { authOptions, extractImpersonation } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { type Role } from "@/lib/auth/roles";

/** Reads the session in a route handler / server component. Returns null if unauthenticated. */
export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Wraps a route handler so it 401s when unauthenticated and 403s when the
 * caller doesn't have one of the required roles.
 *
 * Supports impersonation: if an impersonation_token cookie is present and
 * valid, the session user is replaced with the impersonated user.
 *
 * Role check is DB-fresh, not session.user.role from the JWT. The JWT's role
 * is baked in at sign-in and never refreshed (session strategy is "jwt" and
 * nothing in this app triggers a NextAuth session update), so a role revoked
 * via the admin dashboard wouldn't otherwise take effect on the API surface
 * until that browser's token happens to be reissued — the exact gap
 * src/app/admin/layout.tsx already closes for page navigation. This mirrors
 * that check here for API routes.
 *
 * The lookup is keyed on the ACTUAL logged-in user, not the impersonated
 * one: impersonation swaps session.user.id to the target reader's id while
 * deliberately leaving role untouched, because ADMIN-gated routes (e.g.
 * ending the impersonation session itself) are meant to keep working while
 * impersonating. Checking `actualAdminId` — falling back to `id` when not
 * impersonating — preserves that, while still closing the stale-role gap:
 * a demoted admin's impersonation session now correctly loses ADMIN access
 * too, since it's their own fresh role being checked either way.
 *
 * Usage: export const POST = withAuth(async (req, session) => { ... })
 */
export function withAuth<T extends unknown[]>(
  handler: (
    request: Request,
    session: Session,
    ...rest: T
  ) => Promise<Response>,
  options?: { roles?: Role[] },
) {
  return async (request: Request, ...rest: T): Promise<Response> => {
    const session = await getCurrentSession();

    const impersonation = extractImpersonation(request);
    if (impersonation && session?.user) {
      session.user = {
        ...session.user,
        id: impersonation.id,
        isImpersonated: true,
        actualAdminId: impersonation.actualAdminId,
      };
    }

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (options?.roles) {
      const roleCheckUserId = session.user.actualAdminId ?? session.user.id;
      const current = await prisma.user.findUnique({
        where: { id: roleCheckUserId },
        select: { role: true },
      });

      if (!current || !options.roles.includes(current.role as Role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return handler(request, session, ...rest);
  };
}
