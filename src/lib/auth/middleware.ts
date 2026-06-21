import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { type Role, hasRole } from "@/lib/auth/roles";

/** Reads the session in a route handler / server component. Returns null if unauthenticated. */
export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Wraps a route handler so it 401s when unauthenticated and 403s when the
 * session doesn't have one of the required roles.
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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (options?.roles && !hasRole(session, ...options.roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(request, session, ...rest);
  };
}
